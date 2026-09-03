from app.models.camera import Camera
from app.models.stream import StreamConfig


def get_best_stream(camera: Camera) -> StreamConfig | None:
    """
    Select the preferred stream for processing.

    Priority:
    RTSP -> HLS -> WHEP
    """

    if camera.rtsp_url:
        return StreamConfig(
            camera_id=camera.id,
            protocol="rtsp_tcp",
            url=camera.rtsp_url,
            codec=camera.codec
        )

    if camera.hls_url:
        return StreamConfig(
            camera_id=camera.id,
            protocol="hls",
            url=camera.hls_url,
            codec=camera.codec
        )

    if camera.whep_url:
        return StreamConfig(
            camera_id=camera.id,
            protocol="whep",
            url=camera.whep_url,
            codec=camera.codec
        )

    return None
