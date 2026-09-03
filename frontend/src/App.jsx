import { useEffect, useState } from "react";
import "./App.css";

const emptyForm = {
  id: "",
  location: "",
  department: "",
  codec: "H264",
  live: true,
  resolution: "1920x1080",
  rtsp_url: "",
};

function App() {
  const [activePage, setActivePage] = useState("Dashboard");

  const [cameras, setCameras] = useState([]);
  const [events, setEvents] = useState([]);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  // Camera CRUD
  const [showForm, setShowForm] = useState(false);
  const [editingCamera, setEditingCamera] = useState(null);
  const [formData, setFormData] = useState(emptyForm);

  // Filters
  const [search, setSearch] = useState("");
  const [department, setDepartment] = useState("");
  const [codec, setCodec] = useState("");

  // AI Analytics
  const [selectedCameraId, setSelectedCameraId] = useState("");
  const [analysisLoading, setAnalysisLoading] = useState(false);
  const [analysisResult, setAnalysisResult] = useState(null);

  // =========================
  // LOAD CAMERAS
  // =========================

  const loadCameras = async () => {
    try {
      const response = await fetch("/api/cameras/mock");

      if (!response.ok) {
        throw new Error("Unable to load cameras");
      }

      const data = await response.json();

      setCameras(data.cameras || []);
    } catch (err) {
      console.error(err);
      setError(err.message);
    }
  };

  // =========================
  // LOAD EVENTS
  // =========================

  const loadEvents = async () => {
    try {
      const response = await fetch("/api/events/");

      if (!response.ok) {
        throw new Error("Unable to load events");
      }

      const data = await response.json();

      setEvents(data.events || []);
    } catch (err) {
      console.error(err);
      setError(err.message);
    }
  };

  // =========================
  // LOAD ALL DATA
  // =========================

  const loadData = async () => {
    try {
      setLoading(true);
      setError("");

      await Promise.all([
        loadCameras(),
        loadEvents(),
      ]);
    } catch (err) {
      console.error(err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  // =========================
  // CAMERA FORM
  // =========================

  const openAddCamera = () => {
    setEditingCamera(null);
    setFormData(emptyForm);
    setShowForm(true);
  };

  const openEditCamera = (camera) => {
    setEditingCamera(camera);

    setFormData({
      id: camera.id || "",
      location: camera.location || "",
      department:
        camera.properties?.department || "",
      codec: camera.codec || "H264",
      live: camera.live ?? true,
      resolution: camera.resolution || "1920x1080",
      rtsp_url: camera.rtsp_url || "",
    });

    setShowForm(true);
  };

  const handleFormChange = (event) => {
    const { name, value, type, checked } =
      event.target;

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

      let response;

      if (editingCamera) {
        response = await fetch(
          `/api/cameras/mock/${editingCamera.id}`,
          {
            method: "PUT",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              location: formData.location,
              department: formData.department,
              codec: formData.codec,
              live: formData.live,
              resolution: formData.resolution,
              rtsp_url: formData.rtsp_url,
            }),
          }
        );
      } else {
        response = await fetch(
          "/api/cameras/mock",
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify(formData),
          }
        );
      }

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          data.detail ||
          "Unable to save camera"
        );
      }

      setShowForm(false);
      setEditingCamera(null);
      setFormData(emptyForm);

      await loadCameras();
    } catch (err) {
      console.error(err);
      setError(err.message);
    }
  };

  const deleteCamera = async (cameraId) => {
    const confirmed = window.confirm(
      `Are you sure you want to delete ${cameraId}?`
    );

    if (!confirmed) return;

    try {
      const response = await fetch(
        `/api/cameras/mock/${cameraId}`,
        {
          method: "DELETE",
        }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          data.detail ||
          "Unable to delete camera"
        );
      }

      await loadCameras();

      if (selectedCameraId === cameraId) {
        setSelectedCameraId("");
        setAnalysisResult(null);
      }
    } catch (err) {
      console.error(err);
      setError(err.message);
    }
  };

  // =========================
  // AI ANALYSIS
  // =========================

  const runAIAnalysis = async () => {
    if (!selectedCameraId) {
      setError("Please select a camera first.");
      return;
    }

    try {
      setAnalysisLoading(true);
      setError("");
      setAnalysisResult(null);

      const response = await fetch(
        `/api/simulation/analyze/${selectedCameraId}`,
        {
          method: "POST",
        }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          data.detail ||
          "AI analysis failed"
        );
      }

      setAnalysisResult(data);

      // Reload events because AI analysis
      // automatically creates security events
      await loadEvents();

    } catch (err) {
      console.error(err);
      setError(err.message);
    } finally {
      setAnalysisLoading(false);
    }
  };

  // =========================
  // STATISTICS
  // =========================

  const liveCameras = cameras.filter(
    (camera) => camera.live
  ).length;

  const offlineCameras =
    cameras.length - liveCameras;

  const departments = [
    ...new Set(
      cameras
        .map(
          (camera) =>
            camera.properties?.department
        )
        .filter(Boolean)
    ),
  ];

  // =========================
  // FILTER CAMERAS
  // =========================

  const filteredCameras = cameras.filter(
    (camera) => {
      const cameraDepartment =
        camera.properties?.department || "";

      const matchesSearch =
        !search ||
        camera.id
          .toLowerCase()
          .includes(search.toLowerCase()) ||
        (camera.location || "")
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
    }
  );

  // =========================
  // DASHBOARD
  // =========================

  const renderDashboard = () => (
    <div className="full-panel">

      <div className="panel-header">
        <div>
          <h2>
            Security Operations Dashboard
          </h2>

          <p>
            Unified monitoring across government
            CCTV infrastructure
          </p>
        </div>

        <button
          className="primary-button"
          onClick={openAddCamera}
        >
          + Add Camera
        </button>
      </div>

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
            <p>Live Cameras</p>
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
            <h2>{events.length}</h2>
            <p>Security Events</p>
          </div>
        </div>

      </div>

      <div className="content-grid">

        <div className="panel">
          <div className="panel-header">
            <div>
              <h2>Camera Monitoring</h2>

              <p>
                Live government CCTV infrastructure
              </p>
            </div>

            <span className="badge">
              {cameras.length} Cameras
            </span>
          </div>

          <CameraGrid
            cameras={cameras}
            onEdit={openEditCamera}
            onDelete={deleteCamera}
          />
        </div>

        <div className="panel">
          <div className="panel-header">
            <div>
              <h2>Recent Events</h2>
              <p>
                AI-generated security alerts
              </p>
            </div>
          </div>

          <EventList events={events.slice(-5).reverse()} />
        </div>

      </div>
    </div>
  );

  // =========================
  // CAMERA MANAGEMENT
  // =========================

  const renderCameras = () => (
    <div className="page-panel">

      <div className="panel-header">
        <div>
          <h2>Camera Management</h2>

          <p>
            Add, edit, delete and monitor CCTV cameras
          </p>
        </div>

        <button
          className="primary-button"
          onClick={openAddCamera}
        >
          + Add Camera
        </button>
      </div>

      <div className="filters">

        <input
          type="text"
          placeholder="Search camera ID or location..."
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

      <CameraGrid
        cameras={filteredCameras}
        onEdit={openEditCamera}
        onDelete={deleteCamera}
      />

    </div>
  );

  // =========================
  // AI ANALYTICS PAGE
  // =========================

  const renderAIAnalytics = () => (
    <div className="page-panel">

      <div className="panel-header">
        <div>
          <h2>AI Analytics & Detection</h2>

          <p>
            Run VisionGuard AI simulation on a CCTV camera
            to detect potential security incidents.
          </p>
        </div>

        <span className="badge">
          VisionGuard AI v1.0
        </span>
      </div>

      <div className="ai-controls">

        <div className="ai-select-group">

          <label>
            Select Camera
          </label>

          <select
            value={selectedCameraId}
            onChange={(event) => {
              setSelectedCameraId(
                event.target.value
              );

              setAnalysisResult(null);
            }}
          >
            <option value="">
              -- Select a Camera --
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

        </div>

        <button
          className="primary-button ai-button"
          onClick={runAIAnalysis}
          disabled={
            analysisLoading ||
            !selectedCameraId
          }
        >
          {analysisLoading
            ? "Analyzing..."
            : "🤖 Run AI Analysis"}
        </button>

      </div>

      {!analysisResult && !analysisLoading && (
        <div className="ai-empty-state">
          <div className="ai-empty-icon">
            🤖
          </div>

          <h3>
            Ready for AI Analysis
          </h3>

          <p>
            Select a camera and run the VisionGuard
            AI Detection Simulation.
          </p>
        </div>
      )}

      {analysisLoading && (
        <div className="ai-empty-state">
          <div className="ai-empty-icon">
            🔍
          </div>

          <h3>
            Analyzing Camera Feed...
          </h3>

          <p>
            VisionGuard AI is processing simulated
            detection data.
          </p>
        </div>
      )}

      {analysisResult && (
        <div className="analysis-results">

          <div className="analysis-summary">

            <div>
              <span>Camera</span>
              <strong>
                {analysisResult.camera?.id}
              </strong>
            </div>

            <div>
              <span>Location</span>
              <strong>
                {analysisResult.camera?.location}
              </strong>
            </div>

            <div>
              <span>Detections</span>
              <strong>
                {
                  analysisResult.summary
                    ?.total_detections
                }
              </strong>
            </div>

            <div>
              <span>Risk Status</span>

              <strong
                className={
                  analysisResult.summary
                    ?.high_risk_detected
                    ? "risk-high"
                    : "risk-safe"
                }
              >
                {
                  analysisResult.summary
                    ?.high_risk_detected
                    ? "HIGH RISK"
                    : "NORMAL"
                }
              </strong>
            </div>

          </div>

          <h3 className="detections-title">
            AI Detection Results
          </h3>

          <div className="detection-grid">

            {analysisResult.detections?.map(
              (detection, index) => (
                <div
                  className="detection-card"
                  key={`${detection.type}-${index}`}
                >

                  <div className="detection-header">

                    <h3>
                      {detection.label}
                    </h3>

                    <span
                      className={`risk-badge ${detection.risk_level}`}
                    >
                      {detection.risk_level}
                    </span>

                  </div>

                  <p>
                    Detection Type:{" "}
                    <strong>
                      {detection.type}
                    </strong>
                  </p>

                  <div className="confidence-row">

                    <span>
                      AI Confidence
                    </span>

                    <strong>
                      {Math.round(
                        detection.confidence * 100
                      )}
                      %
                    </strong>

                  </div>

                  <div className="confidence-bar">
                    <div
                      className="confidence-fill"
                      style={{
                        width: `${
                          detection.confidence * 100
                        }%`,
                      }}
                    />
                  </div>

                </div>
              )
            )}

          </div>

          <div className="events-created-box">

            <h3>
              🚨 Security Events Generated
            </h3>

            <p>
              {
                analysisResult.events_created?.length || 0
              } security event(s) were automatically
              added to the Event Monitoring system.
            </p>

          </div>

        </div>
      )}

    </div>
  );

  // =========================
  // EVENTS PAGE
  // =========================

  const renderEvents = () => (
    <div className="page-panel">

      <div className="panel-header">
        <div>
          <h2>Security Events</h2>

          <p>
            AI-generated detections and security alerts
          </p>
        </div>

        <span className="badge">
          {events.length} Events
        </span>
      </div>

      <EventList
        events={[...events].reverse()}
      />

    </div>
  );

  // =========================
  // RENDER PAGE
  // =========================

  const renderPage = () => {
    if (activePage === "Dashboard") {
      return renderDashboard();
    }

    if (activePage === "Cameras") {
      return renderCameras();
    }

    if (activePage === "AI Analytics") {
      return renderAIAnalytics();
    }

    if (activePage === "Events") {
      return renderEvents();
    }

    return renderDashboard();
  };

  // =========================
  // MAIN UI
  // =========================

  return (
    <div className="app">

      <aside className="sidebar">

        <div className="brand">

          <div className="logo">
            VG
          </div>

          <div>
            <h2>VisionGuard</h2>

            <span>
              Sentinel Security Platform
            </span>
          </div>

        </div>

        <nav>

          {[
            "Dashboard",
            "Cameras",
            "AI Analytics",
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
              {item === "Dashboard" && "📊 "}
              {item === "Cameras" && "📹 "}
              {item === "AI Analytics" && "🤖 "}
              {item === "Events" && "🚨 "}

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

            <strong>Error:</strong> {error}

          </div>
        )}

        {loading ? (
          <div className="loading">
            Loading VisionGuard Platform...
          </div>
        ) : (
          renderPage()
        )}

      </main>

      {showForm && (

        <div className="modal-overlay">

          <div className="camera-modal">

            <div className="modal-header">

              <h2>
                {editingCamera
                  ? "Edit Camera"
                  : "Add Camera"}
              </h2>

              <button
                className="close-button"
                onClick={() => {
                  setShowForm(false);
                  setEditingCamera(null);
                  setFormData(emptyForm);
                }}
              >
                ×
              </button>

            </div>

            <form onSubmit={saveCamera}>

              {!editingCamera && (
                <div className="form-group">

                  <label>
                    Camera ID
                  </label>

                  <input
                    name="id"
                    value={formData.id}
                    onChange={handleFormChange}
                    placeholder="CAM-004"
                    required
                  />

                </div>
              )}

              <div className="form-group">

                <label>
                  Location
                </label>

                <input
                  name="location"
                  value={formData.location}
                  onChange={handleFormChange}
                  required
                />

              </div>

              <div className="form-group">

                <label>
                  Department
                </label>

                <input
                  name="department"
                  value={formData.department}
                  onChange={handleFormChange}
                  required
                />

              </div>

              <div className="form-row">

                <div className="form-group">

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

                </div>

                <div className="form-group">

                  <label>
                    Resolution
                  </label>

                  <input
                    name="resolution"
                    value={formData.resolution}
                    onChange={handleFormChange}
                    required
                  />

                </div>

              </div>

              <div className="form-group">

                <label>
                  RTSP URL
                </label>

                <input
                  name="rtsp_url"
                  value={formData.rtsp_url}
                  onChange={handleFormChange}
                  required
                />

              </div>

              <label className="checkbox-group">

                <input
                  type="checkbox"
                  name="live"
                  checked={formData.live}
                  onChange={handleFormChange}
                />

                Camera is currently live

              </label>

              <div className="modal-actions">

                <button
                  type="button"
                  className="secondary-button"
                  onClick={() => {
                    setShowForm(false);
                    setEditingCamera(null);
                    setFormData(emptyForm);
                  }}
                >
                  Cancel
                </button>

                <button
                  type="submit"
                  className="primary-button"
                >
                  {editingCamera
                    ? "Update Camera"
                    : "Create Camera"}
                </button>

              </div>

            </form>

          </div>

        </div>

      )}

    </div>
  );
}


// =================================
// CAMERA GRID COMPONENT
// =================================

function CameraGrid({
  cameras,
  onEdit,
  onDelete,
}) {
  if (!cameras.length) {
    return (
      <div className="empty-state">
        No cameras found.
      </div>
    );
  }

  return (
    <div className="camera-grid">

      {cameras.map((camera) => {

        const department =
          camera.properties?.department ||
          "Unknown Department";

        return (
          <div
            className="camera-card"
            key={camera.id}
          >

            <div className="camera-preview">

              <div className="camera-placeholder">
                📹
              </div>

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

            </div>

            <div className="camera-info">

              <div className="camera-title-row">

                <h3>
                  {camera.id}
                </h3>

                <span className="codec-badge">
                  {camera.codec}
                </span>

              </div>

              <p className="camera-location">
                📍 {camera.location}
              </p>

              <p className="camera-department">
                🏢 {department}
              </p>

              <p className="camera-resolution">
                🖥️ {camera.resolution}
              </p>

              <div className="camera-actions">

                <button
                  className="edit-button"
                  onClick={() =>
                    onEdit(camera)
                  }
                >
                  Edit
                </button>

                <button
                  className="delete-button"
                  onClick={() =>
                    onDelete(camera.id)
                  }
                >
                  Delete
                </button>

              </div>

            </div>

          </div>
        );
      })}

    </div>
  );
}


// =================================
// EVENT LIST COMPONENT
// =================================

function EventList({ events }) {

  if (!events.length) {
    return (
      <div className="empty-state">
        No security events yet.
      </div>
    );
  }

  return (
    <div className="event-list">

      {events.map((event) => (

        <div
          className="event-item"
          key={event.event_id}
        >

          <div
            className={
              event.severity === "high"
                ? "event-indicator high"
                : event.severity === "medium"
                ? "event-indicator medium"
                : "event-indicator"
            }
          />

          <div className="event-content">

            <strong>
              {event.event_type
                ?.replaceAll("_", " ")}
            </strong>

            <p>
              📹 {event.camera_id}
            </p>

            <p>
              {event.description}
            </p>

          </div>

        </div>

      ))}

    </div>
  );
}


export default App;
