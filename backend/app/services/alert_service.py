from datetime import datetime, timezone
import uuid

from app.models.event import SecurityEvent

from app.services.event_service import (
    create_event,
    has_active_event,
)


def create_camera_offline_alert(camera: dict):
    """
    Create an alert when a camera becomes offline.

    Duplicate active offline alerts for the same
    camera are prevented.
    """

    camera_id = str(camera.get("id"))

    if has_active_event(
        camera_id=camera_id,
        event_type="camera_offline",
    ):
        return None

    event = SecurityEvent(
        event_id=str(uuid.uuid4()),
        event_type="camera_offline",
        severity="medium",
        camera_id=camera_id,
        location=camera.get("location"),
        timestamp=datetime.now(timezone.utc),
        description=(
            "Camera is currently offline and "
            "requires attention"
        ),
        metadata={
            "source": "camera_health_monitor",
            "department": camera.get("department"),
            "camera_status": "offline",
        },
    )

    return create_event(event)


def create_camera_recovery_event(camera: dict):
    """
    Create an event when a previously offline
    camera becomes operational again.
    """

    camera_id = str(camera.get("id"))

    event = SecurityEvent(
        event_id=str(uuid.uuid4()),
        event_type="camera_recovered",
        severity="low",
        camera_id=camera_id,
        location=camera.get("location"),
        timestamp=datetime.now(timezone.utc),
        description=(
            "Camera has recovered and is now online"
        ),
        metadata={
            "source": "camera_health_monitor",
            "department": camera.get("department"),
            "camera_status": "online",
        },
    )

    return create_event(event)


def create_vehicle_alert(
    camera_id: str,
    location: str,
    severity: str,
    vehicle_count: int,
    vehicles: list,
):
    """
    Create an alert for significant vehicle activity.

    Low-severity detections are not converted into
    separate alerts to reduce unnecessary alert noise.
    """

    if severity == "low":
        return None

    event_type = (
        "vehicle_activity_high"
        if severity == "high"
        else "vehicle_activity_warning"
    )

    description = (
        f"{vehicle_count} vehicle(s) detected "
        f"with {severity} severity"
    )

    event = SecurityEvent(
        event_id=str(uuid.uuid4()),
        event_type=event_type,
        severity=severity,
        camera_id=camera_id,
        location=location,
        timestamp=datetime.now(timezone.utc),
        description=description,
        metadata={
            "source": "yolo_alert_engine",
            "vehicle_count": vehicle_count,
            "vehicles": vehicles,
        },
    )

    return create_event(event)


def get_alert_priority(severity: str) -> int:
    """
    Convert alert severity into a numeric priority.
    Higher values indicate higher priority.
    """

    priorities = {
        "low": 1,
        "medium": 2,
        "high": 3,
    }

    return priorities.get(
        severity.lower(),
        0,
    )
