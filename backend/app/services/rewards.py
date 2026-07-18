"""Smart Civic Reward System — points, trust, levels, badges, metro conversion."""

from . import store

POINTS = {
    "submit": 5,
    "ai_verified": 15,
    "citizen_verified": 30,
    "high_impact_bonus": 10,
}

CONVERSION_RATE = 0.10  # 1 civic point = ₹0.10 (500 points = ₹50)
MIN_CONVERT_POINTS = 100

LEVELS = [
    (1000, "Big Hero"),
    (600, "City Hero"),
    (300, "Guardian"),
    (100, "Contributor"),
    (0, "Citizen"),
]


def award(user_id: str, key: str, reason: str) -> int:
    points = POINTS[key]
    store.adjust_user(user_id, points_delta=points)
    store.add_transaction(user_id, points, reason)
    return points


def level_for(points: int) -> dict:
    for threshold, name in LEVELS:
        if points >= threshold:
            next_levels = [t for t, _ in LEVELS if t > points]
            return {
                "name": name,
                "next_at": min(next_levels) if next_levels else None,
            }
    return {"name": "Citizen", "next_at": 100}


def badges_for(user: dict, complaints: list[dict]) -> list[dict]:
    mine = complaints  # single demo citizen owns all local complaints
    verified = [c for c in mine if c.get("status") == "Citizen Verified"]
    categories = {(c.get("ai") or {}).get("category") for c in mine}
    badges = []
    if any(c == "Waste Management" for c in categories):
        badges.append({"name": "Clean City Champion", "icon": "🧹"})
    if any(c == "Road Infrastructure" for c in categories):
        badges.append({"name": "Road Guardian", "icon": "🛣️"})
    if user["metro_connected"]:
        badges.append({"name": "Metro Partner", "icon": "🚇"})
    if len(verified) >= 1:
        badges.append({"name": "Verified Fixer", "icon": "✅"})
    if user["points"] >= 300:
        badges.append({"name": "Green Hero", "icon": "🌿"})
    return badges


def convert_points(user_id: str, points: int) -> dict:
    user = store.get_user(user_id)
    if user is None:
        raise ValueError("User not found")
    if points < MIN_CONVERT_POINTS:
        raise ValueError(f"Minimum conversion is {MIN_CONVERT_POINTS} points")
    if points > user["points"]:
        raise ValueError("Not enough civic points")
    rupees = round(points * CONVERSION_RATE, 2)
    store.adjust_user(user_id, points_delta=-points, balance_delta=rupees)
    store.add_transaction(user_id, -points, f"Converted to ₹{rupees} metro credit")
    return store.get_user(user_id)
