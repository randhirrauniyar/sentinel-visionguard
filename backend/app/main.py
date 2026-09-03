from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.database.camera_db import initialize_database

from app.api.simulation import router as simulation_router
from app.api.cameras import router as cameras_router
from app.api.camera_health import router as camera_health_router
from app.api.streams import router as streams_router
from app.api.stream_status import router as stream_status_router
from app.api.events import router as events_router
from app.api.alerts import router as alerts_router


app = FastAPI(
    title="Sentinel VisionGuard API",
    description="Secure CCTV Integration and AI Analytics Platform",
    version="0.2.0"
)


@app.on_event("startup")
def startup_event():
    initialize_database()


app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173",
        "http://127.0.0.1:5173",
        "http://localhost:5174",
        "http://127.0.0.1:5174",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


app.include_router(cameras_router)
app.include_router(camera_health_router)
app.include_router(streams_router)
app.include_router(stream_status_router)
app.include_router(events_router)
app.include_router(alerts_router)
app.include_router(simulation_router)


@app.get("/")
def root():
    return {
        "status": "online",
        "service": "Sentinel VisionGuard API"
    }


@app.get("/health")
def health():
    return {
        "status": "healthy"
    }
