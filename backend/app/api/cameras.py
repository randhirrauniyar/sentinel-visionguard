from fastapi import APIRouter, HTTPException, Query
from pydantic import BaseModel, Field
from typing import Optional
import re

from app.core.config import settings
from app.services.camera_catalog import fetch_camera_catalog
from app.services.camera_normalizer import normalize_camera

from app.database.camera_db import (
    get_all_cameras,
    get_camera_by_id,
    create_camera as db_create_camera,
    update_camera as db_update_camera,
    delete_camera as db_delete_camera,
)


router = APIRouter(
    prefix="/api/cameras",
    tags=["Cameras"]
)


class CameraCreate(BaseModel):
    id: str = Field(..., min_length=3)
    location: str = Field(..., min_length=3)
    department: str = Field(..., min_length=2)
    codec: str = "H264"
    live: bool = True
    resolution: str = "1920x1080"
    rtsp_url: str


class CameraUpdate(BaseModel):
    location: Optional[str] = None
    department: Optional[str] = None
    codec: Optional[str] = None
    live: Optional[bool] = None
    resolution: Optional[str] = None
    rtsp_url: Optional[str] = None


@router.get("/")
async def list_cameras():
    if not settings.sentinel_base_url:
        return {
            "status": "waiting_for_sentinel_sandbox",
            "message": "Sentinel sandbox URL is not configured yet"
        }

    try:
        catalog = await fetch_camera_catalog(
            settings.sentinel_base_url
        )

        cameras_data = catalog.get("cameras", catalog)

        if not isinstance(cameras_data, list):
            cameras_data = []

        cameras = [
            normalize_camera(camera).model_dump()
            for camera in cameras_data
        ]

        return {
            "status": "success",
            "count": len(cameras),
            "cameras": cameras
        }

    except Exception as e:
        raise HTTPException(
            status_code=502,
            detail=f"Unable to fetch Sentinel camera catalogue: {str(e)}"
        )


@router.get("/mock")
async def list_mock_cameras(
    live: Optional[bool] = Query(None),
    codec: Optional[str] = Query(None),
    department: Optional[str] = Query(None),
    search: Optional[str] = Query(None)
):
    cameras = get_all_cameras()

    filtered = cameras

    if live is not None:
        filtered = [
            camera for camera in filtered
            if bool(camera["live"]) == live
        ]

    if codec:
        filtered = [
            camera for camera in filtered
            if camera["codec"]
            and camera["codec"].lower() == codec.lower()
        ]

    if department:
        filtered = [
            camera for camera in filtered
            if camera["department"].lower() == department.lower()
        ]

    if search:
        search = search.lower()

        filtered = [
            camera for camera in filtered
            if search in camera["location"].lower()
            or search in camera["id"].lower()
            or search in camera["department"].lower()
        ]

    normalized_cameras = []

    for camera in filtered:
        camera_data = {
            "id": camera["id"],
            "location": camera["location"],
            "department": camera["department"],
            "codec": camera["codec"],
            "live": bool(camera["live"]),
            "resolution": camera["resolution"],
            "rtsp_url": camera["rtsp_url"]
        }

        normalized_cameras.append(
            normalize_camera(camera_data).model_dump()
        )

    return {
        "status": "success",
        "source": "sqlite_database",
        "count": len(normalized_cameras),
        "cameras": normalized_cameras
    }


@router.get("/mock/{camera_id}")
async def get_camera(camera_id: str):
    camera = get_camera_by_id(camera_id.upper())

    if not camera:
        raise HTTPException(
            status_code=404,
            detail=f"Camera {camera_id} not found"
        )

    camera_data = {
        "id": camera["id"],
        "location": camera["location"],
        "department": camera["department"],
        "codec": camera["codec"],
        "live": bool(camera["live"]),
        "resolution": camera["resolution"],
        "rtsp_url": camera["rtsp_url"]
    }

    return {
        "status": "success",
        "camera": normalize_camera(camera_data).model_dump()
    }


@router.post("/mock")
async def create_camera(camera: CameraCreate):
    camera_id = camera.id.upper()

    if not re.match(r"^[A-Z0-9_-]+$", camera_id):
        raise HTTPException(
            status_code=400,
            detail="Camera ID may only contain letters, numbers, hyphens, and underscores"
        )

    existing = get_camera_by_id(camera_id)

    if existing:
        raise HTTPException(
            status_code=409,
            detail=f"Camera ID {camera_id} already exists"
        )

    new_camera = {
        "id": camera_id,
        "location": camera.location,
        "department": camera.department,
        "codec": camera.codec.upper(),
        "live": camera.live,
        "resolution": camera.resolution,
        "rtsp_url": camera.rtsp_url
    }

    db_create_camera(new_camera)

    return {
        "status": "created",
        "camera": normalize_camera(new_camera).model_dump()
    }


@router.put("/mock/{camera_id}")
async def update_camera(
    camera_id: str,
    updates: CameraUpdate
):
    camera_id = camera_id.upper()

    camera = get_camera_by_id(camera_id)

    if not camera:
        raise HTTPException(
            status_code=404,
            detail=f"Camera {camera_id} not found"
        )

    update_data = updates.model_dump(exclude_unset=True)

    if "codec" in update_data and update_data["codec"]:
        update_data["codec"] = update_data["codec"].upper()

    db_update_camera(camera_id, update_data)

    updated_camera = get_camera_by_id(camera_id)

    camera_data = {
        "id": updated_camera["id"],
        "location": updated_camera["location"],
        "department": updated_camera["department"],
        "codec": updated_camera["codec"],
        "live": bool(updated_camera["live"]),
        "resolution": updated_camera["resolution"],
        "rtsp_url": updated_camera["rtsp_url"]
    }

    return {
        "status": "updated",
        "camera": normalize_camera(camera_data).model_dump()
    }


@router.delete("/mock/{camera_id}")
async def delete_camera(camera_id: str):
    camera_id = camera_id.upper()

    camera = get_camera_by_id(camera_id)

    if not camera:
        raise HTTPException(
            status_code=404,
            detail=f"Camera {camera_id} not found"
        )

    db_delete_camera(camera_id)

    return {
        "status": "deleted",
        "camera_id": camera_id
    }
