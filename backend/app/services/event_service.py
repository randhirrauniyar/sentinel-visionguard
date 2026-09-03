from app.models.event import SecurityEvent

EVENTS: list[SecurityEvent] = []


def create_event(event: SecurityEvent) -> SecurityEvent:
    EVENTS.append(event)
    return event


def get_events() -> list[SecurityEvent]:
    return EVENTS


def get_events_by_camera(camera_id: str) -> list[SecurityEvent]:
    return [
        event
        for event in EVENTS
        if event.camera_id == camera_id
    ]


def has_active_event(
    camera_id: str,
    event_type: str
) -> bool:
    """
    Check whether an event of the same type already exists
    for the specified camera.
    """

    return any(
        event.camera_id == camera_id
        and event.event_type == event_type
        for event in EVENTS
    )
