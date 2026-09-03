from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from datetime import datetime, timezone
import random
import uuid

from app.database.camera_db import get_camera_by_id, update_camera
from app.models.event import SecurityEvent
from app.services.event_service import (
    create_event,
    has_active_event,
)


router = APIRouter(
    prefix="/api/simulation",
    tags=["Simulation"]
)


class CameraStateUpdate(BaseModel):
    live: bool


DETECTION_TYPES = [
    {
        "type": "person",
        "label": "Person Detected",
        "risk_level": "low"
    },
    {
        "type": "vehicle",
        "label": "Vehicle Detected",
        "risk_level": "low"
    },
    {
        "type": "crowd",
        "label": "Crowd Detected",
        "risk_level": "medium"
    },
    {
        "type": "restricted_area_intrusion",
        "label": "Restricted Area Intrusion",
        "risk_level": "high"
    },
    {
        "type": "suspicious_activity",
        "label": "Suspicious Activity Detected",
        "risk_level": "high"
    }
]


@router.put("/cameras/{camera_id}/state")
async def update_camera_live_state(
    camera_id: str,
    update: CameraStateUpdate
):
    camera = get_camera_by_id(camera_id)

    if not camera:
        raise HTTPException(
            status_code=404,
            detail="Camera not found"
        )

    update_camera(
        camera_id,
        {
            "live": update.live
        }
    )

    return {
        "status": "updated",
        "camera_id": camera_id,
        "live": update.live
    }


@router.post("/analyze/{camera_id}")
async def analyze_camera(camera_id: str):
    camera = get_camera_by_id(camera_id)

    if not camera:
        raise HTTPException(
            status_code=404,
            detail=f"Camera {camera_id} not found"
        )

    if not bool(camera["live"]):
        raise HTTPException(
            status_code=400,
            detail=f"Camera {camera_id} is offline and cannot be analyzed"
        )

    detection_count = random.randint(1, 3)

    selected_detections = random.sample(
        DETECTION_TYPES,
        detection_count
    )

    detections = []
    created_events = []

    analysis_time = datetime.now(timezone.utc)

    for detection in selected_detections:
        confidence = round(
            random.uniform(0.72, 0.99),
            2
        )

        detection_result = {
            "type": detection["type"],
            "label": detection["label"],
            "confidence": confidence,
            "risk_level": detection["risk_level"]
        }

        detections.append(detection_result)

        # Prevent duplicate events for the same
        # camera and detection type.
        if not has_active_event(
            camera_id,
            detection["type"]
        ):
            event = SecurityEvent(
                event_id=str(uuid.uuid4()),
                event_type=detection["type"],
                severity=detection["risk_level"],
                camera_id=camera["id"],
                location=camera["location"],
                timestamp=analysis_time,
                description=(
                    f"{detection['label']} detected "
                    f"with {confidence * 100:.0f}% confidence"
                ),
                metadata={
                    "source": "visionguard_ai_simulation",
                    "model": "VisionGuard AI Simulation Engine",
                    "model_version": "1.0",
                    "confidence": confidence
                }
            )

            create_event(event)

            created_events.append(
                event.model_dump(mode="json")
            )

    high_risk_detected = any(
        detection["risk_level"] == "high"
        for detection in detections
    )

    return {
        "status": "analysis_complete",
        "camera": {
            "id": camera["id"],
            "location": camera["location"],
            "department": camera["department"]
        },
        "analysis_timestamp": analysis_time.isoformat(),
        "model": {
            "name": "VisionGuard AI Simulation Engine",
            "version": "1.0"
        },
        "detections": detections,
        "events_created": created_events,
        "summary": {
            "total_detections": len(detections),
            "events_created": len(created_events),
            "high_risk_detected": high_risk_detected
        }
    }
