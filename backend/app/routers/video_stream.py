import os
import time
import urllib.parse

import cv2
from dotenv import load_dotenv
from fastapi import APIRouter, HTTPException
from fastapi.responses import StreamingResponse


load_dotenv()

router = APIRouter(
    prefix="/api/stream",
    tags=["Live Video Stream"],
)


def build_rtsp_url(camera_id: str) -> str:
    email = os.getenv("CCTV_EMAIL")
    password = os.getenv("CCTV_PASSWORD")

    if not email or not password:
        raise RuntimeError(
            "CCTV_EMAIL or CCTV_PASSWORD environment variable is missing"
        )

    encoded_email = urllib.parse.quote(
        email,
        safe=""
    )

    encoded_password = urllib.parse.quote(
        password,
        safe=""
    )

    return (
        f"rtsp://{encoded_email}:{encoded_password}"
        f"@103.250.160.189:8554/stream/{camera_id}"
    )


def generate_frames(camera_id: str):
    rtsp_url = build_rtsp_url(camera_id)

    os.environ[
        "OPENCV_FFMPEG_CAPTURE_OPTIONS"
    ] = "rtsp_transport;tcp"

    cap = cv2.VideoCapture(
        rtsp_url,
        cv2.CAP_FFMPEG,
    )

    if not cap.isOpened():
        print(
            f"Failed to open RTSP stream: {camera_id}"
        )
        return

    print(
        f"Live video stream connected: {camera_id}"
    )

    try:
        while True:
            success, frame = cap.read()

            if not success:
                print(
                    "Failed to read frame. Retrying..."
                )
                time.sleep(1)
                continue

            success, buffer = cv2.imencode(
                ".jpg",
                frame
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

    finally:
        cap.release()

        print(
            f"Live video stream stopped: {camera_id}"
        )


@router.get("/{camera_id}")
def live_camera_stream(camera_id: str):

    if camera_id != "cam04":
        raise HTTPException(
            status_code=404,
            detail="Camera stream not available",
        )

    return StreamingResponse(
        generate_frames(camera_id),
        media_type=(
            "multipart/x-mixed-replace; "
            "boundary=frame"
        ),
    )
