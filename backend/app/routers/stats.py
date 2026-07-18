from datetime import datetime, timezone

from fastapi import APIRouter

from ..services import store
from ..services.priority import RESOLVED_STATUSES, compute_priority

router = APIRouter(prefix="/api/stats", tags=["stats"])


def _hours_between(start: str, end: str) -> float | None:
    try:
        a = datetime.fromisoformat(start)
        b = datetime.fromisoformat(end)
        if a.tzinfo is None:
            a = a.replace(tzinfo=timezone.utc)
        if b.tzinfo is None:
            b = b.replace(tzinfo=timezone.utc)
        return (b - a).total_seconds() / 3600
    except ValueError:
        return None


@router.get("")
def get_stats():
    complaints = store.list_complaints()
    masters = [c for c in complaints if not c.get("duplicate_of")]
    for c in masters:
        c["priority"] = compute_priority(c)

    resolved = [c for c in masters if c["status"] in RESOLVED_STATUSES]
    critical = [c for c in masters if c["priority"]["level"] == "CRITICAL"]

    durations = [
        h
        for c in resolved
        if c.get("resolved_at")
        and (h := _hours_between(c["created_at"], c["resolved_at"])) is not None
    ]
    avg_hours = round(sum(durations) / len(durations), 1) if durations else None

    by_category: dict[str, int] = {}
    by_status: dict[str, int] = {}
    for c in masters:
        cat = (c.get("ai") or {}).get("category") or c["category"]
        by_category[cat] = by_category.get(cat, 0) + c.get("report_count", 1)
        by_status[c["status"]] = by_status.get(c["status"], 0) + 1

    return {
        "total_reports": sum(c.get("report_count", 1) for c in masters),
        "total_complaints": len(masters),
        "duplicates_merged": len(complaints) - len(masters),
        "resolved": len(resolved),
        "critical_zones": len(critical),
        "avg_resolution_hours": avg_hours,
        "by_category": by_category,
        "by_status": by_status,
    }
