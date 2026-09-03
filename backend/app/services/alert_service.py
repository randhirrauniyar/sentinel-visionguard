from datetime import datetime, timezone
import uuid

from app.models.event import SecurityEvent
from app.services.event_service import (
    create_event,
    has_active_event,
)


def create_camera_offline_alert(camera: dict):
    camera_id = str(camera.get("id"))

    if has_active_event(
        camera_id=camera_id,
        event_type="camera_offline"
    ):
        return None

    event = SecurityEvent(
        event_id=str(uuid.uuid4()),
        event_type="camera_offline",
        severity="medium",
        camera_id=camera_id,
        location=camera.get("location"),
        timestamp=datetime.now(timezone.utc),
        description="Camera is currently offline",
        metadata={
            "source": "camera_health_monitor",
            "department": camera.get("department")
        }
    )

    return create_event(event)


def create_camera_recovery_event(camera: dict):
    """
    Create an event when a previously offline camera
    becomes live again.
    """

    camera_id = str(camera.get("id"))

    event = SecurityEvent(
        event_id=str(uuid.uuid4()),
        event_type="camera_recovered",
        severity="low",
        camera_id=camera_id,
        location=camera.get("location"),
        timestamp=datetime.now(timezone.utc),
        description="Camera has recovered and is online",
        metadata={
            "source": "camera_health_monitor",
            "department": camera.get("department")
        }
    )

    return create_event(event)
