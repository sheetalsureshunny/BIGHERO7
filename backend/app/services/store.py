"""SQLite store for complaints, users (wallet) and reward transactions.
All persistence stays behind these functions — swapping to Supabase/Postgres
later only touches this module."""

import json
import sqlite3
from datetime import datetime, timezone
from pathlib import Path

DATA_DIR = Path(__file__).resolve().parents[2] / "data"
DB_FILE = DATA_DIR / "bighero7.db"
LEGACY_JSON = DATA_DIR / "complaints.json"

DEMO_USER_ID = "BH7-20452"


def _connect() -> sqlite3.Connection:
    DATA_DIR.mkdir(parents=True, exist_ok=True)
    conn = sqlite3.connect(DB_FILE)
    conn.row_factory = sqlite3.Row
    conn.execute("PRAGMA journal_mode=WAL")
    return conn


def _now_iso() -> str:
    return datetime.now(timezone.utc).isoformat()


# ---------------------------------------------------------------- complaints

COMPLAINT_COLUMNS = """
    id TEXT PRIMARY KEY,
    description TEXT NOT NULL,
    category TEXT NOT NULL,
    lat REAL NOT NULL,
    lng REAL NOT NULL,
    image_url TEXT,
    status TEXT NOT NULL DEFAULT 'Submitted',
    created_at TEXT NOT NULL,
    ai TEXT,
    report_count INTEGER NOT NULL DEFAULT 1,
    duplicate_of TEXT,
    resolved_at TEXT,
    verification TEXT,
    user_id TEXT
"""

EXTRA_COLUMNS = {
    "report_count": "INTEGER NOT NULL DEFAULT 1",
    "duplicate_of": "TEXT",
    "resolved_at": "TEXT",
    "verification": "TEXT",
    "user_id": "TEXT",
}

USER_EXTRA_COLUMNS = {
    "email": "TEXT",
    "password_hash": "TEXT",
    "token": "TEXT",
}


def _row_to_dict(row: sqlite3.Row) -> dict:
    return {
        "id": row["id"],
        "description": row["description"],
        "category": row["category"],
        "location": {"lat": row["lat"], "lng": row["lng"]},
        "image_url": row["image_url"],
        "status": row["status"],
        "created_at": row["created_at"],
        "ai": json.loads(row["ai"]) if row["ai"] else None,
        "report_count": row["report_count"],
        "duplicate_of": row["duplicate_of"],
        "resolved_at": row["resolved_at"],
        "verification": json.loads(row["verification"]) if row["verification"] else None,
        "user_id": row["user_id"],
    }


def init_db() -> None:
    with _connect() as conn:
        conn.execute(f"CREATE TABLE IF NOT EXISTS complaints ({COMPLAINT_COLUMNS})")
        # migrate Phase-5 table that lacks the newer columns
        existing = {r["name"] for r in conn.execute("PRAGMA table_info(complaints)")}
        for col, ddl in EXTRA_COLUMNS.items():
            if col not in existing:
                conn.execute(f"ALTER TABLE complaints ADD COLUMN {col} {ddl}")
        conn.execute(
            """
            CREATE TABLE IF NOT EXISTS users (
                id TEXT PRIMARY KEY,
                name TEXT NOT NULL,
                points INTEGER NOT NULL DEFAULT 0,
                trust_score INTEGER NOT NULL DEFAULT 90,
                metro_balance REAL NOT NULL DEFAULT 0,
                metro_connected INTEGER NOT NULL DEFAULT 1
            )
            """
        )
        conn.execute(
            """
            CREATE TABLE IF NOT EXISTS transactions (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                user_id TEXT NOT NULL,
                points INTEGER NOT NULL,
                reason TEXT NOT NULL,
                created_at TEXT NOT NULL
            )
            """
        )
        user_cols = {r["name"] for r in conn.execute("PRAGMA table_info(users)")}
        for col, ddl in USER_EXTRA_COLUMNS.items():
            if col not in user_cols:
                conn.execute(f"ALTER TABLE users ADD COLUMN {col} {ddl}")
        conn.execute(
            "INSERT OR IGNORE INTO users (id, name, points, trust_score, metro_balance) VALUES (?, ?, 0, 90, 0)",
            (DEMO_USER_ID, "Demo Citizen"),
        )
        # give the demo citizen login credentials + claim legacy complaints
        from . import security  # local import avoids cycle at module load

        conn.execute(
            "UPDATE users SET email = ?, password_hash = ? WHERE id = ? AND email IS NULL",
            ("demo@bh7.city", security.hash_password("demo123"), DEMO_USER_ID),
        )
        conn.execute(
            "UPDATE complaints SET user_id = ? WHERE user_id IS NULL", (DEMO_USER_ID,)
        )
    _migrate_legacy_json()


def _migrate_legacy_json() -> None:
    if not LEGACY_JSON.exists():
        return
    try:
        items = json.loads(LEGACY_JSON.read_text(encoding="utf-8"))
    except (json.JSONDecodeError, OSError):
        return
    with _connect() as conn:
        for c in items:
            conn.execute(
                """
                INSERT OR IGNORE INTO complaints
                    (id, description, category, lat, lng, image_url, status, created_at, ai)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
                """,
                (
                    c["id"],
                    c["description"],
                    c["category"],
                    c["location"]["lat"],
                    c["location"]["lng"],
                    c.get("image_url"),
                    c.get("status", "Submitted"),
                    c["created_at"],
                    json.dumps(c["ai"]) if c.get("ai") else None,
                ),
            )
    LEGACY_JSON.rename(LEGACY_JSON.with_suffix(".json.migrated"))


def next_ticket_id(conn: sqlite3.Connection) -> str:
    row = conn.execute(
        "SELECT MAX(CAST(substr(id, 5) AS INTEGER)) AS n FROM complaints"
    ).fetchone()
    return f"BH7-{max(row['n'] or 1000, 1000) + 1}"


def list_complaints(masters_only: bool = False, user_id: str | None = None) -> list[dict]:
    query = "SELECT * FROM complaints"
    clauses, params = [], []
    if masters_only:
        clauses.append("duplicate_of IS NULL")
    if user_id:
        clauses.append("user_id = ?")
        params.append(user_id)
    if clauses:
        query += " WHERE " + " AND ".join(clauses)
    query += " ORDER BY created_at DESC"
    with _connect() as conn:
        return [_row_to_dict(r) for r in conn.execute(query, params).fetchall()]


def get_complaint(complaint_id: str) -> dict | None:
    with _connect() as conn:
        row = conn.execute(
            "SELECT * FROM complaints WHERE id = ?", (complaint_id,)
        ).fetchone()
        return _row_to_dict(row) if row else None


def create_complaint(data: dict) -> dict:
    with _connect() as conn:
        data["id"] = next_ticket_id(conn)
        conn.execute(
            """
            INSERT INTO complaints
                (id, description, category, lat, lng, image_url, status, created_at,
                 ai, report_count, duplicate_of, resolved_at, verification, user_id)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            """,
            (
                data["id"],
                data["description"],
                data["category"],
                data["location"]["lat"],
                data["location"]["lng"],
                data.get("image_url"),
                data.get("status", "Submitted"),
                data["created_at"],
                json.dumps(data["ai"]) if data.get("ai") else None,
                data.get("report_count", 1),
                data.get("duplicate_of"),
                data.get("resolved_at"),
                json.dumps(data["verification"]) if data.get("verification") else None,
                data.get("user_id"),
            ),
        )
        return data


UPDATABLE_FIELDS = {
    "description",
    "category",
    "image_url",
    "status",
    "ai",
    "report_count",
    "duplicate_of",
    "resolved_at",
    "verification",
}

JSON_FIELDS = {"ai", "verification"}


def update_complaint(complaint_id: str, updates: dict) -> dict | None:
    fields = {k: v for k, v in updates.items() if k in UPDATABLE_FIELDS}
    for k in JSON_FIELDS & fields.keys():
        fields[k] = json.dumps(fields[k]) if fields[k] else None
    if fields:
        set_clause = ", ".join(f"{k} = ?" for k in fields)
        with _connect() as conn:
            conn.execute(
                f"UPDATE complaints SET {set_clause} WHERE id = ?",
                (*fields.values(), complaint_id),
            )
    return get_complaint(complaint_id)


def increment_report_count(complaint_id: str) -> None:
    with _connect() as conn:
        conn.execute(
            "UPDATE complaints SET report_count = report_count + 1 WHERE id = ?",
            (complaint_id,),
        )


# ---------------------------------------------------------------- users / wallet


def _user_row(row: sqlite3.Row) -> dict:
    return {
        "id": row["id"],
        "name": row["name"],
        "points": row["points"],
        "trust_score": row["trust_score"],
        "metro_balance": row["metro_balance"],
        "metro_connected": bool(row["metro_connected"]),
        "email": row["email"],
    }


def next_user_id(conn: sqlite3.Connection) -> str:
    row = conn.execute(
        "SELECT MAX(CAST(substr(id, 5) AS INTEGER)) AS n FROM users"
    ).fetchone()
    return f"BH7-{max(row['n'] or 20000, 20000) + 1}"


def create_user(name: str, email: str, password_hash: str, token: str) -> dict:
    with _connect() as conn:
        user_id = next_user_id(conn)
        conn.execute(
            """
            INSERT INTO users (id, name, points, trust_score, metro_balance, email, password_hash, token)
            VALUES (?, ?, 0, 90, 0, ?, ?, ?)
            """,
            (user_id, name, email.lower().strip(), password_hash, token),
        )
    return get_user(user_id)


def get_user_by_email(email: str) -> dict | None:
    with _connect() as conn:
        row = conn.execute(
            "SELECT * FROM users WHERE email = ?", (email.lower().strip(),)
        ).fetchone()
        return dict(row) if row else None  # includes password_hash for verification


def get_user_by_token(token: str) -> dict | None:
    if not token:
        return None
    with _connect() as conn:
        row = conn.execute("SELECT * FROM users WHERE token = ?", (token,)).fetchone()
        return _user_row(row) if row else None


def set_token(user_id: str, token: str | None) -> None:
    with _connect() as conn:
        conn.execute("UPDATE users SET token = ? WHERE id = ?", (token, user_id))


def get_user(user_id: str = DEMO_USER_ID) -> dict | None:
    with _connect() as conn:
        row = conn.execute("SELECT * FROM users WHERE id = ?", (user_id,)).fetchone()
        return _user_row(row) if row else None


def upsert_user(user_id: str, name: str, points: int = 0, trust_score: int = 90) -> None:
    with _connect() as conn:
        conn.execute(
            "INSERT OR IGNORE INTO users (id, name, points, trust_score) VALUES (?, ?, ?, ?)",
            (user_id, name, points, trust_score),
        )


def adjust_user(user_id: str, points_delta: int = 0, balance_delta: float = 0.0, trust_delta: int = 0) -> dict | None:
    with _connect() as conn:
        conn.execute(
            """
            UPDATE users
            SET points = MAX(points + ?, 0),
                metro_balance = MAX(metro_balance + ?, 0),
                trust_score = MIN(MAX(trust_score + ?, 0), 100)
            WHERE id = ?
            """,
            (points_delta, balance_delta, trust_delta, user_id),
        )
    return get_user(user_id)


def add_transaction(user_id: str, points: int, reason: str) -> None:
    with _connect() as conn:
        conn.execute(
            "INSERT INTO transactions (user_id, points, reason, created_at) VALUES (?, ?, ?, ?)",
            (user_id, points, reason, _now_iso()),
        )


def list_transactions(user_id: str = DEMO_USER_ID, limit: int = 20) -> list[dict]:
    with _connect() as conn:
        rows = conn.execute(
            "SELECT * FROM transactions WHERE user_id = ? ORDER BY id DESC LIMIT ?",
            (user_id, limit),
        ).fetchall()
        return [
            {
                "points": r["points"],
                "reason": r["reason"],
                "created_at": r["created_at"],
            }
            for r in rows
        ]


def leaderboard(limit: int = 10) -> list[dict]:
    with _connect() as conn:
        rows = conn.execute(
            "SELECT * FROM users ORDER BY points DESC LIMIT ?", (limit,)
        ).fetchall()
        return [_user_row(r) for r in rows]


init_db()
