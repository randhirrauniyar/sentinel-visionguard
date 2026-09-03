from pydantic import BaseModel
from typing import Optional, Any


class Camera(BaseModel):
    id: str
    location: Optional[str] = None
    codec: Optional[str] = None
    live: bool = False

    rtsp_url: Optional[str] = None
    whep_url: Optional[str] = None
    hls_url: Optional[str] = None

    resolution: Optional[str] = None
    properties: Optional[dict[str, Any]] = None
