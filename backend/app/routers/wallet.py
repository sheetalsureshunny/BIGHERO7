from fastapi import APIRouter, Depends, Form, HTTPException

from ..services import rewards, store
from .auth import current_user

router = APIRouter(prefix="/api/wallet", tags=["wallet"])

RIDE_COST = 25.0


@router.get("")
def get_wallet(user: dict = Depends(current_user)):
    complaints = store.list_complaints(user_id=user["id"])
    return {
        **user,
        "level": rewards.level_for(user["points"]),
        "badges": rewards.badges_for(user, complaints),
        "transactions": store.list_transactions(user["id"]),
        "conversion_rate": rewards.CONVERSION_RATE,
        "min_convert_points": rewards.MIN_CONVERT_POINTS,
        "ride_cost": RIDE_COST,
    }


@router.post("/convert")
def convert(points: int = Form(...), user: dict = Depends(current_user)):
    try:
        updated = rewards.convert_points(user["id"], points)
    except ValueError as exc:
        raise HTTPException(400, str(exc))
    return {**updated, "level": rewards.level_for(updated["points"])}


@router.post("/redeem-ride")
def redeem_ride(user: dict = Depends(current_user)):
    if user["metro_balance"] < RIDE_COST:
        raise HTTPException(400, f"Need ₹{RIDE_COST:.0f} metro balance for a ride")
    updated = store.adjust_user(user["id"], balance_delta=-RIDE_COST)
    store.add_transaction(user["id"], 0, f"🚇 Metro ride redeemed (₹{RIDE_COST:.0f})")
    return updated


@router.get("/leaderboard")
def get_leaderboard():
    return store.leaderboard()
