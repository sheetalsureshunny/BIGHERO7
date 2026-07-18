"""AI Complaint Intelligence Engine.

Uses OpenAI (with vision when an image is attached) to triage complaints.
Falls back to keyword rules when no API key is set or the call fails, so the
demo never breaks offline.
"""

import base64
import json
import os
from pathlib import Path

from dotenv import load_dotenv
from openai import OpenAI

BACKEND_DIR = Path(__file__).resolve().parents[2]
load_dotenv(BACKEND_DIR / ".env")

MODEL = os.getenv("OPENAI_MODEL", "gpt-4o-mini")

_client = None


def _get_client() -> OpenAI | None:
    key = os.getenv("OPENAI_API_KEY")
    if not key:
        return None
    global _client
    if _client is None:
        _client = OpenAI(api_key=key)
    return _client


SYSTEM_PROMPT = """You are the AI triage engine for "Big Hero 7", a smart-city civic complaint platform for Kochi, India.
Analyze the citizen complaint and return ONLY a JSON object with exactly these keys:
- category: one of "Waste Management","Road Infrastructure","Street Lighting","Water Supply","Traffic","Public Safety","Other"
- department: responsible city department name (e.g. "Sanitation Department","Public Works Department","KSEB","Kerala Water Authority","Traffic Police","City Police")
- severity: one of "Low","Medium","High","Critical"
- priority_score: integer 0-100 (higher = more urgent; weigh safety risk, public impact, and proximity to schools, hospitals, metro stations)
- safety_risk: one of "None","Low","Moderate","Severe"
- estimated_resolution_time: short human string like "6 hours" or "2 days"
- reason: one sentence explaining the priority
- recommended_action: one sentence of actionable instruction for the department
If an image is provided, use it to validate and enrich the analysis. If the image contradicts the text, trust the image."""


FALLBACK_RULES = [
    (
        ("garbage", "waste", "trash", "dump"),
        {
            "category": "Waste Management",
            "department": "Sanitation Department",
            "severity": "High",
            "priority_score": 70,
            "safety_risk": "Moderate",
            "estimated_resolution_time": "12 hours",
            "reason": "Accumulated waste is a public health risk.",
            "recommended_action": "Dispatch a sanitation team to clear the waste.",
        },
    ),
    (
        ("pothole", "road", "crack", "asphalt"),
        {
            "category": "Road Infrastructure",
            "department": "Public Works Department",
            "severity": "High",
            "priority_score": 65,
            "safety_risk": "Moderate",
            "estimated_resolution_time": "2 days",
            "reason": "Road damage endangers vehicles and pedestrians.",
            "recommended_action": "Send a road repair crew to patch the surface.",
        },
    ),
    (
        ("streetlight", "street light", "lamp", "dark street"),
        {
            "category": "Street Lighting",
            "department": "KSEB",
            "severity": "Medium",
            "priority_score": 50,
            "safety_risk": "Low",
            "estimated_resolution_time": "1 day",
            "reason": "Broken lighting reduces night-time safety.",
            "recommended_action": "Replace or repair the faulty streetlight.",
        },
    ),
    (
        ("water", "leak", "pipe", "drainage", "sewage"),
        {
            "category": "Water Supply",
            "department": "Kerala Water Authority",
            "severity": "High",
            "priority_score": 68,
            "safety_risk": "Moderate",
            "estimated_resolution_time": "1 day",
            "reason": "Water leakage wastes supply and damages roads.",
            "recommended_action": "Send a maintenance crew to fix the leak.",
        },
    ),
    (
        ("traffic", "signal", "jam", "parking"),
        {
            "category": "Traffic",
            "department": "Traffic Police",
            "severity": "Medium",
            "priority_score": 55,
            "safety_risk": "Moderate",
            "estimated_resolution_time": "6 hours",
            "reason": "Traffic issues disrupt daily commutes.",
            "recommended_action": "Deploy traffic personnel to manage the area.",
        },
    ),
    (
        ("danger", "unsafe", "accident", "crime", "safety"),
        {
            "category": "Public Safety",
            "department": "City Police",
            "severity": "Critical",
            "priority_score": 85,
            "safety_risk": "Severe",
            "estimated_resolution_time": "3 hours",
            "reason": "Direct threat to citizen safety.",
            "recommended_action": "Dispatch a patrol unit immediately.",
        },
    ),
]

DEFAULT_FALLBACK = {
    "category": "Other",
    "department": "Municipal Corporation",
    "severity": "Medium",
    "priority_score": 40,
    "safety_risk": "Low",
    "estimated_resolution_time": "3 days",
    "reason": "General civic issue requiring review.",
    "recommended_action": "Route to the municipal help desk for assessment.",
}


def _fallback_analysis(complaint: dict) -> dict:
    text = f"{complaint.get('description', '')} {complaint.get('category', '')}".lower()
    for keywords, result in FALLBACK_RULES:
        if any(k in text for k in keywords):
            return {**result, "ai_mode": "fallback"}
    return {**DEFAULT_FALLBACK, "ai_mode": "fallback"}


def _image_data_url(image_url: str | None) -> str | None:
    if not image_url:
        return None
    path = BACKEND_DIR / image_url.lstrip("/")
    if not path.exists():
        return None
    ext = path.suffix.lstrip(".").lower() or "jpeg"
    if ext == "jpg":
        ext = "jpeg"
    b64 = base64.b64encode(path.read_bytes()).decode()
    return f"data:image/{ext};base64,{b64}"


def analyze_complaint(complaint: dict) -> dict:
    client = _get_client()
    if client is None:
        return _fallback_analysis(complaint)

    payload = {
        "description": complaint["description"],
        "citizen_selected_category": complaint.get("category"),
        "location": complaint.get("location"),
        "city_context": "Kochi, Kerala, India. Metro stations, schools and hospitals raise priority.",
    }
    user_content = [{"type": "text", "text": json.dumps(payload)}]
    image = _image_data_url(complaint.get("image_url"))
    if image:
        user_content.append({"type": "image_url", "image_url": {"url": image}})

    try:
        resp = client.chat.completions.create(
            model=MODEL,
            response_format={"type": "json_object"},
            temperature=0.2,
            messages=[
                {"role": "system", "content": SYSTEM_PROMPT},
                {"role": "user", "content": user_content},
            ],
        )
        data = json.loads(resp.choices[0].message.content)
        data["priority_score"] = int(data.get("priority_score", 40))
        data["ai_mode"] = "openai"
        return data
    except Exception as exc:  # any API failure → keep the demo alive
        fallback = _fallback_analysis(complaint)
        fallback["ai_error"] = str(exc)[:200]
        return fallback
