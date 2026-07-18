"""AI duplicate complaint detection.

A new complaint is a duplicate of an existing master when:
- within RADIUS_M meters, AND
- same AI/citizen category OR description text similarity >= TEXT_SIM, AND
- the master is still unresolved.
Duplicates attach to the master (report_count += 1) instead of creating
separate work items.
"""

from difflib import SequenceMatcher

from .priority import RESOLVED_STATUSES, haversine_m

RADIUS_M = 300
TEXT_SIM = 0.45


def _similarity(a: str, b: str) -> float:
    return SequenceMatcher(None, a.lower().strip(), b.lower().strip()).ratio()


def _category(complaint: dict) -> str:
    ai = complaint.get("ai") or {}
    return (ai.get("category") or complaint.get("category") or "").lower()


def find_master(new: dict, masters: list[dict]) -> dict | None:
    loc = new.get("location") or {}
    for master in masters:
        if master.get("status") in RESOLVED_STATUSES:
            continue
        if master.get("duplicate_of"):
            continue
        mloc = master.get("location") or {}
        distance = haversine_m(
            loc.get("lat", 0), loc.get("lng", 0),
            mloc.get("lat", 0), mloc.get("lng", 0),
        )
        if distance > RADIUS_M:
            continue
        same_category = _category(new) == _category(master) and _category(new) != ""
        similar_text = _similarity(new["description"], master["description"]) >= TEXT_SIM
        if same_category or similar_text:
            return master
    return None
