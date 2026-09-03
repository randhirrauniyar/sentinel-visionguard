from typing import Any
from app.models.camera import Camera


def normalize_camera(data: dict[str, Any]) -> Camera:
    """
    Converts external camera catalogue data into our
    standard Sentinel VisionGuard Camera model.
    """

    return Camera(
        id=str(data.get("id") or data.get("camera_id") or data.get("cameraId")),
        location=data.get("location") or data.get("name"),
        codec=data.get("codec"),
        live=bool(data.get("live", False)),

        rtsp_url=data.get("rtsp_url") or data.get("rtsp"),
        whep_url=data.get("whep_url") or data.get("webrtc_url"),
        hls_url=data.get("hls_url") or data.get("hls"),

        resolution=data.get("resolution"),
        properties=data
    )
