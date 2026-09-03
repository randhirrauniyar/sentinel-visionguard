CAMERA_STATES: dict[str, bool] = {}


def get_camera_state(camera_id: str):
    """
    Return the previously known state of a camera.

    True  = online/live
    False = offline
    None  = unknown/not previously seen
    """

    return CAMERA_STATES.get(camera_id)


def update_camera_state(
    camera_id: str,
    is_live: bool
):
    """
    Store the latest known camera state.
    """

    CAMERA_STATES[camera_id] = is_live


def get_all_camera_states():
    """
    Return all currently tracked camera states.
    """

    return CAMERA_STATES
