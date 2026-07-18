"""AI Priority Ranking — composite score, not first-come-first-serve.

score = AI base (severity/priority) + report volume + affected population
        + location importance + time pending + safety risk
Computed at read time so "time pending" keeps rising until resolution.
"""

import math
from datetime import datetime, timezone

SEVERITY_BASE = {"Low": 25, "Medium": 45, "High": 65, "Critical": 85}
SAFETY_BONUS = {"None": 0, "Low": 2, "Moderate": 8, "Severe": 15}

# Key POIs around Kochi — proximity raises priority
KEY_LOCATIONS = [
    ("Aluva Metro Station", 10.1099, 76.3495),
    ("Kaloor Metro / Stadium", 9.9977, 76.3018),
    ("Edappally Junction", 10.0261, 76.3084),
    ("MG Road Metro Station", 9.9707, 76.2810),
    ("Ernakulam General Hospital", 9.9738, 76.2842),
    ("Vyttila Mobility Hub", 9.9647, 76.3212),
]

POI_RADIUS_M = 600

LEVELS = [
    (85, "CRITICAL", "🔴"),
    (65, "HIGH", "🟠"),
    (45, "MEDIUM", "🟡"),
    (0, "LOW", "🟢"),
]

RESOLVED_STATUSES = {"Resolved", "Citizen Verified"}


def haversine_m(lat1: float, lng1: float, lat2: float, lng2: float) -> float:
    r = 6371000
    p1, p2 = math.radians(lat1), math.radians(lat2)
    dp = math.radians(lat2 - lat1)
    dl = math.radians(lng2 - lng1)
    a = math.sin(dp / 2) ** 2 + math.cos(p1) * math.cos(p2) * math.sin(dl / 2) ** 2
    return 2 * r * math.asin(math.sqrt(a))


def nearest_poi(lat: float, lng: float) -> tuple[str, float] | None:
    best = None
    for name, plat, plng in KEY_LOCATIONS:
        d = haversine_m(lat, lng, plat, plng)
        if best is None or d < best[1]:
            best = (name, d)
    return best


def _days_pending(created_at: str) -> float:
    try:
        created = datetime.fromisoformat(created_at)
        if created.tzinfo is None:
            created = created.replace(tzinfo=timezone.utc)
        return max((datetime.now(timezone.utc) - created).total_seconds() / 86400, 0)
    except ValueError:
        return 0


def compute_priority(complaint: dict) -> dict:
    ai = complaint.get("ai") or {}
    base = ai.get("priority_score") or SEVERITY_BASE.get(ai.get("severity"), 40)

    reports = complaint.get("report_count", 1)
    report_bonus = min(reports - 1, 10) * 3  # up to +30

    affected = reports * 150  # rough estimate: each report ≈ 150 affected citizens
    population_bonus = min(affected // 500, 10)  # up to +10

    loc = complaint.get("location") or {}
    poi = nearest_poi(loc.get("lat", 0), loc.get("lng", 0))
    location_bonus = 0
    poi_note = None
    if poi and poi[1] <= POI_RADIUS_M:
        location_bonus = 10
        poi_note = f"{int(poi[1])} m from {poi[0]}"

    pending_days = _days_pending(complaint.get("created_at", ""))
    time_bonus = min(int(pending_days * 2), 20)

    safety_bonus = SAFETY_BONUS.get(ai.get("safety_risk"), 0)

    score = min(
        int(base + report_bonus + population_bonus + location_bonus + time_bonus + safety_bonus),
        100,
    )
    if complaint.get("status") in RESOLVED_STATUSES:
        score = 0

    level, emoji = next((lvl, emo) for threshold, lvl, emo in LEVELS if score >= threshold)

    return {
        "score": score,
        "level": level,
        "emoji": emoji,
        "affected_population": affected,
        "factors": {
            "ai_base": base,
            "reports": report_bonus,
            "population": population_bonus,
            "location": location_bonus,
            "time_pending": time_bonus,
            "safety": safety_bonus,
        },
        "near_poi": poi_note,
        "days_pending": round(pending_days, 1),
    }
