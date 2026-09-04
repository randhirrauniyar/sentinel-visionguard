import time

import cv2
from fastapi import APIRouter
from fastapi.responses import StreamingResponse

from app.services.vehicle_detection_service import (
    vehicle_detection_service,
)


router = APIRouter(
    prefix="/api/analytics",
    tags=["Real-Time AI Analytics"],
)


@router.post("/start")
def start_vehicle_detection(
    camera_id: str = "cam04",
    camera_name: str = "04 Paldi Circle",
):
    started = vehicle_detection_service.start(
        camera_id=camera_id,
        camera_name=camera_name,
    )

    if not started:
        return {
            "status": "already_running",
            "message": (
                "Vehicle detection is already running"
            ),
        }

    return {
        "status": "started",
        "message": (
            "Real-time YOLO vehicle detection started"
        ),
        "camera_id": camera_id,
        "camera_name": camera_name,
    }


@router.post("/stop")
def stop_vehicle_detection():

    vehicle_detection_service.stop()

    return {
        "status": "stopped",
        "message": (
            "Vehicle detection stop requested"
        ),
    }


@router.get("/status")
def vehicle_detection_status():

    return vehicle_detection_service.status()


def generate_analytics_stream():

    while True:

        frame = (
            vehicle_detection_service
            .get_latest_frame()
        )

        if frame is None:

            time.sleep(0.1)

            continue

        success, buffer = cv2.imencode(
            ".jpg",
            frame,
        )

        if not success:

            continue

        frame_bytes = buffer.tobytes()

        yield (
            b"--frame\r\n"
            b"Content-Type: image/jpeg\r\n\r\n"
            + frame_bytes
            + b"\r\n"
        )

        time.sleep(0.03)


@router.get("/live-feed")
def analytics_live_feed():

    return StreamingResponse(
        generate_analytics_stream(),
        media_type=(
            "multipart/x-mixed-replace; "
            "boundary=frame"
        ),
    )
