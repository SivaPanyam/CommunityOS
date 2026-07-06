# CommunityOS - AI-Powered Decision Intelligence Platform

CommunityOS is an advanced, production-grade AI-powered Decision Intelligence Platform (AI-OS) designed to aggregate multi-source urban telemetry, predict upcoming crises, optimize resource dispatch logistics, triage citizen complaints with live LLM classification, and guide city administrators through critical situations with a multi-agent reasoning consensus.

---

## 🚀 Key Capabilities & Core Architecture

CommunityOS integrates modern full-stack development with multimodal AI engineering and real-time WebSocket communication:

1. **Master AI Coordinator & Multi-Agent Consensus**:
   - Built on the official `@google/genai` (Node.js) and `google-genai` (Python) SDKs.
   - Coordinates six specialized domain agents (**Traffic, Environment, Citizen, Healthcare, Emergency, and Resource Agents**) using RAG (Retrieval-Augmented Generation) coupled with real-time telemetry state context.
   - Outputs highly structured JSON matching strict schemas for direct workflow action execution.

2. **Real-Time WebSocket Synchronization Pipeline**:
   - Integrates live WebSocket connections directly over the standard HTTP port 3000 (compliant with strict sandbox/ingress routing).
   - Simulates continuous city fluctuations (water reservoir levels, traffic congestion indexes, air quality variations) and broadcasts them to all connected clients every 10 seconds.
   - Triggers instantaneous frontend state updates for user dispatches and citizen complaints without page reloads.

3. **Knowledge Grounding / RAG (Retrieval-Augmented Generation)**:
   - Queries a localized database of Municipal Standard Operating Procedures (SOPs) on *Urban Mobility Policy* and *Disaster Response SOPs*.
   - Evaluates the query using a highly optimized relevance filter and injects raw SOP guidelines into the Gemini prompt structure to enforce compliant municipal responses.

4. **Dual-Stack Portability**:
   - Fully compatible with both a unified **Node.js/Express + Vite** runtime (the default cloud container environment) and a **Python FastAPI** backend framework.

---

## 📁 Clean Directory Layout

```
├── backend/                  # Python FastAPI Backend Services
│   ├── main.py               # FastAPI App (CORS, REST routes, RAG, WebSockets)
│   └── requirements.txt      # Python dependencies (google-genai, fastapi, uvicorn)
├── src/                      # Frontend React + TypeScript application
│   ├── components/           # Modular visual components and views
│   │   ├── DashboardView.tsx # Master real-time municipal control center
│   │   ├── DecisionCenterView.tsx # Multi-agent AI Reasoning room
│   │   ├── AnalyticsView.tsx # Trend visualizers (d3 / Recharts)
│   │   ├── ComplaintsView.tsx # Citizen claims intake and auto-routing
│   │   ├── EmergencyView.tsx # Live hazard alerts and dispatcher
│   │   ├── UtilitiesView.tsx # Water reservoirs and smart grid meters
│   │   └── SettingsView.tsx  # Visual styling theme selectors
│   ├── data/                 # Platform data layers
│   │   ├── mock/             # Mock CSV datasets (traffic, weather, water, power, etc.)
│   │   └── rag/              # SOP Markdown files for Retrieval-Augmented Generation
│   ├── types.ts              # Global typed data schemas and interfaces
│   ├── App.tsx               # Primary React entry state and WS reconnecting client
│   └── main.tsx              # React DOM mounting
├── .env.example              # Sample environment configurations
├── Dockerfile                # Multi-stage production container build schema
├── package.json              # Frontend & backend Node scripts and dependencies
├── server.ts                 # Production-grade Node Express + Vite unified server
├── tsconfig.json             # TypeScript compiler settings
└── vite.config.ts            # Vite asset bundler configuration
```

---

## 🛠️ Local Setup & Execution

### Option A: Unified Node.js / Express Backend (Default)

The default environment serves both the React client (utilizing hot development middleware) and the API/WebSocket routes from a single port (`3000`).

1. **Install Dependencies**:
   ```bash
   npm install
   ```

2. **Run Development Server**:
   ```bash
   npm run dev
   ```
   *Serves the complete React client and API endpoints on `http://localhost:3000` with active WebSocket telemetry.*

3. **Production Build & Launch**:
   ```bash
   npm run build
   ```
   This compiles the React assets to `dist/` and bundles the Express server to a CJS self-contained output `dist/server.cjs` using `esbuild` for maximum container cold-start performance.

   ```bash
   npm run start
   ```

---

### Option B: Python FastAPI Backend

Alternatively, you can run the backend service via FastAPI/Uvicorn, proxying frontend requests.

1. **Setup Python Virtual Environment**:
   ```bash
   cd backend
   python3 -m venv venv
   source venv/bin/activate
   pip install -r requirements.txt
   ```

2. **Run FastAPI Server**:
   ```bash
   uvicorn main:app --reload --port 8000
   ```
   *Launches the backend API and WebSockets server on `http://localhost:8000`.*

3. **Run Frontend Client**:
   Return to the root folder, and run:
   ```bash
   npm run dev
   ```
   *(Ensure Vite's dev server is running on port `3000` and proxying API/WS requests accordingly, or build assets to let FastAPI serve the `/dist` path directly).*

---

## 🛡️ Environment Variables

Copy `.env.example` to `.env` and fill in your Gemini API Key:

```env
# Get a free key from Google AI Studio
GEMINI_API_KEY="AIzaSy..."
```

*Note: In the Google AI Studio container, the key is automatically injected. You do not need to construct a custom `.env` file manually.*
