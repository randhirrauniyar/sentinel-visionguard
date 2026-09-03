from datetime import datetime, timezone

from app.models.camera_health import CameraHealth


def check_camera_health(camera: dict) -> CameraHealth:
    camera_id = str(camera.get("id", "unknown"))
    is_live = camera.get("live", False)

    if is_live:
        return CameraHealth(
            camera_id=camera_id,
            status="healthy",
            checked_at=datetime.now(timezone.utc),
            message="Camera is marked live in the catalogue"
        )

    return CameraHealth(
        camera_id=camera_id,
        status="offline",
        checked_at=datetime.now(timezone.utc),
        message="Camera is not marked live in the catalogue"
    )
