import os
import time
import uuid
import threading
import urllib.parse
from datetime import datetime, timezone

import cv2
from dotenv import load_dotenv
from ultralytics import YOLO

from app.models.event import SecurityEvent
from app.services.event_service import create_event
from app.services.alert_service import create_vehicle_alert


load_dotenv()


class VehicleDetectionService:

    def __init__(self):

        self.running = False
        self.thread = None

        self.camera_id = None
        self.camera_name = None

        self.frames_processed = 0
        self.last_detection = None
        self.last_error = None

        self.model = None

        self.vehicle_classes = {
            "car",
            "motorcycle",
            "bus",
            "truck",
        }

        self.confidence_threshold = 0.50
        self.frame_skip = 10

        # Prevent event flooding
        self.event_cooldown_seconds = 15
        self.last_event_time = {}

        # Latest AI annotated frame
        self.latest_frame = None

        # Thread lock
        self.frame_lock = threading.Lock()

        # =====================================
        # REAL-TIME DETECTION STATISTICS
        # =====================================

        self.current_vehicle_count = 0

        self.total_detections = 0

        self.vehicle_counts = {
            "car": 0,
            "motorcycle": 0,
            "bus": 0,
            "truck": 0,
        }

        self.current_vehicle_types = {
            "car": 0,
            "motorcycle": 0,
            "bus": 0,
            "truck": 0,
        }

        self.confidence_sum = 0.0
        self.confidence_samples = 0

        self.session_start_time = None

        self.last_frame_time = None
        self.current_fps = 0.0


    def _build_rtsp_url(
        self,
        camera_stream_id: str,
    ) -> str:

        email = os.getenv("CCTV_EMAIL")
        password = os.getenv("CCTV_PASSWORD")

        if not email or not password:
            raise RuntimeError(
                "CCTV_EMAIL or CCTV_PASSWORD environment variable is missing"
            )

        encoded_email = urllib.parse.quote(
            email,
            safe="",
        )

        encoded_password = urllib.parse.quote(
            password,
            safe="",
        )

        return (
            f"rtsp://{encoded_email}:{encoded_password}"
            f"@103.250.160.189:8554/stream/{camera_stream_id}"
        )


    def _calculate_severity(
        self,
        vehicle_count: int,
    ) -> str:

        if vehicle_count >= 6:
            return "high"

        if vehicle_count >= 3:
            return "medium"

        return "low"


    def _can_create_event(
        self,
        camera_id: str,
    ) -> bool:

        now = time.time()

        last_time = self.last_event_time.get(
            camera_id
        )

        if last_time is None:
            return True

        return (
            now - last_time
            >= self.event_cooldown_seconds
        )


    def start(
        self,
        camera_id: str = "cam04",
        camera_name: str = "04 Paldi Circle",
    ):

        if self.running:
            return False

        camera_id = camera_id.lower()

        self.camera_id = camera_id
        self.camera_name = camera_name

        self.frames_processed = 0
        self.last_detection = None
        self.last_error = None

        # Reset statistics
        self.current_vehicle_count = 0
        self.total_detections = 0

        self.vehicle_counts = {
            "car": 0,
            "motorcycle": 0,
            "bus": 0,
            "truck": 0,
        }

        self.current_vehicle_types = {
            "car": 0,
            "motorcycle": 0,
            "bus": 0,
            "truck": 0,
        }

        self.confidence_sum = 0.0
        self.confidence_samples = 0

        self.session_start_time = time.time()
        self.last_frame_time = None
        self.current_fps = 0.0

        with self.frame_lock:
            self.latest_frame = None

        self.running = True

        self.thread = threading.Thread(
            target=self._run,
            daemon=True,
        )

        self.thread.start()

        return True


    def stop(self):

        self.running = False


    def status(self):

        average_confidence = 0.0

        if self.confidence_samples > 0:
            average_confidence = (
                self.confidence_sum
                / self.confidence_samples
            )

        session_duration = 0

        if self.session_start_time:
            session_duration = int(
                time.time()
                - self.session_start_time
            )

        return {
            "running": self.running,

            "camera_id": self.camera_id,

            "camera_name": self.camera_name,

            "frames_processed": self.frames_processed,

            "last_detection": self.last_detection,

            "last_error": self.last_error,

            "event_cooldown_seconds":
                self.event_cooldown_seconds,

            # =============================
            # DETECTION STATISTICS
            # =============================

            "current_vehicle_count":
                self.current_vehicle_count,

            "current_vehicle_types":
                self.current_vehicle_types,

            "total_detections":
                self.total_detections,

            "vehicle_counts":
                self.vehicle_counts,

            "average_confidence":
                round(
                    average_confidence * 100,
                    1,
                ),

            "current_fps":
                round(
                    self.current_fps,
                    1,
                ),

            "session_duration_seconds":
                session_duration,
        }


    def get_latest_frame(self):

        with self.frame_lock:

            if self.latest_frame is None:
                return None

            return self.latest_frame.copy()


    def _run(self):

        cap = None

        try:

            print("Loading YOLO model...")

            self.model = YOLO(
                "yolo11n.pt"
            )

            os.environ[
                "OPENCV_FFMPEG_CAPTURE_OPTIONS"
            ] = "rtsp_transport;tcp"

            rtsp_url = self._build_rtsp_url(
                self.camera_id
            )

            print(
                f"Connecting to CCTV camera: "
                f"{self.camera_id}"
            )

            cap = cv2.VideoCapture(
                rtsp_url,
                cv2.CAP_FFMPEG,
            )

            if not cap.isOpened():

                raise RuntimeError(
                    "Could not connect to CCTV feed"
                )

            print(
                "CCTV connected. AI detection started."
            )

            frame_number = 0

            while self.running:

                ok, frame = cap.read()

                if not ok:

                    self.last_error = (
                        "Failed to read frame from CCTV"
                    )

                    time.sleep(2)

                    continue

                # =============================
                # FPS CALCULATION
                # =============================

                now = time.time()

                if self.last_frame_time is not None:

                    frame_time = (
                        now
                        - self.last_frame_time
                    )

                    if frame_time > 0:

                        self.current_fps = (
                            1 / frame_time
                        )

                self.last_frame_time = now

                frame_number += 1
                self.frames_processed += 1

                # Copy frame
                annotated_frame = frame.copy()

                # Run YOLO every N frames
                if frame_number % self.frame_skip != 0:

                    with self.frame_lock:
                        self.latest_frame = (
                            annotated_frame
                        )

                    continue

                results = self.model(
                    frame,
                    verbose=False,
                )

                detected_vehicles = []

                # Current frame statistics
                current_types = {
                    "car": 0,
                    "motorcycle": 0,
                    "bus": 0,
                    "truck": 0,
                }

                for result in results:

                    for box in result.boxes:

                        confidence = float(
                            box.conf[0]
                        )

                        if (
                            confidence
                            < self.confidence_threshold
                        ):
                            continue

                        class_id = int(
                            box.cls[0]
                        )

                        class_name = (
                            self.model.names[class_id]
                        )

                        if (
                            class_name
                            not in self.vehicle_classes
                        ):
                            continue

                        x1, y1, x2, y2 = (
                            box.xyxy[0]
                            .cpu()
                            .numpy()
                            .astype(int)
                        )

                        label = (
                            f"{class_name} "
                            f"{confidence:.0%}"
                        )

                        # Bounding box
                        cv2.rectangle(
                            annotated_frame,
                            (x1, y1),
                            (x2, y2),
                            (0, 255, 0),
                            2,
                        )

                        # Label background
                        cv2.rectangle(
                            annotated_frame,
                            (
                                x1,
                                max(0, y1 - 30),
                            ),
                            (x2, y1),
                            (0, 255, 0),
                            -1,
                        )

                        # Label text
                        cv2.putText(
                            annotated_frame,
                            label,
                            (x1 + 5, y1 - 8),
                            cv2.FONT_HERSHEY_SIMPLEX,
                            0.6,
                            (0, 0, 0),
                            2,
                        )

                        detected_vehicles.append({
                            "type": class_name,
                            "confidence": round(
                                confidence,
                                2,
                            ),
                        })

                        # =============================
                        # UPDATE STATISTICS
                        # =============================

                        current_types[
                            class_name
                        ] += 1

                        self.vehicle_counts[
                            class_name
                        ] += 1

                        self.total_detections += 1

                        self.confidence_sum += (
                            confidence
                        )

                        self.confidence_samples += 1

                # =============================
                # UPDATE CURRENT DETECTION
                # =============================

                self.current_vehicle_count = (
                    len(detected_vehicles)
                )

                self.current_vehicle_types = (
                    current_types
                )

                # =============================
                # AI OVERLAY
                # =============================

                cv2.putText(
                    annotated_frame,
                    "SENTINEL AI ANALYTICS",
                    (20, 35),
                    cv2.FONT_HERSHEY_SIMPLEX,
                    0.8,
                    (0, 255, 0),
                    2,
                )

                cv2.putText(
                    annotated_frame,
                    f"Vehicles: "
                    f"{len(detected_vehicles)}",
                    (20, 70),
                    cv2.FONT_HERSHEY_SIMPLEX,
                    0.7,
                    (0, 255, 0),
                    2,
                )

                cv2.putText(
                    annotated_frame,
                    f"FPS: "
                    f"{self.current_fps:.1f}",
                    (20, 105),
                    cv2.FONT_HERSHEY_SIMPLEX,
                    0.7,
                    (0, 255, 0),
                    2,
                )

                # Save latest frame
                with self.frame_lock:
                    self.latest_frame = (
                        annotated_frame
                    )

                # No vehicles
                if not detected_vehicles:
                    continue

                timestamp = datetime.now(
                    timezone.utc
                )

                vehicle_count = len(
                    detected_vehicles
                )

                severity = (
                    self._calculate_severity(
                        vehicle_count
                    )
                )

                # Update live detection status
                self.last_detection = {
                    "event_type":
                        "vehicle_detected",

                    "severity":
                        severity,

                    "camera_id":
                        self.camera_id,

                    "location":
                        self.camera_name,

                    "timestamp":
                        timestamp.isoformat(),

                    "description": (
                        f"{vehicle_count} vehicle(s) "
                        "currently detected by YOLO AI"
                    ),

                    "metadata": {
                        "source":
                            "real_rtsp_yolo",

                        "vehicles":
                            detected_vehicles,

                        "frame_number":
                            frame_number,
                    },
                }

                # Prevent event flooding
                if not self._can_create_event(
                    self.camera_id
                ):
                    continue

                # Create security event
                event = SecurityEvent(
                    event_id=str(uuid.uuid4()),

                    event_type="vehicle_detected",

                    severity=severity,

                    camera_id=self.camera_id,

                    location=self.camera_name,

                    timestamp=timestamp,

                    description=(
                        f"{vehicle_count} "
                        "vehicle(s) detected by YOLO AI"
                    ),

                    metadata={
                        "source":
                            "real_rtsp_yolo",

                        "vehicles":
                            detected_vehicles,

                        "frame_number":
                            frame_number,
                    },
                )

                create_event(event)

                self.last_event_time[
                    self.camera_id
                ] = time.time()

                self.last_detection = (
                    event.model_dump(
                        mode="json"
                    )
                )

                print(
                    f"EVENT CREATED "
                    f"[{severity.upper()}] → "
                    f"{vehicle_count} vehicle(s)"
                )

                # Create alert
                alert = create_vehicle_alert(
                    camera_id=self.camera_id,

                    location=self.camera_name,

                    severity=severity,

                    vehicle_count=vehicle_count,

                    vehicles=detected_vehicles,
                )

                if alert:

                    print(
                        f"ALERT CREATED "
                        f"[{severity.upper()}]"
                    )

        except Exception as error:

            self.last_error = str(error)

            self.running = False

            print(
                f"Vehicle detection error: {error}"
            )

        finally:

            if cap is not None:
                cap.release()

            self.running = False

            print(
                "Vehicle detection stopped."
            )


vehicle_detection_service = (
    VehicleDetectionService()
)
