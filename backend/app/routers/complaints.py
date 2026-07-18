import uuid
from pathlib import Path
from typing import Optional

from fastapi import APIRouter, Depends, File, Form, HTTPException, UploadFile

from ..models.complaint import Complaint, Location
from ..services import dedupe, rewards, store
from ..services.ai_engine import analyze_complaint
from ..services.priority import RESOLVED_STATUSES, compute_priority
from .auth import current_user

router = APIRouter(prefix="/api/complaints", tags=["complaints"])

UPLOADS_DIR = Path(__file__).resolve().parents[2] / "uploads"
ALLOWED_IMAGE_TYPES = {"image/jpeg", "image/png", "image/webp", "image/gif"}
MAX_IMAGE_BYTES = 5 * 1024 * 1024

STATUS_FLOW = [
    "Submitted",
    "AI Verified",
    "Assigned",
    "Work Started",
    "Resolved",
    "Citizen Verified",
]


async def save_image(image: UploadFile) -> str:
    if image.content_type not in ALLOWED_IMAGE_TYPES:
        raise HTTPException(400, f"Unsupported image type: {image.content_type}")
    content = await image.read()
    if len(content) > MAX_IMAGE_BYTES:
        raise HTTPException(400, "Image too large (max 5 MB)")
    suffix = Path(image.filename or "upload.jpg").suffix or ".jpg"
    filename = f"{uuid.uuid4().hex}{suffix}"
    UPLOADS_DIR.mkdir(parents=True, exist_ok=True)
    (UPLOADS_DIR / filename).write_bytes(content)
    return f"/uploads/{filename}"


def _with_priority(complaint: dict) -> dict:
    complaint["priority"] = compute_priority(complaint)
    return complaint


@router.post("", response_model=Complaint)
async def create_complaint(
    description: str = Form(..., min_length=10),
    category: str = Form("Auto-detect (AI)"),
    lat: float = Form(...),
    lng: float = Form(...),
    image: Optional[UploadFile] = File(None),
    user: dict = Depends(current_user),
):
    image_url = await save_image(image) if image else None
    complaint = Complaint(
        id="pending",
        description=description,
        category=category,
        location=Location(lat=lat, lng=lng),
        image_url=image_url,
        status="Submitted",
        created_at=Complaint.now_iso(),
    )
    data = complaint.model_dump()
    data["user_id"] = user["id"]

    ai = analyze_complaint(data)
    data["ai"] = ai
    data["status"] = "AI Verified"
    if category == "Auto-detect (AI)":
        data["category"] = ai.get("category", "Other")

    # duplicate detection against unresolved master complaints
    master = dedupe.find_master(data, store.list_complaints(masters_only=True))
    if master:
        data["duplicate_of"] = master["id"]
        data["status"] = "Merged"
        store.increment_report_count(master["id"])
        created = store.create_complaint(data)
        # duplicates earn no points (anti-spam), but the report still counts
        return _with_priority(created)

    created = store.create_complaint(data)
    rewards.award(user["id"], "submit", f"Complaint {created['id']} submitted")
    rewards.award(user["id"], "ai_verified", f"Complaint {created['id']} AI verified")
    if compute_priority(created)["score"] >= 85:
        rewards.award(user["id"], "high_impact_bonus", f"High-impact report {created['id']}")
    return _with_priority(created)


@router.get("", response_model=list[Complaint])
def list_complaints(masters_only: bool = False):
    return [_with_priority(c) for c in store.list_complaints(masters_only=masters_only)]


@router.get("/mine", response_model=list[Complaint])
def my_complaints(user: dict = Depends(current_user)):
    return [_with_priority(c) for c in store.list_complaints(user_id=user["id"])]


@router.get("/queue", response_model=list[Complaint])
def priority_queue():
    """Authority work queue: unresolved masters, highest priority first."""
    masters = store.list_complaints(masters_only=True)
    active = [_with_priority(c) for c in masters if c["status"] not in RESOLVED_STATUSES]
    return sorted(active, key=lambda c: c["priority"]["score"], reverse=True)


@router.get("/{complaint_id}", response_model=Complaint)
def get_complaint(complaint_id: str):
    complaint = store.get_complaint(complaint_id)
    if complaint is None:
        raise HTTPException(404, f"Complaint {complaint_id} not found")
    return _with_priority(complaint)


@router.post("/{complaint_id}/analyze", response_model=Complaint)
def reanalyze_complaint(complaint_id: str):
    complaint = store.get_complaint(complaint_id)
    if complaint is None:
        raise HTTPException(404, f"Complaint {complaint_id} not found")
    ai = analyze_complaint(complaint)
    updates = {"ai": ai, "status": "AI Verified"}
    if complaint["category"] == "Auto-detect (AI)":
        updates["category"] = ai.get("category", "Other")
    return _with_priority(store.update_complaint(complaint_id, updates))


@router.patch("/{complaint_id}/status", response_model=Complaint)
def update_status(complaint_id: str, status: str = Form(...)):
    if status not in STATUS_FLOW:
        raise HTTPException(400, f"Invalid status. Allowed: {STATUS_FLOW}")
    complaint = store.get_complaint(complaint_id)
    if complaint is None:
        raise HTTPException(404, f"Complaint {complaint_id} not found")
    updates = {"status": status}
    if status == "Resolved" and not complaint.get("resolved_at"):
        updates["resolved_at"] = Complaint.now_iso()
    return _with_priority(store.update_complaint(complaint_id, updates))


@router.post("/{complaint_id}/verify", response_model=Complaint)
async def citizen_verify(
    complaint_id: str,
    result: str = Form(...),  # "Fixed" | "Partially Fixed" | "Not Fixed"
    feedback: str = Form(""),
    image: Optional[UploadFile] = File(None),
    user: dict = Depends(current_user),
):
    if result not in {"Fixed", "Partially Fixed", "Not Fixed"}:
        raise HTTPException(400, "result must be Fixed, Partially Fixed or Not Fixed")
    complaint = store.get_complaint(complaint_id)
    if complaint is None:
        raise HTTPException(404, f"Complaint {complaint_id} not found")
    if complaint["status"] != "Resolved":
        raise HTTPException(400, "Complaint must be in Resolved status to verify")

    image_url = await save_image(image) if image else None
    verification = {
        "result": result,
        "feedback": feedback,
        "image_url": image_url,
        "verified_at": Complaint.now_iso(),
    }

    if result == "Not Fixed":
        updates = {"verification": verification, "status": "Work Started"}
    else:
        updates = {"verification": verification, "status": "Citizen Verified"}
        rewards.award(
            user["id"],
            "citizen_verified",
            f"Resolution of {complaint_id} verified ({result})",
        )
        store.adjust_user(user["id"], trust_delta=1)

    return _with_priority(store.update_complaint(complaint_id, updates))
