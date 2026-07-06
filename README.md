<div align="center">

# 🏙️ CommunityOS
### AI-Powered Smart City Operating System

[![Live Demo](https://img.shields.io/badge/Live%20Demo-Cloud%20Run-blue?logo=google-cloud)](https://smart-city-os-223349418431.us-central1.run.app)
[![Built with Gemini](https://img.shields.io/badge/Built%20with-Gemini%20AI-orange?logo=google)](https://ai.google.dev/)
[![Deployed on GCP](https://img.shields.io/badge/Deployed%20on-Google%20Cloud-4285F4?logo=google-cloud)](https://cloud.google.com/)
[![FastAPI](https://img.shields.io/badge/Backend-FastAPI-009688?logo=fastapi)](https://fastapi.tiangolo.com/)
[![React](https://img.shields.io/badge/Frontend-React%20%2B%20TypeScript-61DAFB?logo=react)](https://react.dev/)

**CommunityOS** is a production-grade, AI-powered Smart City Operating System that unifies multi-source urban telemetry, predictive crisis detection, automated workflow dispatch, and Gemini AI-powered decision intelligence — all in a single real-time platform.

🌐 **[Try it Live →](https://smart-city-os-223349418431.us-central1.run.app)**

</div>

---

## ✨ Features

| Feature | Description |
|---------|-------------|
| 🧠 **Multi-Agent AI** | 6 specialized Gemini AI agents (Traffic, Environment, Citizen, Healthcare, Emergency, Resource) with consensus reasoning |
| 📡 **Real-Time WebSockets** | Live city telemetry broadcast every 10 seconds — water, power, air quality, traffic |
| 🗺️ **Interactive Maps** | Live incident heatmaps and resource tracking |
| ⚡ **Workflow Automation** | AI-triggered workflows for Emergency Response, Flood Alerts, Traffic, Garbage, Power Failures |
| 📊 **Analytics Dashboard** | City metrics, trend visualization, risk indicators |
| 🔍 **RAG-Powered SOPs** | AI grounded in Municipal Standard Operating Procedures |
| 🎫 **Citizen Complaints** | Intake, auto-classification, and department routing |
| 🚨 **Emergency Management** | Live alerts, dispatcher, severity scoring |
| 🔒 **Audit Logs** | Full workflow execution history and compliance tracking |
| 🌙 **Dark Mode UI** | Material Design 3 + Glassmorphism premium design |

---

## 🏗️ Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    Google Cloud Run                          │
│                                                              │
│  ┌────────────────┐    ┌──────────────────────────────────┐ │
│  │  React + Vite  │    │        FastAPI Backend            │ │
│  │  (TypeScript)  │◄──►│  • Gemini AI (Vertex AI)         │ │
│  │  • Dashboard   │    │  • Multi-Agent System            │ │
│  │  • Map/Charts  │    │  • RAG (SOP Knowledge Base)      │ │
│  │  • Workflows   │    │  • WebSocket Server              │ │
│  │  • Complaints  │    │  • Workflow Automation Engine    │ │
│  └────────────────┘    └────────────┬─────────────────────┘ │
└────────────────────────────────────│────────────────────────┘
                                     │
            ┌────────────────────────┼────────────────────────┐
            ▼                        ▼                        ▼
    ┌───────────────┐   ┌──────────────────┐   ┌────────────────────┐
    │   Firestore   │   │    BigQuery       │   │  Cloud Storage     │
    │  (Complaints, │   │  (Analytics,      │   │  (RAG Documents,   │
    │   Workflows)  │   │   Audit Logs)     │   │   Uploads)         │
    └───────────────┘   └──────────────────┘   └────────────────────┘
```

---

## 🚀 Quick Start (Local)

### Prerequisites
- Node.js 20+
- Python 3.10+
- A [Google AI Studio](https://aistudio.google.com/) API key (free)

### 1. Clone & Install

```bash
git clone https://github.com/SivaPanyam/CommunityOS.git
cd CommunityOS

# Install frontend dependencies
npm install

# Install backend dependencies
python -m venv venv
# Windows:
venv\Scripts\activate
# Mac/Linux:
source venv/bin/activate
pip install -r requirements.txt
```

### 2. Configure Environment

```bash
cp .env.example .env
```

Edit `.env` and add your Gemini API key:
```env
GEMINI_API_KEY=your_api_key_here
GOOGLE_CLOUD_PROJECT=your_gcp_project_id
```

### 3. Run Development

**Option A — Frontend only (mock data):**
```bash
npm run dev
# App available at http://localhost:5173
```

**Option B — Full stack (FastAPI + React):**

Terminal 1 (backend):
```bash
uvicorn backend.app.main:app --reload --port 8080
```

Terminal 2 (frontend):
```bash
npm run dev
# App available at http://localhost:5173
```

---

## 🌩️ Google Cloud Deployment

### Prerequisites
- [Google Cloud CLI](https://cloud.google.com/sdk/docs/install) installed and authenticated
- A GCP project with billing enabled

### Deploy to Cloud Run

```bash
# Build the frontend locally
npm run build

# Submit to Cloud Build and deploy to Cloud Run
gcloud builds submit --config=cloudbuild.yaml
```

The `cloudbuild.yaml` will:
1. Build the Docker image with your pre-compiled `dist/` frontend
2. Push to Artifact Registry (`us-central1`)
3. Deploy to Cloud Run with auto-scaling (0–10 instances)

### Enable Required APIs

```bash
gcloud services enable \
  run.googleapis.com \
  cloudbuild.googleapis.com \
  artifactregistry.googleapis.com \
  firestore.googleapis.com \
  bigquery.googleapis.com \
  storage.googleapis.com \
  secretmanager.googleapis.com \
  pubsub.googleapis.com \
  aiplatform.googleapis.com
```

---

## 📁 Project Structure

```
CommunityOS/
├── backend/                    # Python FastAPI backend
│   └── app/
│       ├── main.py             # FastAPI app entry point
│       ├── agents/             # AI agent implementations
│       ├── routes/             # API route handlers
│       ├── services/           # Google Cloud service integrations
│       └── workflows/          # Workflow automation engine
├── src/                        # React TypeScript frontend
│   ├── components/             # UI components and views
│   │   ├── DashboardView.tsx   # Main city overview
│   │   ├── DecisionCenterView.tsx # AI multi-agent reasoning
│   │   ├── AnalyticsView.tsx   # Trend charts & analytics
│   │   ├── ComplaintsView.tsx  # Citizen complaint system
│   │   ├── EmergencyView.tsx   # Emergency management
│   │   ├── WorkflowView.tsx    # Workflow automation
│   │   ├── MapComponent.tsx    # Interactive city map
│   │   └── MetricCard.tsx      # City metric widgets
│   ├── data/                   # Static data and SOP documents
│   ├── types.ts                # TypeScript type definitions
│   ├── App.tsx                 # Root app component
│   └── main.tsx                # React entry point
├── .env.example                # Environment variables template
├── .gitignore                  # Git ignore rules
├── Dockerfile                  # Production container build
├── cloudbuild.yaml             # Google Cloud Build pipeline
├── package.json                # Node.js dependencies
├── requirements.txt            # Python dependencies
├── vite.config.ts              # Vite bundler config
└── tsconfig.json               # TypeScript config
```

---

## 🔑 Environment Variables

| Variable | Description | Required |
|----------|-------------|----------|
| `GEMINI_API_KEY` | Google AI Studio API key | Yes (local dev) |
| `GOOGLE_CLOUD_PROJECT` | GCP project ID | Yes (cloud) |
| `GOOGLE_CLOUD_REGION` | GCP region (default: `us-central1`) | No |
| `FIRESTORE_DATABASE` | Firestore database ID | No |
| `GCS_BUCKET_NAME` | Cloud Storage bucket for RAG docs | No |
| `BIGQUERY_DATASET` | BigQuery dataset name | No |
| `PUBSUB_TOPIC` | Pub/Sub topic for events | No |

---

## 🤖 AI Agent System

CommunityOS uses a **multi-agent consensus architecture** powered by Gemini AI:

| Agent | Responsibility |
|-------|---------------|
| 🚦 **Traffic Agent** | Congestion analysis, signal optimization recommendations |
| 🌿 **Environment Agent** | Air quality, weather impact assessment |
| 👥 **Citizen Agent** | Complaint classification, sentiment analysis |
| 🏥 **Healthcare Agent** | Medical resource allocation, outbreak detection |
| 🚨 **Emergency Agent** | Crisis severity scoring, dispatch coordination |
| 📦 **Resource Agent** | City resource optimization and allocation |

Each agent independently analyzes the city state and returns structured JSON recommendations. A **Master Coordinator** synthesizes the consensus for final decision output.

---

## 🛠️ Tech Stack

| Layer | Technology |
|-------|-----------|
| **Frontend** | React 18, TypeScript, Tailwind CSS, Recharts, Leaflet |
| **Backend** | Python FastAPI, Uvicorn, WebSockets |
| **AI/ML** | Google Gemini AI, Vertex AI |
| **Database** | Firestore (real-time), BigQuery (analytics) |
| **Storage** | Cloud Storage (RAG documents) |
| **Deployment** | Google Cloud Run, Cloud Build, Artifact Registry |
| **Messaging** | Pub/Sub, Eventarc |

---

## 📸 Screenshots

> Dashboard showing live city metrics, AI recommendations, and incident map

---

## 🤝 Contributing

Contributions are welcome! Please:
1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

---

## 📄 License

This project is open source and available under the [MIT License](LICENSE).

---

<div align="center">

**Built with ❤️ using Google Cloud & Gemini AI**

[🌐 Live Demo](https://smart-city-os-223349418431.us-central1.run.app) • [🐛 Report Bug](https://github.com/SivaPanyam/CommunityOS/issues) • [💡 Request Feature](https://github.com/SivaPanyam/CommunityOS/issues)

</div>
