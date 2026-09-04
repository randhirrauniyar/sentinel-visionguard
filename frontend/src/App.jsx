import { useEffect, useMemo, useState } from "react";
import "./App.css";

const API_BASE = "";
const STREAM_BASE = `${API_BASE}/api/streams`;
const ANALYTICS_STREAM = `${API_BASE}/api/analytics/live-feed`;

function App() {
  const [activePage, setActivePage] = useState("Dashboard");

  const [cameras, setCameras] = useState([]);
  const [events, setEvents] = useState([]);
  const [alerts, setAlerts] = useState(null);
  const [analyticsStatus, setAnalyticsStatus] = useState(null);

  const [loading, setLoading] = useState(true);
  const [analysisLoading, setAnalysisLoading] = useState(false);
  const [alertsLoading, setAlertsLoading] = useState(false);

  const [error, setError] = useState("");

  const [search, setSearch] = useState("");
  const [department, setDepartment] = useState("");
  const [codec, setCodec] = useState("");

  const [selectedCameraId, setSelectedCameraId] =
    useState("CAM04");

  const [showForm, setShowForm] = useState(false);
  const [editingCamera, setEditingCamera] = useState(null);

  const [formData, setFormData] = useState({
    id: "",
    location: "",
    department: "",
    codec: "H264",
    live: true,
    resolution: "1920x1080",
    rtsp_url: "",
  });

  const loadCameras = async () => {
    try {
      const response = await fetch(
        `${API_BASE}/api/cameras/mock`
      );

      if (!response.ok) {
        throw new Error("Unable to load cameras");
      }

      const data = await response.json();

      setCameras(data.cameras || []);
    } catch (err) {
      console.error(err);
      setError(
        "Unable to load cameras. Make sure backend is running."
      );
    }
  };

  const loadEvents = async () => {
    try {
      const response = await fetch(
        `${API_BASE}/api/events/`
      );

      if (!response.ok) {
        throw new Error("Unable to load events");
      }

      const data = await response.json();

      setEvents(data.events || []);
    } catch (err) {
      console.error(err);
    }
  };

  const loadAlerts = async () => {
    try {
      const response = await fetch(
        `${API_BASE}/api/alerts/`
      );

      if (!response.ok) {
        throw new Error("Unable to load alerts");
      }

      const data = await response.json();

      setAlerts(data);
    } catch (err) {
      console.error(err);
      setError("Unable to load security alerts.");
    }
  };

  const loadAnalyticsStatus = async () => {
    try {
      const response = await fetch(
        `${API_BASE}/api/analytics/status`
      );

      if (!response.ok) {
        return;
      }

      const data = await response.json();

      setAnalyticsStatus(data);
    } catch (err) {
      console.error(err);
    }
  };

  const loadData = async () => {
    setLoading(true);
    setError("");

    await Promise.all([
      loadCameras(),
      loadEvents(),
      loadAlerts(),
      loadAnalyticsStatus(),
    ]);

    setLoading(false);
  };

  useEffect(() => {
    loadData();
  }, []);

  useEffect(() => {
    const interval = setInterval(() => {
      loadCameras();
      loadEvents();
      loadAlerts();
      loadAnalyticsStatus();
    }, 5000);

    return () => clearInterval(interval);
  }, []);

  const departments = useMemo(() => {
    return [
      ...new Set(
        cameras
          .map(
            (camera) =>
              camera.properties?.department ||
              camera.department
          )
          .filter(Boolean)
      ),
    ];
  }, [cameras]);

  const filteredCameras = useMemo(() => {
    return cameras.filter((camera) => {
      const cameraDepartment =
        camera.properties?.department ||
        camera.department ||
        "";

      const matchesSearch =
        camera.id
          .toLowerCase()
          .includes(search.toLowerCase()) ||
        camera.location
          .toLowerCase()
          .includes(search.toLowerCase());

      const matchesDepartment =
        !department ||
        cameraDepartment === department;

      const matchesCodec =
        !codec ||
        camera.codec === codec;

      return (
        matchesSearch &&
        matchesDepartment &&
        matchesCodec
      );
    });
  }, [
    cameras,
    search,
    department,
    codec,
  ]);

  const liveCameras = cameras.filter(
    (camera) => camera.live
  ).length;

  const offlineCameras =
    cameras.length - liveCameras;

  const openAddCamera = () => {
    setEditingCamera(null);

    setFormData({
      id: "",
      location: "",
      department: "",
      codec: "H264",
      live: true,
      resolution: "1920x1080",
      rtsp_url: "",
    });

    setShowForm(true);
  };

  const openEditCamera = (camera) => {
    setEditingCamera(camera);

    setFormData({
      id: camera.id,
      location: camera.location || "",
      department:
        camera.properties?.department ||
        camera.department ||
        "",
      codec: camera.codec || "H264",
      live: Boolean(camera.live),
      resolution:
        camera.resolution ||
        "1920x1080",
      rtsp_url:
        camera.rtsp_url || "",
    });

    setShowForm(true);
  };

  const handleFormChange = (event) => {
    const {
      name,
      value,
      type,
      checked,
    } = event.target;

    setFormData((previous) => ({
      ...previous,
      [name]:
        type === "checkbox"
          ? checked
          : value,
    }));
  };

  const saveCamera = async (event) => {
    event.preventDefault();

    try {
      setError("");

      const url = editingCamera
        ? `${API_BASE}/api/cameras/mock/${editingCamera.id}`
        : `${API_BASE}/api/cameras/mock`;

      const method = editingCamera
        ? "PUT"
        : "POST";

      const payload = editingCamera
        ? {
            location: formData.location,
            department: formData.department,
            codec: formData.codec,
            live: formData.live,
            resolution: formData.resolution,
            rtsp_url: formData.rtsp_url,
          }
        : formData;

      const response = await fetch(url, {
        method,
        headers: {
          "Content-Type":
            "application/json",
        },
        body: JSON.stringify(payload),
      });

      const data =
        await response.json();

      if (!response.ok) {
        throw new Error(
          data.detail ||
            "Unable to save camera"
        );
      }

      setShowForm(false);

      await loadCameras();
      await loadAlerts();
    } catch (err) {
      console.error(err);
      setError(err.message);
    }
  };

  const deleteCamera = async (cameraId) => {
    const confirmed = window.confirm(
      `Delete camera ${cameraId}?`
    );

    if (!confirmed) {
      return;
    }

    try {
      const response = await fetch(
        `${API_BASE}/api/cameras/mock/${cameraId}`,
        {
          method: "DELETE",
        }
      );

      if (!response.ok) {
        throw new Error(
          "Unable to delete camera"
        );
      }

      await loadCameras();
      await loadAlerts();
    } catch (err) {
      console.error(err);
      setError(err.message);
    }
  };

  const startAnalytics = async () => {
    if (!selectedCameraId) {
      setError(
        "Please select a camera first."
      );

      return;
    }

    try {
      setAnalysisLoading(true);
      setError("");

      const selectedCamera = cameras.find(
        (camera) =>
          camera.id === selectedCameraId
      );

      const response = await fetch(
        `${API_BASE}/api/analytics/start?camera_id=${encodeURIComponent(
          selectedCameraId
        )}&camera_name=${encodeURIComponent(
          selectedCamera?.location ||
            selectedCameraId
        )}`,
        {
          method: "POST",
        }
      );

      const data =
        await response.json();

      if (!response.ok) {
        throw new Error(
          data.detail ||
            "Unable to start analytics"
        );
      }

      await loadAnalyticsStatus();
    } catch (err) {
      console.error(err);
      setError(err.message);
    } finally {
      setAnalysisLoading(false);
    }
  };

  const stopAnalytics = async () => {
    try {
      setAnalysisLoading(true);
      setError("");

      const response = await fetch(
        `${API_BASE}/api/analytics/stop`,
        {
          method: "POST",
        }
      );

      const data =
        await response.json();

      if (!response.ok) {
        throw new Error(
          data.detail ||
            "Unable to stop analytics"
        );
      }

      await loadAnalyticsStatus();
      await loadEvents();
      await loadAlerts();
    } catch (err) {
      console.error(err);
      setError(err.message);
    } finally {
      setAnalysisLoading(false);
    }
  };

  const scanCameraStates = async () => {
    try {
      setAlertsLoading(true);
      setError("");

      const response = await fetch(
        `${API_BASE}/api/alerts/scan-camera-states`,
        {
          method: "POST",
        }
      );

      const data =
        await response.json();

      if (!response.ok) {
        throw new Error(
          data.detail ||
            "Camera state scan failed"
        );
      }

      await Promise.all([
        loadCameras(),
        loadEvents(),
        loadAlerts(),
      ]);

      alert(
        `Camera State Scan Complete\n\n` +
          `Events Created: ${
            data.events_created || 0
          }\n` +
          `Initialized: ${
            data.initialized || 0
          }\n` +
          `Unchanged: ${
            data.unchanged || 0
          }`
      );
    } catch (err) {
      console.error(err);

      setError(
        err.message ||
          "Unable to scan camera states."
      );
    } finally {
      setAlertsLoading(false);
    }
  };

  const scanOfflineCameras = async () => {
    try {
      setAlertsLoading(true);
      setError("");

      const response = await fetch(
        `${API_BASE}/api/alerts/scan-offline-cameras`,
        {
          method: "POST",
        }
      );

      const data =
        await response.json();

      if (!response.ok) {
        throw new Error(
          data.detail ||
            "Offline camera scan failed"
        );
      }

      await Promise.all([
        loadCameras(),
        loadEvents(),
        loadAlerts(),
      ]);

      alert(
        `Offline Camera Scan Complete\n\n` +
          `Offline Cameras Found: ${
            data.offline_cameras?.length ||
            data.offline_count ||
            0
          }\n` +
          `Events Created: ${
            data.events_created || 0
          }`
      );
    } catch (err) {
      console.error(err);

      setError(
        err.message ||
          "Unable to scan offline cameras."
      );
    } finally {
      setAlertsLoading(false);
    }
  };

  const renderDashboard = () => (
    <div className="page-panel">
      <div className="stats-grid">
        <div className="stat-card">
          <div className="stat-icon">
            📹
          </div>

          <div>
            <h2>{cameras.length}</h2>
            <p>Total Cameras</p>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-icon live-icon">
            🟢
          </div>

          <div>
            <h2>{liveCameras}</h2>
            <p>Online Cameras</p>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-icon offline-icon">
            🔴
          </div>

          <div>
            <h2>{offlineCameras}</h2>
            <p>Offline Cameras</p>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-icon">
            🚨
          </div>

          <div>
            <h2>
              {alerts?.total_alert_events || 0}
            </h2>

            <p>Total Alerts</p>
          </div>
        </div>
      </div>

      <div className="content-grid">
        <div className="panel">
          <div className="panel-header">
            <div>
              <h2>Camera Overview</h2>

              <p>
                Connected surveillance cameras
              </p>
            </div>

            <span className="badge">
              {cameras.length} Cameras
            </span>
          </div>

          <div className="camera-list">
            {cameras.length === 0 ? (
              <div className="empty-state">
                No cameras available.
              </div>
            ) : (
              cameras.map((camera) => (
                <div
                  className="camera-list-item"
                  key={camera.id}
                >
                  <div>
                    <strong>
                      📹 {camera.id}
                    </strong>

                    <p>
                      {camera.location}
                    </p>
                  </div>

                  <span
                    className={
                      camera.live
                        ? "live-status"
                        : "offline-status"
                    }
                  >
                    {camera.live
                      ? "ONLINE"
                      : "OFFLINE"}
                  </span>
                </div>
              ))
            )}
          </div>
        </div>

        <div className="panel">
          <div className="panel-header">
            <div>
              <h2>Recent Events</h2>

              <p>
                Live security activity
              </p>
            </div>

            <span className="badge">
              {events.length} Events
            </span>
          </div>

          <div className="event-list">
            {events.length === 0 ? (
              <div className="empty-state">
                No security events detected.
              </div>
            ) : (
              events
                .slice(-8)
                .reverse()
                .map((event) => (
                  <div
                    className="event-item"
                    key={event.event_id}
                  >
                    <div
                      className={`event-indicator ${event.severity}`}
                    />

                    <div className="event-content">
                      <strong>
                        {event.event_type.replaceAll(
                          "_",
                          " "
                        )}
                      </strong>

                      <p>
                        {event.description}
                      </p>

                      <p>
                        📍 {event.location}
                      </p>
                    </div>
                  </div>
                ))
            )}
          </div>
        </div>
      </div>
    </div>
  );

  const renderCameras = () => (
    <div className="page-panel">
      <div className="panel-header">
        <div>
          <h2>Camera Management</h2>

          <p>
            Manage connected CCTV cameras
          </p>
        </div>

        <button
          className="primary-button"
          onClick={openAddCamera}
        >
          + Add Camera
        </button>
      </div>

      <div className="filter-row">
        <input
          type="text"
          placeholder="Search camera..."
          value={search}
          onChange={(event) =>
            setSearch(event.target.value)
          }
        />

        <select
          value={department}
          onChange={(event) =>
            setDepartment(event.target.value)
          }
        >
          <option value="">
            All Departments
          </option>

          {departments.map((item) => (
            <option
              key={item}
              value={item}
            >
              {item}
            </option>
          ))}
        </select>

        <select
          value={codec}
          onChange={(event) =>
            setCodec(event.target.value)
          }
        >
          <option value="">
            All Codecs
          </option>

          <option value="H264">
            H264
          </option>

          <option value="H265">
            H265
          </option>
        </select>
      </div>

      <div className="camera-grid">
        {filteredCameras.map((camera) => (
          <div
            className="camera-card"
            key={camera.id}
          >
            <div className="camera-preview">
              <span
                className={
                  camera.live
                    ? "live-status"
                    : "offline-status"
                }
              >
                {camera.live
                  ? "LIVE"
                  : "OFFLINE"}
              </span>

              {camera.id === "CAM04" ? (
                <img
                  src={`${STREAM_BASE}/cam04`}
                  alt="Live CCTV Feed"
                  className="live-camera-feed"
                />
              ) : (
                <div className="camera-placeholder">
                  📹
                </div>
              )}
            </div>

            <div className="camera-info">
              <div className="camera-title-row">
                <h3>{camera.id}</h3>

                <span className="codec-badge">
                  {camera.codec}
                </span>
              </div>

              <p>
                📍 {camera.location}
              </p>

              <p>
                Department:{" "}
                {camera.properties
                  ?.department ||
                  camera.department ||
                  "N/A"}
              </p>

              <div className="camera-actions">
                <button
                  className="edit-button"
                  onClick={() =>
                    openEditCamera(camera)
                  }
                >
                  Edit
                </button>

                <button
                  className="delete-button"
                  onClick={() =>
                    deleteCamera(camera.id)
                  }
                >
                  Delete
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );

  const renderAnalytics = () => (
    <div className="page-panel">
      <div className="panel-header">
        <div>
          <h2>
            Real-Time AI Analytics
          </h2>

          <p>
            YOLO-powered vehicle detection
          </p>
        </div>

        <span
          className={
            analyticsStatus?.running
              ? "status-running"
              : "status-stopped"
          }
        >
          {analyticsStatus?.running
            ? "● RUNNING"
            : "● STOPPED"}
        </span>
      </div>

      <div className="analytics-card">
        <label>
          Select CCTV Camera
        </label>

        <select
          value={selectedCameraId}
          onChange={(event) =>
            setSelectedCameraId(
              event.target.value
            )
          }
        >
          <option value="">
            Select Camera
          </option>

          {cameras.map((camera) => (
            <option
              key={camera.id}
              value={camera.id}
            >
              {camera.id} — {camera.location}
            </option>
          ))}
        </select>

        <div className="analytics-actions">
          <button
            className="primary-button"
            onClick={startAnalytics}
            disabled={
              analysisLoading ||
              analyticsStatus?.running
            }
          >
            {analysisLoading
              ? "Processing..."
              : "▶ Start Detection"}
          </button>

          <button
            className="danger-button"
            onClick={stopAnalytics}
            disabled={
              analysisLoading ||
              !analyticsStatus?.running
            }
          >
            ■ Stop Detection
          </button>
        </div>
      </div>

      {analyticsStatus?.running && (
        <div className="analytics-live-panel">
          <div className="analytics-live-header">
            <div>
              <h3>
                🤖 YOLO AI Live Detection
              </h3>

              <p>
                {analyticsStatus.camera_name ||
                  "Active CCTV Camera"}
              </p>
            </div>

            <span className="live-feed-badge">
              ● AI LIVE
            </span>
          </div>

          <div className="analytics-video-container">
            <img
              src={`${ANALYTICS_STREAM}?t=${Date.now()}`}
              alt="YOLO AI Analytics Feed"
              className="analytics-live-feed"
            />
          </div>
        </div>
      )}

      <div className="stats-grid">
        <div className="stat-card">
          <div className="stat-icon">
            🎞️
          </div>

          <div>
            <h2>
              {analyticsStatus
                ?.frames_processed || 0}
            </h2>

            <p>Frames Processed</p>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-icon">
            🚗
          </div>

          <div>
            <h2>
              {analyticsStatus
                ?.current_vehicle_count || 0}
            </h2>

            <p>Current Vehicles</p>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-icon">
            📊
          </div>

          <div>
            <h2>
              {analyticsStatus
                ?.total_detections || 0}
            </h2>

            <p>Total Detections</p>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-icon">
            ⚡
          </div>

          <div>
            <h2>
              {analyticsStatus
                ?.current_fps || 0}
            </h2>

            <p>Current FPS</p>
          </div>
        </div>
      </div>

      <div className="analytics-grid">
        <div className="analytics-stat">
          <span>
            Active Camera
          </span>

          <strong>
            {analyticsStatus?.camera_name ||
              "None"}
          </strong>
        </div>

        <div className="analytics-stat">
          <span>
            Average Confidence
          </span>

          <strong>
            {analyticsStatus
              ?.average_confidence || 0}%
          </strong>
        </div>

        <div className="analytics-stat">
          <span>
            Session Duration
          </span>

          <strong>
            {analyticsStatus
              ?.session_duration_seconds || 0}s
          </strong>
        </div>

        <div className="analytics-stat">
          <span>
            Event Cooldown
          </span>

          <strong>
            {analyticsStatus
              ?.event_cooldown_seconds || 0}s
          </strong>
        </div>
      </div>

      <div className="content-grid">
        <div className="panel">
          <div className="panel-header">
            <div>
              <h2>
                🚗 Vehicle Type Statistics
              </h2>

              <p>
                Total detections by vehicle type
              </p>
            </div>
          </div>

          <div className="event-list">
            {["car", "motorcycle", "bus", "truck"].map(
              (type) => (
                <div
                  className="event-item"
                  key={type}
                >
                  <div className="event-content">
                    <strong>
                      {type === "car" && "🚗"}
                      {type === "motorcycle" && "🏍️"}
                      {type === "bus" && "🚌"}
                      {type === "truck" && "🚚"}{" "}
                      {type.charAt(0).toUpperCase() +
                        type.slice(1)}
                    </strong>

                    <p>
                      Total:{" "}
                      {analyticsStatus
                        ?.vehicle_counts?.[
                        type
                      ] || 0}
                    </p>

                    <p>
                      Currently visible:{" "}
                      {analyticsStatus
                        ?.current_vehicle_types?.[
                        type
                      ] || 0}
                    </p>
                  </div>
                </div>
              )
            )}
          </div>
        </div>

        <div className="panel">
          <div className="panel-header">
            <div>
              <h2>
                📈 Detection Summary
              </h2>

              <p>
                Current AI analytics session
              </p>
            </div>
          </div>

          <div className="event-list">
            <div className="event-item">
              <div className="event-content">
                <strong>
                  🤖 AI Engine
                </strong>

                <p>
                  YOLO11 Nano Vehicle Detection
                </p>
              </div>
            </div>

            <div className="event-item">
              <div className="event-content">
                <strong>
                  🎯 Confidence Threshold
                </strong>

                <p>
                  50%
                </p>
              </div>
            </div>

            <div className="event-item">
              <div className="event-content">
                <strong>
                  📹 Selected Camera
                </strong>

                <p>
                  {analyticsStatus?.camera_name ||
                    "No active camera"}
                </p>
              </div>
            </div>

            <div className="event-item">
              <div className="event-content">
                <strong>
                  ⚙️ Detection Status
                </strong>

                <p>
                  {analyticsStatus?.running
                    ? "🟢 AI detection is running"
                    : "🔴 AI detection stopped"}
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {analyticsStatus?.last_detection && (
        <div className="last-detection">
          <h3>
            🤖 Latest AI Detection
          </h3>

          <p>
            {
              analyticsStatus
                .last_detection
                .description
            }
          </p>

          <p>
            📹 Camera:{" "}
            {
              analyticsStatus
                .last_detection
                .location
            }
          </p>

          <p>
            Severity:{" "}

            <strong>
              {
                analyticsStatus
                  .last_detection
                  .severity
              }
            </strong>
          </p>

          {analyticsStatus
            .last_detection
            .metadata?.vehicles && (
            <p>
              Vehicles:{" "}
              {analyticsStatus
                .last_detection
                .metadata
                .vehicles.map(
                  (vehicle) =>
                    `${vehicle.type} (${Math.round(
                      vehicle.confidence * 100
                    )}%)`
                )
                .join(", ")}
            </p>
          )}
        </div>
      )}

      {analyticsStatus?.last_error && (
        <div className="error-box">
          {analyticsStatus.last_error}
        </div>
      )}
    </div>
  );

  const renderAlerts = () => (
    <div className="page-panel">
      <div className="panel-header">
        <div>
          <h2>Security Alerts</h2>

          <p>
            Monitor camera health and
            AI-generated alerts
          </p>
        </div>

        <span className="badge">
          {alerts?.total_alert_events || 0} Alerts
        </span>
      </div>

      <div className="analytics-actions">
        <button
          className="primary-button"
          onClick={scanCameraStates}
          disabled={alertsLoading}
        >
          {alertsLoading
            ? "Scanning..."
            : "🔍 Scan Camera States"}
        </button>

        <button
          className="danger-button"
          onClick={scanOfflineCameras}
          disabled={alertsLoading}
        >
          {alertsLoading
            ? "Scanning..."
            : "🚨 Scan Offline Cameras"}
        </button>

        <button
          className="refresh-button"
          onClick={async () => {
            setAlertsLoading(true);

            await Promise.all([
              loadCameras(),
              loadEvents(),
              loadAlerts(),
            ]);

            setAlertsLoading(false);
          }}
          disabled={alertsLoading}
        >
          ↻ Refresh Alerts
        </button>
      </div>

      <div className="stats-grid">
        <div className="stat-card">
          <div className="stat-icon">
            🚨
          </div>

          <div>
            <h2>
              {alerts
                ?.total_alert_events || 0}
            </h2>

            <p>Total Alerts</p>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-icon offline-icon">
            🔴
          </div>

          <div>
            <h2>
              {alerts
                ?.high_severity || 0}
            </h2>

            <p>High Severity</p>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-icon">
            🟠
          </div>

          <div>
            <h2>
              {alerts
                ?.medium_severity || 0}
            </h2>

            <p>Medium Severity</p>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-icon live-icon">
            🟢
          </div>

          <div>
            <h2>
              {alerts
                ?.low_severity || 0}
            </h2>

            <p>Low Severity</p>
          </div>
        </div>
      </div>

      <div className="content-grid">
        <div className="panel">
          <div className="panel-header">
            <div>
              <h2>Recent Alerts</h2>

              <p>
                Camera and AI security alerts
              </p>
            </div>
          </div>

          <div className="event-list">
            {!alerts?.recent_alerts ||
            alerts.recent_alerts.length === 0 ? (
              <div className="empty-state">
                🟢 No alerts detected.
                System operating normally.
              </div>
            ) : (
              alerts.recent_alerts
                .slice()
                .reverse()
                .map((alert) => (
                  <div
                    className="event-item"
                    key={alert.event_id}
                  >
                    <div
                      className={`event-indicator ${alert.severity}`}
                    />

                    <div className="event-content">
                      <strong>
                        {alert.event_type.replaceAll(
                          "_",
                          " "
                        )}
                      </strong>

                      <p>
                        {alert.description}
                      </p>

                      <p>
                        📹 Camera:{" "}
                        {alert.camera_id}
                      </p>

                      <p>
                        📍 {alert.location}
                      </p>

                      <p>
                        Severity:{" "}

                        <strong>
                          {alert.severity}
                        </strong>
                      </p>

                      {alert.timestamp && (
                        <p>
                          🕒{" "}
                          {new Date(
                            alert.timestamp
                          ).toLocaleString()}
                        </p>
                      )}
                    </div>
                  </div>
                ))
            )}
          </div>
        </div>

        <div className="panel">
          <div className="panel-header">
            <div>
              <h2>Alert Breakdown</h2>

              <p>
                Alert categories
              </p>
            </div>
          </div>

          <div className="event-list">
            <div className="event-item">
              <div className="event-content">
                <strong>
                  🔴 Camera Offline
                </strong>

                <p>
                  {alerts
                    ?.camera_offline_alerts ||
                    0}{" "}
                  offline camera alerts
                  detected
                </p>
              </div>
            </div>

            <div className="event-item">
              <div className="event-content">
                <strong>
                  🟢 Camera Recovered
                </strong>

                <p>
                  {alerts
                    ?.camera_recovery_events ||
                    0}{" "}
                  camera recovery events
                </p>
              </div>
            </div>

            <div className="event-item">
              <div className="event-content">
                <strong>
                  🤖 AI Vehicle Alerts
                </strong>

                <p>
                  {alerts
                    ?.vehicle_alerts || 0}{" "}
                  vehicle activity alerts
                </p>
              </div>
            </div>

            <div className="event-item">
              <div className="event-content">
                <strong>
                  📹 Current Camera Status
                </strong>

                <p>
                  🟢 {liveCameras} Online
                </p>

                <p>
                  🔴 {offlineCameras} Offline
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );

  const renderEvents = () => (
    <div className="page-panel">
      <div className="panel-header">
        <div>
          <h2>Security Events</h2>

          <p>
            All detected security activity
          </p>
        </div>

        <button
          className="refresh-button"
          onClick={async () => {
            await loadEvents();
            await loadAlerts();
          }}
        >
          ↻ Refresh
        </button>
      </div>

      <div className="event-list large-events">
        {events.length === 0 ? (
          <div className="empty-state">
            No security events detected.
          </div>
        ) : (
          events
            .slice()
            .reverse()
            .map((event) => (
              <div
                className="event-item"
                key={event.event_id}
              >
                <div
                  className={`event-indicator ${event.severity}`}
                />

                <div className="event-content">
                  <strong>
                    {event.event_type.replaceAll(
                      "_",
                      " "
                    )}
                  </strong>

                  <p>
                    {event.description}
                  </p>

                  <p>
                    📹 Camera:{" "}
                    {event.camera_id}
                  </p>

                  <p>
                    📍 Location:{" "}
                    {event.location}
                  </p>

                  <p>
                    🕒{" "}
                    {new Date(
                      event.timestamp
                    ).toLocaleString()}
                  </p>
                </div>
              </div>
            ))
        )}
      </div>
    </div>
  );

  const renderContent = () => {
    if (loading) {
      return (
        <div className="loading">
          Loading Sentinel VisionGuard...
        </div>
      );
    }

    switch (activePage) {
      case "Dashboard":
        return renderDashboard();

      case "Cameras":
        return renderCameras();

      case "AI Analytics":
        return renderAnalytics();

      case "Alerts":
        return renderAlerts();

      case "Events":
        return renderEvents();

      default:
        return renderDashboard();
    }
  };

  return (
    <div className="app">
      <aside className="sidebar">
        <div className="brand">
          <div className="logo">
            SV
          </div>

          <div>
            <h2>Sentinel</h2>

            <span>
              VisionGuard
            </span>
          </div>
        </div>

        <nav>
          {[
            "Dashboard",
            "Cameras",
            "AI Analytics",
            "Alerts",
            "Events",
          ].map((item) => (
            <button
              key={item}
              className={
                activePage === item
                  ? "nav-item active"
                  : "nav-item"
              }
              onClick={() =>
                setActivePage(item)
              }
            >
              {item === "Dashboard" &&
                "▦ "}

              {item === "Cameras" &&
                "📹 "}

              {item === "AI Analytics" &&
                "🤖 "}

              {item === "Alerts" &&
                "⚠️ "}

              {item === "Events" &&
                "🚨 "}

              {item}
            </button>
          ))}
        </nav>

        <div className="sidebar-footer">
          <span className="system-dot" />
          System Operational
        </div>
      </aside>

      <main className="main-content">
        <div className="topbar">
          <div>
            <p className="eyebrow">
              SENTINEL VISIONGUARD
            </p>

            <h1>
              {activePage}
            </h1>
          </div>

          <button
            className="refresh-button"
            onClick={loadData}
          >
            ↻ Refresh
          </button>
        </div>

        {error && (
          <div className="error-box">
            {error}
          </div>
        )}

        {renderContent()}
      </main>

      {showForm && (
        <div className="modal-overlay">
          <div className="modal">
            <div className="panel-header">
              <div>
                <h2>
                  {editingCamera
                    ? "Edit Camera"
                    : "Add Camera"}
                </h2>
              </div>

              <button
                className="close-button"
                onClick={() =>
                  setShowForm(false)
                }
              >
                ✕
              </button>
            </div>

            <form onSubmit={saveCamera}>
              <label>
                Camera ID
              </label>

              <input
                name="id"
                value={formData.id}
                onChange={handleFormChange}
                disabled={!!editingCamera}
                required
              />

              <label>
                Location
              </label>

              <input
                name="location"
                value={formData.location}
                onChange={handleFormChange}
                required
              />

              <label>
                Department
              </label>

              <input
                name="department"
                value={
                  formData.department
                }
                onChange={handleFormChange}
                required
              />

              <label>
                Codec
              </label>

              <select
                name="codec"
                value={formData.codec}
                onChange={handleFormChange}
              >
                <option value="H264">
                  H264
                </option>

                <option value="H265">
                  H265
                </option>
              </select>

              <label>
                Resolution
              </label>

              <input
                name="resolution"
                value={
                  formData.resolution
                }
                onChange={handleFormChange}
              />

              <label>
                RTSP URL
              </label>

              <input
                name="rtsp_url"
                value={formData.rtsp_url}
                onChange={handleFormChange}
                required
              />

              <label className="checkbox-label">
                <input
                  type="checkbox"
                  name="live"
                  checked={formData.live}
                  onChange={handleFormChange}
                />

                Camera is live
              </label>

              <div className="modal-actions">
                <button
                  type="button"
                  className="secondary-button"
                  onClick={() =>
                    setShowForm(false)
                  }
                >
                  Cancel
                </button>

                <button
                  type="submit"
                  className="primary-button"
                >
                  {editingCamera
                    ? "Save Changes"
                    : "Add Camera"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

export default App;
