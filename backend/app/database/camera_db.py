import sqlite3
from pathlib import Path

from app.services.mock_camera_catalog import MOCK_CAMERAS

BASE_DIR = Path(__file__).resolve().parent.parent.parent
DB_PATH = BASE_DIR / "sentinel_visionguard.db"


def get_connection():
    connection = sqlite3.connect(DB_PATH)
    connection.row_factory = sqlite3.Row
    return connection


def initialize_database():
    connection = get_connection()
    cursor = connection.cursor()

    cursor.execute("""
        CREATE TABLE IF NOT EXISTS cameras (
            id TEXT PRIMARY KEY,
            location TEXT NOT NULL,
            department TEXT NOT NULL,
            codec TEXT,
            live INTEGER NOT NULL DEFAULT 1,
            resolution TEXT,
            rtsp_url TEXT
        )
    """)

    cursor.execute("SELECT COUNT(*) FROM cameras")
    camera_count = cursor.fetchone()[0]

    if camera_count == 0:
        for camera in MOCK_CAMERAS:
            cursor.execute(
                """
                INSERT INTO cameras (
                    id,
                    location,
                    department,
                    codec,
                    live,
                    resolution,
                    rtsp_url
                )
                VALUES (?, ?, ?, ?, ?, ?, ?)
                """,
                (
                    camera["id"],
                    camera["location"],
                    camera["department"],
                    camera["codec"],
                    int(camera["live"]),
                    camera["resolution"],
                    camera["rtsp_url"],
                ),
            )

    connection.commit()
    connection.close()


def get_all_cameras():
    connection = get_connection()
    cursor = connection.cursor()

    cursor.execute("SELECT * FROM cameras ORDER BY id")
    rows = cursor.fetchall()

    connection.close()

    return [dict(row) for row in rows]


def get_camera_by_id(camera_id: str):
    connection = get_connection()
    cursor = connection.cursor()

    cursor.execute(
        "SELECT * FROM cameras WHERE id = ?",
        (camera_id,),
    )

    row = cursor.fetchone()
    connection.close()

    return dict(row) if row else None


def create_camera(camera: dict):
    connection = get_connection()
    cursor = connection.cursor()

    cursor.execute(
        """
        INSERT INTO cameras (
            id,
            location,
            department,
            codec,
            live,
            resolution,
            rtsp_url
        )
        VALUES (?, ?, ?, ?, ?, ?, ?)
        """,
        (
            camera["id"],
            camera["location"],
            camera["department"],
            camera["codec"],
            int(camera["live"]),
            camera["resolution"],
            camera["rtsp_url"],
        ),
    )

    connection.commit()
    connection.close()


def update_camera(camera_id: str, updates: dict):
    if not updates:
        return

    allowed_fields = {
        "location",
        "department",
        "codec",
        "live",
        "resolution",
        "rtsp_url",
    }

    updates = {
        key: value
        for key, value in updates.items()
        if key in allowed_fields
    }

    if not updates:
        return

    if "live" in updates:
        updates["live"] = int(updates["live"])

    fields = ", ".join(
        f"{field} = ?"
        for field in updates
    )

    values = list(updates.values())
    values.append(camera_id)

    connection = get_connection()
    cursor = connection.cursor()

    cursor.execute(
        f"UPDATE cameras SET {fields} WHERE id = ?",
        values,
    )

    connection.commit()
    connection.close()


def delete_camera(camera_id: str):
    connection = get_connection()
    cursor = connection.cursor()

    cursor.execute(
        "DELETE FROM cameras WHERE id = ?",
        (camera_id,),
    )

    connection.commit()
    connection.close()
