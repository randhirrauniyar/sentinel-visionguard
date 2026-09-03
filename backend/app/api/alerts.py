from fastapi import APIRouter

from app.services.mock_camera_catalog import MOCK_CAMERAS
from app.services.alert_service import (
    create_camera_offline_alert,
    create_camera_recovery_event,
)
from app.services.camera_state_service import (
    get_camera_state,
    update_camera_state,
    get_all_camera_states,
)


router = APIRouter(
    prefix="/api/alerts",
    tags=["Alerts"]
)


@router.post("/scan-offline-cameras")
async def scan_offline_cameras():
    created_alerts = []
    duplicates_skipped = 0

    for camera in MOCK_CAMERAS:
        if not camera.get("live", False):
            event = create_camera_offline_alert(camera)

            if event:
                created_alerts.append(event.model_dump(mode="json"))
            else:
                duplicates_skipped += 1

    return {
        "status": "scan_complete",
        "offline_cameras_found": sum(
            1 for camera in MOCK_CAMERAS
            if not camera.get("live", False)
        ),
        "alerts_created": len(created_alerts),
        "duplicates_skipped": duplicates_skipped,
        "alerts": created_alerts
    }


@router.post("/scan-camera-states")
async def scan_camera_states():
    created_events = []
    unchanged = 0
    initialized = 0

    for camera in MOCK_CAMERAS:
        camera_id = str(camera.get("id"))
        current_state = camera.get("live", False)

        previous_state = get_camera_state(camera_id)

        # First scan: store state without generating an alert
        if previous_state is None:
            update_camera_state(camera_id, current_state)
            initialized += 1
            continue

        # Camera changed from ONLINE to OFFLINE
        if previous_state is True and current_state is False:
            event = create_camera_offline_alert(camera)

            if event:
                created_events.append(event.model_dump(mode="json"))

        # Camera changed from OFFLINE to ONLINE
        elif previous_state is False and current_state is True:
            event = create_camera_recovery_event(camera)

            created_events.append(event.model_dump(mode="json"))

        else:
            unchanged += 1

        update_camera_state(camera_id, current_state)

    return {
        "status": "scan_complete",
        "initialized": initialized,
        "unchanged": unchanged,
        "events_created": len(created_events),
        "events": created_events,
        "current_states": get_all_camera_states()
    }
