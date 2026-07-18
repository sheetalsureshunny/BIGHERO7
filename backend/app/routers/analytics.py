from fastapi import APIRouter

from ..services import analytics

router = APIRouter(prefix="/api/analytics", tags=["analytics"])


@router.get("/predictions")
def predictions():
    return analytics.predict()
