from fastapi import APIRouter

from app.database.camera_db import get_all_cameras

from app.services.alert_service import (
    create_camera_offline_alert,
    create_camera_recovery_event,
)

from app.services.camera_state_service import (
    get_camera_state,
    update_camera_state,
    get_all_camera_states,
)

from app.services.event_service import get_events


router = APIRouter(
    prefix="/api/alerts",
    tags=["Alerts"],
)


@router.get("/")
async def get_alert_summary():

    events = get_events()

    alert_events = [
        event
        for event in events
        if event.event_type
        in {
            "camera_offline",
            "camera_recovered",
            "vehicle_activity_warning",
            "vehicle_activity_high",
        }
    ]

    offline_alerts = [
        event
        for event in alert_events
        if event.event_type == "camera_offline"
    ]

    recovered_events = [
        event
        for event in alert_events
        if event.event_type == "camera_recovered"
    ]

    vehicle_alerts = [
        event
        for event in alert_events
        if event.event_type
        in {
            "vehicle_activity_warning",
            "vehicle_activity_high",
        }
    ]

    high_severity = [
        event
        for event in alert_events
        if event.severity == "high"
    ]

    medium_severity = [
        event
        for event in alert_events
        if event.severity == "medium"
    ]

    low_severity = [
        event
        for event in alert_events
        if event.severity == "low"
    ]

    return {
        "status": "success",
        "total_alert_events": len(alert_events),
        "camera_offline_alerts": len(offline_alerts),
        "camera_recovery_events": len(recovered_events),
        "vehicle_alerts": len(vehicle_alerts),
        "high_severity": len(high_severity),
        "medium_severity": len(medium_severity),
        "low_severity": len(low_severity),
        "recent_alerts": [
            event.model_dump(mode="json")
            for event in alert_events[-10:]
        ],
    }


@router.get("/active")
async def get_active_alerts():

    events = get_events()

    active_alerts = [
        event
        for event in events
        if event.event_type
        in {
            "camera_offline",
            "vehicle_activity_warning",
            "vehicle_activity_high",
        }
    ]

    return {
        "status": "success",
        "active_alert_count": len(active_alerts),
        "alerts": [
            event.model_dump(mode="json")
            for event in active_alerts
        ],
    }


@router.post("/scan-offline-cameras")
async def scan_offline_cameras():

    cameras = get_all_cameras()

    created_alerts = []
    duplicates_skipped = 0

    for camera in cameras:

        camera["live"] = bool(camera["live"])

        if not camera["live"]:

            event = create_camera_offline_alert(
                camera
            )

            if event:

                created_alerts.append(
                    event.model_dump(mode="json")
                )

            else:

                duplicates_skipped += 1

    offline_cameras_found = sum(
        1
        for camera in cameras
        if not bool(camera["live"])
    )

    return {
        "status": "scan_complete",
        "source": "sqlite_database",
        "offline_cameras_found": offline_cameras_found,
        "alerts_created": len(created_alerts),
        "duplicates_skipped": duplicates_skipped,
        "alerts": created_alerts,
    }


@router.post("/scan-camera-states")
async def scan_camera_states():

    cameras = get_all_cameras()

    created_events = []
    unchanged = 0
    initialized = 0

    for camera in cameras:

        camera_id = str(
            camera["id"]
        ).upper()

        current_state = bool(
            camera["live"]
        )

        previous_state = get_camera_state(
            camera_id
        )

        # First scan:
        # Store the current state as baseline.
        if previous_state is None:

            update_camera_state(
                camera_id,
                current_state,
            )

            initialized += 1
            continue

        # ONLINE -> OFFLINE
        if (
            previous_state is True
            and current_state is False
        ):

            event = create_camera_offline_alert(
                camera
            )

            if event:

                created_events.append(
                    event.model_dump(mode="json")
                )

        # OFFLINE -> ONLINE
        elif (
            previous_state is False
            and current_state is True
        ):

            event = create_camera_recovery_event(
                camera
            )

            if event:

                created_events.append(
                    event.model_dump(mode="json")
                )

        else:

            unchanged += 1

        # Always save latest state.
        update_camera_state(
            camera_id,
            current_state,
        )

    return {
        "status": "scan_complete",
        "source": "sqlite_database",
        "initialized": initialized,
        "unchanged": unchanged,
        "events_created": len(created_events),
        "events": created_events,
        "current_states": get_all_camera_states(),
    }
