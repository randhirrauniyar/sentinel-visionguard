from pydantic import BaseModel
from typing import Optional
from datetime import datetime


class CameraHealth(BaseModel):
    camera_id: str
    status: str
    checked_at: datetime
    message: Optional[str] = None
