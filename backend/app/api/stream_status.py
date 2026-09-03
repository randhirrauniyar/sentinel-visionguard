from fastapi import APIRouter, Query

from app.services.reconnect_manager import get_reconnect_delay


router = APIRouter(
    prefix="/api/stream-status",
    tags=["Stream Status"]
)


@router.get("/reconnect")
async def reconnect_status(
    attempt: int = Query(1, ge=1)
):
    delay = get_reconnect_delay(attempt)

    return {
        "attempt": attempt,
        "recommended_reconnect_delay_seconds": delay,
        "strategy": "exponential_backoff",
        "maximum_delay_seconds": 30.0
    }
