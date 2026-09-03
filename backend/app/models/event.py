from pydantic import BaseModel
from typing import Optional, Any
from datetime import datetime


class SecurityEvent(BaseModel):
    event_id: str
    event_type: str
    severity: str

    camera_id: str
    location: Optional[str] = None

    timestamp: datetime

    description: Optional[str] = None
    metadata: Optional[dict[str, Any]] = None
