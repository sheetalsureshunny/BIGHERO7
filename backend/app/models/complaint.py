from datetime import datetime, timezone
from typing import Optional

from pydantic import BaseModel


class Location(BaseModel):
    lat: float
    lng: float


class Complaint(BaseModel):
    id: str
    description: str
    category: str
    location: Location
    image_url: Optional[str] = None
    status: str = "Submitted"
    created_at: str
    ai: Optional[dict] = None
    report_count: int = 1
    duplicate_of: Optional[str] = None
    resolved_at: Optional[str] = None
    verification: Optional[dict] = None
    priority: Optional[dict] = None
    user_id: Optional[str] = None

    @staticmethod
    def now_iso() -> str:
        return datetime.now(timezone.utc).isoformat()
