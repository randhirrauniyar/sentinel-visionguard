# 🛡️ Sentinel VisionGuard

### Unified CCTV Monitoring, Camera Health & Selective AI Analytics Platform

Sentinel VisionGuard is a modern prototype platform designed to provide **centralized CCTV camera management, unified monitoring, intelligent camera health tracking, alert management, and selective AI-powered video analytics**.

The solution is designed around a **centralized CCTV registry as the foundation**, with a modular architecture that can evolve toward GIS integration, VMS federation, enterprise databases, and large-scale AI analytics.

---

## 🚀 Live Deployment

🌐 **Frontend:** https://sentinel-visionguard.vercel.app/

⚙️ **Backend API:** https://sentinel-visionguard-backend.onrender.com/

📦 **GitHub Repository:** https://github.com/randhirrauniyar/sentinel-visionguard

---

# 🎯 Problem Statement

Modern CCTV infrastructure often consists of cameras distributed across multiple departments, locations, and systems.

Common challenges include:

- Fragmented camera management
- Difficulty monitoring camera health
- Limited centralized visibility
- Delayed detection of offline cameras
- Manual monitoring requirements
- High computational cost when AI analytics runs continuously
- Difficulty integrating multiple camera systems

Sentinel VisionGuard addresses these challenges through a unified and modular monitoring architecture.

---

# 💡 Proposed Solution

Sentinel VisionGuard provides a centralized platform for:

- 📹 Camera Registry Management
- 🖥️ Unified CCTV Monitoring
- ❤️ Camera Health Monitoring
- 🚨 Intelligent Alerts
- 📊 Event Management
- 🤖 Selective YOLO AI Analytics
- 📈 Analytics Status Monitoring

The architecture allows AI analytics to be selectively activated instead of continuously processing every camera stream.

This approach helps optimize computational resources while maintaining operational monitoring capabilities.

---

# ✨ Key Features

## 📹 Centralized Camera Registry

Manage CCTV camera information including:

- Camera ID
- Location
- Department
- Codec
- Resolution
- Stream URL
- Live status

Example API:

```text
/api/cameras/mock
