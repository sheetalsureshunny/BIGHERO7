"""AI Predictive City Analytics.

Studies historical complaints + location clustering + seasonal/weather context
+ population proxy to forecast future civic risks (flooding, disease, accidents,
night-crime) BEFORE they happen.

Deterministic engine runs offline; when an OpenAI key is set, it rewrites each
forecast into a sharper natural-language briefing.
"""

import json
import os
from collections import defaultdict
from datetime import datetime, timezone

from . import store
from .ai_engine import _get_client, MODEL
from .priority import KEY_LOCATIONS, haversine_m

ZONE_RADIUS_M = 1200

# Kochi monsoon calendar → weather pressure factor (0..1)
# Jun–Sep = South-West monsoon (peak), Oct–Nov = retreating monsoon.
MONSOON_FACTOR = {
    1: 0.1, 2: 0.1, 3: 0.15, 4: 0.25, 5: 0.5, 6: 0.9,
    7: 1.0, 8: 0.95, 9: 0.8, 10: 0.6, 11: 0.4, 12: 0.2,
}

MONTH_NAME = {
    1: "January", 2: "February", 3: "March", 4: "April", 5: "May", 6: "June",
    7: "July", 8: "August", 9: "September", 10: "October", 11: "November", 12: "December",
}

# category → the risk it predicts, and whether rain amplifies it
RISK_MODELS = {
    "Water Supply": {
        "risk": "Flooding & waterlogging",
        "rain_driven": True,
        "action": "Pre-clear stormwater drains and stage pumps before the next heavy spell.",
    },
    "Road Infrastructure": {
        "risk": "Road accidents & surface collapse",
        "rain_driven": True,
        "action": "Inspect and patch damaged stretches; rain accelerates pothole failure.",
    },
    "Waste Management": {
        "risk": "Disease outbreak & drain blockage",
        "rain_driven": True,
        "action": "Increase collection frequency; wet waste clogs drains and breeds vectors.",
    },
    "Street Lighting": {
        "risk": "Night-time safety incidents",
        "rain_driven": False,
        "action": "Restore lighting; low visibility raises accident and crime risk after dark.",
    },
    "Traffic": {
        "risk": "Congestion & gridlock",
        "rain_driven": True,
        "action": "Deploy traffic marshals at choke points during peak and rain hours.",
    },
    "Public Safety": {
        "risk": "Public safety escalation",
        "rain_driven": False,
        "action": "Prioritise patrol and hazard removal in this zone.",
    },
}


def _month() -> int:
    return datetime.now(timezone.utc).month


def _days_since(iso: str) -> float:
    try:
        d = datetime.fromisoformat(iso)
        if d.tzinfo is None:
            d = d.replace(tzinfo=timezone.utc)
        return max((datetime.now(timezone.utc) - d).total_seconds() / 86400, 0)
    except ValueError:
        return 999


def _zone_of(lat: float, lng: float) -> str:
    best = None
    for name, plat, plng in KEY_LOCATIONS:
        d = haversine_m(lat, lng, plat, plng)
        if best is None or d < best[1]:
            best = (name, d)
    if best and best[1] <= ZONE_RADIUS_M:
        return best[0]
    return "Greater Kochi"


def _category(c: dict) -> str:
    return (c.get("ai") or {}).get("category") or c.get("category") or "Other"


def _forecasts() -> list[dict]:
    complaints = [c for c in store.list_complaints() if not c.get("duplicate_of")]
    month = _month()
    rain = MONSOON_FACTOR.get(month, 0.3)

    # aggregate reports per (zone, category)
    buckets: dict[tuple[str, str], dict] = defaultdict(
        lambda: {"reports": 0, "complaints": 0, "recent": 0, "sample": None}
    )
    for c in complaints:
        loc = c.get("location") or {}
        zone = _zone_of(loc.get("lat", 0), loc.get("lng", 0))
        cat = _category(c)
        b = buckets[(zone, cat)]
        b["reports"] += c.get("report_count", 1)
        b["complaints"] += 1
        if _days_since(c.get("created_at", "")) <= 30:
            b["recent"] += c.get("report_count", 1)
        if b["sample"] is None:
            b["sample"] = c["description"]

    forecasts = []
    for (zone, cat), b in buckets.items():
        model = RISK_MODELS.get(cat)
        if model is None:
            continue

        # base likelihood from report density + recency
        density = min(b["reports"] / 20, 1.0)
        recency = min(b["recent"] / 10, 1.0)
        base = 0.35 * density + 0.25 * recency

        # weather amplification for rain-driven risks
        weather = rain if model["rain_driven"] else 0.3
        likelihood = base + 0.4 * weather
        likelihood = round(min(likelihood, 0.98), 2)

        if likelihood < 0.35:
            continue  # not worth surfacing

        level = (
            "Severe" if likelihood >= 0.75
            else "High" if likelihood >= 0.55
            else "Moderate"
        )

        forecasts.append({
            "zone": zone,
            "category": cat,
            "risk": model["risk"],
            "likelihood": likelihood,
            "level": level,
            "reports": b["reports"],
            "recent_reports": b["recent"],
            "rain_driven": model["rain_driven"],
            "recommended_action": model["action"],
            "sample": b["sample"],
        })

    forecasts.sort(key=lambda f: f["likelihood"], reverse=True)
    return forecasts[:8]


def _weather_context() -> dict:
    month = _month()
    rain = MONSOON_FACTOR.get(month, 0.3)
    if rain >= 0.85:
        season = "Peak South-West monsoon"
    elif rain >= 0.5:
        season = "Active monsoon"
    elif rain >= 0.3:
        season = "Retreating / pre-monsoon"
    else:
        season = "Dry season"
    return {
        "month": MONTH_NAME[month],
        "season": season,
        "rain_pressure": round(rain, 2),
    }


def _narrative_fallback(f: dict, weather: dict) -> str:
    rain_note = (
        f" With {weather['season'].lower()} raising rain pressure to "
        f"{int(weather['rain_pressure'] * 100)}%, this risk is elevated."
        if f["rain_driven"] else ""
    )
    return (
        f"{f['zone']} shows {f['reports']} report(s) of {f['category'].lower()} "
        f"issues ({f['recent_reports']} in the last 30 days). Predicted risk: "
        f"{f['risk'].lower()} at ~{int(f['likelihood'] * 100)}% likelihood.{rain_note}"
    )


def predict() -> dict:
    weather = _weather_context()
    forecasts = _forecasts()

    client = _get_client()
    if client and forecasts:
        try:
            prompt = {
                "city": "Kochi, Kerala, India",
                "weather": weather,
                "forecasts": [
                    {k: f[k] for k in ("zone", "category", "risk", "likelihood", "reports", "recent_reports")}
                    for f in forecasts
                ],
            }
            resp = client.chat.completions.create(
                model=MODEL,
                response_format={"type": "json_object"},
                temperature=0.4,
                messages=[
                    {
                        "role": "system",
                        "content": (
                            "You are a predictive civic-risk analyst for Kochi. Given aggregated "
                            "complaint forecasts and current monsoon weather, return JSON "
                            '{"headline": str, "briefings": [str, ...]} where briefings[i] is a '
                            "one-sentence predictive warning for forecasts[i], in the same order. "
                            "Be specific, mention the zone, and connect weather to risk."
                        ),
                    },
                    {"role": "user", "content": json.dumps(prompt)},
                ],
            )
            data = json.loads(resp.choices[0].message.content)
            headline = data.get("headline")
            briefings = data.get("briefings", [])
            for i, f in enumerate(forecasts):
                f["briefing"] = (
                    briefings[i] if i < len(briefings) else _narrative_fallback(f, weather)
                )
            return {"weather": weather, "headline": headline, "forecasts": forecasts, "ai_mode": "openai"}
        except Exception:
            pass  # fall through to deterministic

    for f in forecasts:
        f["briefing"] = _narrative_fallback(f, weather)
    headline = (
        f"{weather['season']} in {weather['month']}: "
        f"{sum(1 for f in forecasts if f['level'] == 'Severe')} severe civic risks predicted across Kochi."
        if forecasts
        else "No significant civic risks predicted from current data."
    )
    return {"weather": weather, "headline": headline, "forecasts": forecasts, "ai_mode": "fallback"}
