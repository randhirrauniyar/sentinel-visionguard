from pydantic import BaseModel
from typing import Optional


class StreamConfig(BaseModel):
    camera_id: str
    protocol: str
    url: str
    codec: Optional[str] = None
