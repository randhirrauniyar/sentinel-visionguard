from fastapi import APIRouter, HTTPException

from app.services.mock_camera_catalog import MOCK_CAMERAS
from app.services.camera_normalizer import normalize_camera
from app.services.stream_manager import get_best_stream


router = APIRouter(
    prefix="/api/streams",
    tags=["Streams"]
)


@router.get("/{camera_id}")
async def get_camera_stream(camera_id: str):
    camera_data = next(
        (
            camera
            for camera in MOCK_CAMERAS
            if camera["id"] == camera_id
        ),
        None
    )

    if not camera_data:
        raise HTTPException(
            status_code=404,
            detail="Camera not found"
        )

    camera = normalize_camera(camera_data)
    stream = get_best_stream(camera)

    if not stream:
        raise HTTPException(
            status_code=404,
            detail="No stream available for this camera"
        )

    return {
        "status": "success",
        "stream": stream.model_dump()
    }
