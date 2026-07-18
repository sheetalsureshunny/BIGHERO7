# Big Hero 7

AI-Powered Civic Intelligence + Metro Rewards Ecosystem — hackathon MVP.

Citizens report civic problems → AI analyzes, deduplicates, and prioritizes them → authorities resolve in priority order → citizens verify fixes → verified contributions earn Civic Points convertible to metro wallet credit.

## Structure

```
frontend/   React + Vite + Tailwind + Leaflet
backend/    FastAPI + OpenAI + SQLite
```

## Run

Backend (terminal 1):

```
cd backend
.venv\Scripts\activate
uvicorn app.main:app --reload --port 8000
```

Frontend (terminal 2):

```
cd frontend
npm run dev
```

App: http://localhost:5173 — API docs: http://localhost:8000/docs

## OpenAI (optional but recommended)

Create `backend/.env`:

```
OPENAI_API_KEY=sk-your-key
```

Without a key the AI engine falls back to keyword rules — the demo still works offline.

## Seed demo data

```
cd backend
.venv\Scripts\python.exe seed.py
```

Adds 11 realistic Kochi complaints (incl. a 48-report Aluva Metro garbage cluster) and 5 leaderboard users. Safe to re-run. To reset everything, delete `backend/data/bighero7.db` and re-seed.

## Demo script (5 min)

1. **Home** — pitch the loop: report → AI triage → resolve → verify → metro rewards.
2. **Report Issue** — describe "Garbage pile near Aluva Metro east exit", leave category on Auto-detect, pin on map near Aluva, submit.
   - Show ticket ID + 🤖 AI card (category, department, severity, priority score).
   - Point out: it merged into the existing Aluva master (dedupe) — no duplicate work item, no farmed points.
3. **City Map** — red = critical zones, circle size = report volume. Filter by category/status. Click the Aluva cluster: 48 reports.
4. **Admin** — stat tiles (61 reports → 13 unique, dupes merged), category bars, priority queue sorted by score (not first-come-first-serve; time pending keeps raising scores). Move a ticket → Resolved.
5. **My Complaints** — the resolved ticket shows "verify" buttons. Click Fixed → +30 points.
6. **Wallet** — points, trust score, level progress, badges, leaderboard. Convert 100+ points → ₹ metro credit on the connected metro card.

## API surface

| Endpoint | What |
|---|---|
| `POST /api/complaints` | submit (multipart, optional image) → AI analysis + dedupe + rewards |
| `GET /api/complaints` | list (`?masters_only=true`) |
| `GET /api/complaints/queue` | priority-sorted authority queue |
| `PATCH /api/complaints/{id}/status` | status flow update |
| `POST /api/complaints/{id}/verify` | citizen verification (Fixed / Partially / Not Fixed) |
| `POST /api/complaints/{id}/analyze` | re-run AI |
| `GET /api/stats` | dashboard stats |
| `GET /api/wallet` · `POST /api/wallet/convert` · `GET /api/wallet/leaderboard` | civic wallet |

## Hackathon scope notes

- Single demo citizen (`BH7-20452`) — real auth (Firebase) is out of MVP scope.
- SQLite behind `app/services/store.py`; Supabase/Postgres swap touches that file only.
- Metro wallet is simulated (no real KMRL integration).
