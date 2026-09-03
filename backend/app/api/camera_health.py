from fastapi import APIRouter

from app.services.mock_camera_catalog import MOCK_CAMERAS
from app.services.camera_health_service import check_camera_health


router = APIRouter(
    prefix="/api/health",
    tags=["Camera Health"]
)


@router.get("/cameras")
async def get_camera_health():
    results = [
        check_camera_health(camera).model_dump(mode="json")
        for camera in MOCK_CAMERAS
    ]

    healthy_count = sum(
        1 for result in results
        if result["status"] == "healthy"
    )

    offline_count = sum(
        1 for result in results
        if result["status"] == "offline"
    )

    return {
        "status": "success",
        "total_cameras": len(results),
        "healthy": healthy_count,
        "offline": offline_count,
        "cameras": results
    }
