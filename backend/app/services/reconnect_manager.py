def get_reconnect_delay(
    attempt: int,
    base_delay: float = 2.0,
    max_delay: float = 30.0
) -> float:
    """
    Calculate exponential reconnect delay.

    Starts at approximately 2 seconds and
    caps at 30 seconds.
    """

    if attempt < 1:
        attempt = 1

    delay = base_delay * (2 ** (attempt - 1))

    return min(delay, max_delay)
