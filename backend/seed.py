"""Seed realistic Kochi demo data: leaderboard users + varied complaints.
Run once:  .venv\\Scripts\\python.exe seed.py
Safe to re-run — skips if seed complaints already exist."""

from datetime import datetime, timedelta, timezone

from app.services import store
from app.services.ai_engine import analyze_complaint


def iso_ago(**kwargs) -> str:
    return (datetime.now(timezone.utc) - timedelta(**kwargs)).isoformat()


LEADERBOARD_USERS = [
    ("BH7-20101", "Anjali Menon", 920, 97),
    ("BH7-20102", "Rahul Nair", 640, 95),
    ("BH7-20103", "Fathima S", 480, 93),
    ("BH7-20104", "Joseph K", 310, 91),
    ("BH7-20105", "Divya Pillai", 150, 88),
]

# (description, category, lat, lng, status, created_ago, resolved_ago)
COMPLAINTS = [
    ("Massive garbage accumulation at Aluva Metro Station east exit, overflowing bins for a week",
     "Auto-detect (AI)", 10.1095, 76.3492, "Work Started", {"days": 4}, None),
    ("Garbage pile growing near Aluva metro parking, stray dogs gathering",
     "Auto-detect (AI)", 10.1092, 76.3498, None, {"days": 3}, None),  # duplicate of above
    ("Overflowing waste bins at Aluva station road, bad smell for commuters",
     "Auto-detect (AI)", 10.1088, 76.3489, None, {"days": 2}, None),  # duplicate of above
    ("Deep pothole cluster on Sahodaran Ayyappan Road causing two-wheeler accidents",
     "Auto-detect (AI)", 9.9605, 76.2985, "Assigned", {"days": 6}, None),
    ("Streetlights dead on Marine Drive walkway for two weeks, unsafe after 8pm",
     "Auto-detect (AI)", 9.9772, 76.2748, "AI Verified", {"days": 12}, None),
    ("Water pipeline burst flooding the road near Kaloor Stadium metro pillar 447",
     "Auto-detect (AI)", 9.9974, 76.3011, "Work Started", {"days": 1}, None),
    ("Broken traffic signal at Vyttila junction causing chaos in peak hours",
     "Auto-detect (AI)", 9.9651, 76.3208, "AI Verified", {"hours": 8}, None),
    ("Open manhole without cover near Ernakulam General Hospital gate, extremely dangerous",
     "Auto-detect (AI)", 9.9741, 76.2845, "AI Verified", {"hours": 5}, None),
    ("Garbage burning in open ground at Palarivattom releasing toxic smoke",
     "Auto-detect (AI)", 10.0069, 76.3095, "Resolved", {"days": 9}, {"days": 2}),
    ("Fallen tree branch blocking footpath at Panampilly Nagar 4th avenue",
     "Auto-detect (AI)", 9.9541, 76.2925, "Resolved", {"days": 15}, {"days": 11}),
    ("Waterlogging at Edappally underpass after every rain, buses stalling",
     "Auto-detect (AI)", 10.0258, 76.3079, "Assigned", {"days": 7}, None),
]

SEED_MARKER = "Massive garbage accumulation at Aluva Metro Station east exit"


def main() -> None:
    existing = store.list_complaints()
    if any(SEED_MARKER in c["description"] for c in existing):
        print("Seed data already present — nothing to do.")
        return

    for uid, name, points, trust in LEADERBOARD_USERS:
        store.upsert_user(uid, name, points, trust)
    print(f"Seeded {len(LEADERBOARD_USERS)} leaderboard users.")

    id_by_index: dict[int, str] = {}
    for i, (desc, cat, lat, lng, status, ago, resolved_ago) in enumerate(COMPLAINTS):
        data = {
            "description": desc,
            "category": cat,
            "location": {"lat": lat, "lng": lng},
            "image_url": None,
            "status": "Submitted",
            "created_at": iso_ago(**ago),
            "report_count": 1,
        }
        ai = analyze_complaint(data)
        data["ai"] = ai
        if cat == "Auto-detect (AI)":
            data["category"] = ai.get("category", "Other")

        if status is None:  # scripted duplicate of the first Aluva complaint
            data["status"] = "Merged"
            data["duplicate_of"] = id_by_index[0]
            created = store.create_complaint(data)
            store.increment_report_count(id_by_index[0])
        else:
            data["status"] = status
            if resolved_ago:
                data["resolved_at"] = iso_ago(**resolved_ago)
            created = store.create_complaint(data)
        id_by_index[i] = created["id"]
        print(f"  {created['id']}  {data['status']:>12}  {desc[:60]}")

    # crowd-boost the Aluva master so it tops the queue
    for _ in range(45):
        store.increment_report_count(id_by_index[0])
    print(f"Boosted {id_by_index[0]} to simulate 48 citizen reports (Aluva cluster).")
    print("Done.")


if __name__ == "__main__":
    main()
