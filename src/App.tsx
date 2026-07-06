import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "motion/react";
import {
  LayoutDashboard,
  Brain,
  BarChart3,
  MessageSquare,
  Flame,
  Zap,
  Settings as SettingsIcon,
  Bell,
  Sparkles,
  Layers,
  Activity,
  LogOut,
  Menu,
  X,
} from "lucide-react";

import {
  ActiveTab,
  SmartCityTheme,
  TrafficRecord,
  WeatherRecord,
  AQIRecord,
  ComplaintRecord,
  PowerRecord,
  WaterRecord,
  HospitalRecord,
  EmergencyRecord,
  CitizenFeedbackRecord,
  ApprovedAction,
} from "./types";

import DashboardView from "./components/DashboardView";
import LandingPage from "./components/LandingPage";
import DecisionCenterView from "./components/DecisionCenterView";
import DocumentRagView from "./components/DocumentRagView";
import AnalyticsView from "./components/AnalyticsView";
import ComplaintsView from "./components/ComplaintsView";
import EmergencyView from "./components/EmergencyView";
import UtilitiesView from "./components/UtilitiesView";
import SettingsView from "./components/SettingsView";
import WorkflowModal from "./components/WorkflowModal";

export default function App() {
  const [activeTab, setActiveTab] = useState<ActiveTab>("dashboard");
  const [viewLanding, setViewLanding] = useState(true);
  const [theme, setTheme] = useState<SmartCityTheme>("glass-slate");
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  // Core Smart City State
  const [stats, setStats] = useState<any>({});
  const [traffic, setTraffic] = useState<TrafficRecord[]>([]);
  const [weather, setWeather] = useState<WeatherRecord[]>([]);
  const [airQuality, setAirQuality] = useState<AQIRecord[]>([]);
  const [complaints, setComplaints] = useState<ComplaintRecord[]>([]);
  const [power, setPower] = useState<PowerRecord[]>([]);
  const [water, setWater] = useState<WaterRecord[]>([]);
  const [hospital, setHospital] = useState<HospitalRecord[]>([]);
  const [emergency, setEmergency] = useState<EmergencyRecord[]>([]);
  const [citizenFeedback, setCitizenFeedback] = useState<CitizenFeedbackRecord[]>([]);

  // Active Approved Workflow report modal
  const [activeApprovedWorkflow, setActiveApprovedWorkflow] = useState<ApprovedAction | null>(null);

  // Fetch all feeds on initialization
  const fetchAllFeeds = async () => {
    try {
      const res = await fetch("/api/data/all");
      if (res.ok) {
        const contentType = res.headers.get("content-type");
        if (!contentType || !contentType.includes("application/json")) {
          console.warn("Express backend sync pending: Received non-JSON response from /api/data/all (server might still be starting up).");
          return;
        }
        const data = await res.json();
        setStats(data.stats);
        setTraffic(data.traffic);
        setWeather(data.weather);
        setAirQuality(data.airQuality);
        setComplaints(data.complaints);
        setPower(data.power);
        setWater(data.water);
        setHospital(data.hospital);
        setEmergency(data.emergency);
        setCitizenFeedback(data.citizenFeedback);
      } else {
        console.warn(`Express backend sync pending: Server returned status ${res.status}`);
      }
    } catch (err) {
      console.warn("Express backend sync pending (utilizing live client-side heuristics):", err);
    }
  };

  useEffect(() => {
    fetchAllFeeds();

    // Backup polling fallback every 10 seconds to ensure consistency if WebSocket fails
    const pollInterval = setInterval(fetchAllFeeds, 10000);

    // Setup active WebSocket connection to listen for real-time telemetry updates and dispatches
    let ws: WebSocket | null = null;
    let reconnectTimeout: any = null;

    const connectWebSocket = () => {
      try {
        const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
        const wsUrl = `${protocol}//${window.location.host}/ws`;
        ws = new WebSocket(wsUrl);

        ws.onopen = () => {
          console.log("Connected to CommunityOS Real-Time Event Pipeline.");
        };

        ws.onmessage = (event) => {
          try {
            const data = JSON.parse(event.data);
            if (data.event === "telemetry:update") {
              const payload = data.payload;
              if (payload.stats) setStats(payload.stats);
              if (payload.traffic) setTraffic(payload.traffic);
              if (payload.airQuality) setAirQuality(payload.airQuality);
              if (payload.water) setWater(payload.water);
              if (payload.complaints) setComplaints(payload.complaints);
              if (payload.emergency) setEmergency(payload.emergency);
            } else if (data.event === "complaint:created") {
              const complaint = data.payload;
              setComplaints((prev) => {
                // Prevent duplicate addition
                if (prev.some((c) => c.id === complaint.id)) return prev;
                return [complaint, ...prev];
              });
            } else if (data.event === "workflow:approved") {
              fetchAllFeeds();
            }
          } catch (err) {
            console.error("Error parsing WebSocket event:", err);
          }
        };

        ws.onclose = () => {
          console.log("WebSocket connection closed. Attempting auto-reconnection in 5s...");
          reconnectTimeout = setTimeout(connectWebSocket, 5000);
        };

        ws.onerror = (err) => {
          console.warn("WebSocket status: Reconnecting to Real-Time Event Pipeline.");
          ws?.close();
        };
      } catch (err) {
        console.warn("WebSocket setup pending:", err);
        reconnectTimeout = setTimeout(connectWebSocket, 5000);
      }
    };

    connectWebSocket();

    return () => {
      clearInterval(pollInterval);
      if (ws) {
        ws.onclose = null; // Prevent reconnect trigger on manual cleanup
        ws.close();
      }
      if (reconnectTimeout) {
        clearTimeout(reconnectTimeout);
      }
    };
  }, []);

  // Action Approval trigger
  const handleTriggerAction = async (action: { id: string; title: string; department: string; sector: string; impactMetric: string }) => {
    try {
      const res = await fetch("/api/workflows/approve", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          actionId: action.id,
          actionTitle: action.title,
          department: action.department,
          sector: action.sector,
          impactMetric: action.impactMetric,
        }),
      });

      if (res.ok) {
        const data = await res.json();
        setActiveApprovedWorkflow(data.approvedItem);
        // Instant refreshing of data states
        await fetchAllFeeds();
      }
    } catch (err) {
      console.error("Action dispatch error:", err);
    }
  };

  // Create citizen complaint trigger with auto-AI routing
  const handleAddComplaint = async (newComp: { title: string; description: string; location: string; imageUrl?: string }) => {
    try {
      const res = await fetch("/api/complaints", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(newComp),
      });

      if (res.ok) {
        // Refresh feeds to pull the newly routed complaint and notification
        await fetchAllFeeds();
      }
    } catch (err) {
      console.error("Error creating complaint:", err);
    }
  };

  // Sidebar Tabs Config
  const sidebarTabs: { id: ActiveTab; label: string; icon: React.ReactNode }[] = [
    { id: "dashboard", label: "Dashboard", icon: <LayoutDashboard className="w-4 h-4" /> },
    { id: "decision-center", label: "AI Decision Center", icon: <Brain className="w-4 h-4" /> },
    { id: "document-rag", label: "Policy RAG Space", icon: <Layers className="w-4 h-4" /> },
    { id: "analytics", label: "Analytics Trends", icon: <BarChart3 className="w-4 h-4" /> },
    { id: "complaints", label: "Citizen Claims", icon: <MessageSquare className="w-4 h-4" /> },
    { id: "emergency", label: "Emergency Center", icon: <Flame className="w-4 h-4" /> },
    { id: "utilities", label: "Smart Utilities", icon: <Zap className="w-4 h-4" /> },
    { id: "settings", label: "Settings", icon: <SettingsIcon className="w-4 h-4" /> },
  ];

  // Theme profiles configurations
  const themeClasses = {
    "glass-slate": {
      body: "bg-slate-950 text-slate-100",
      spheres: "from-indigo-600/10 to-violet-600/5",
      logoGlow: "text-indigo-400 drop-shadow-[0_0_8px_rgba(99,102,241,0.5)]",
    },
    "cyber-blue": {
      body: "bg-slate-950 text-slate-100",
      spheres: "from-cyan-600/15 to-blue-600/5",
      logoGlow: "text-cyan-400 drop-shadow-[0_0_10px_rgba(6,182,212,0.6)]",
    },
    "emerald-green": {
      body: "bg-zinc-950 text-zinc-100",
      spheres: "from-emerald-600/10 to-teal-600/5",
      logoGlow: "text-emerald-400 drop-shadow-[0_0_8px_rgba(16,185,129,0.5)]",
    },
  };

  if (viewLanding) {
    return <LandingPage onEnterApp={() => setViewLanding(false)} />;
  }

  return (
    <div className={`relative min-h-screen font-sans ${themeClasses[theme].body} overflow-hidden`}>
      
      {/* Background Glowing Ambient Orbs */}
      <div className="absolute inset-0 z-0 overflow-hidden pointer-events-none">
        <div className={`absolute -top-40 -left-40 w-96 h-96 rounded-full bg-gradient-to-tr ${themeClasses[theme].spheres} filter blur-3xl opacity-60 animate-pulse`} />
        <div className={`absolute bottom-20 -right-20 w-[450px] h-[450px] rounded-full bg-gradient-to-br ${themeClasses[theme].spheres} filter blur-3xl opacity-50`} />
      </div>

      {/* Main Grid Wrapper */}
      <div className="relative z-10 flex flex-col md:flex-row min-h-screen">
        
        {/* LEFT SIDEBAR (Desktop) */}
        <aside className="hidden md:flex flex-col justify-between w-64 bg-slate-950/80 border-r border-slate-900/60 p-5 backdrop-blur-2xl">
          <div className="space-y-6">
            
            {/* Header branding */}
            <div className="flex items-center gap-2.5 pb-4 border-b border-slate-900/60">
              <div className="w-8 h-8 rounded-xl bg-slate-900 flex items-center justify-center border border-slate-800">
                <Sparkles className={`w-4 h-4 ${themeClasses[theme].logoGlow}`} />
              </div>
              <div>
                <h1 className="text-sm font-sans font-extrabold tracking-tight text-white uppercase">
                  CommunityOS
                </h1>
                <span className="text-[10px] font-mono font-semibold text-slate-400 uppercase tracking-widest block leading-none mt-0.5">
                  Smart Admin
                </span>
              </div>
            </div>

            {/* Navigation Menus */}
            <nav className="space-y-1.5">
              {sidebarTabs.map((tab) => {
                const isActive = activeTab === tab.id;
                return (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id)}
                    className={`w-full py-2.5 px-3 rounded-xl font-mono text-[11px] font-bold tracking-wide transition-all flex items-center gap-3 relative cursor-pointer ${
                      isActive
                        ? "bg-slate-900 text-cyan-200 border border-slate-800/80 shadow-lg"
                        : "text-slate-400 hover:text-slate-200 hover:bg-slate-950/40"
                    }`}
                  >
                    {isActive && (
                      <motion.div
                        layoutId="activeTabGlow"
                        className="absolute left-0 top-1/4 bottom-1/4 w-0.5 bg-cyan-400 rounded-r"
                      />
                    )}
                    <span className={isActive ? "text-cyan-400" : "text-slate-500"}>
                      {tab.icon}
                    </span>
                    {tab.label}
                  </button>
                );
              })}
            </nav>
          </div>

          {/* Lower profile block */}
          <div className="pt-4 border-t border-slate-900/60 flex items-center justify-between font-mono text-[10px] text-slate-500">
            <span className="flex items-center gap-1">
              <Activity className="w-3.5 h-3.5 text-cyan-500 animate-pulse" />
              STATION-01
            </span>
            <span className="text-white font-bold uppercase">v1.2.0</span>
          </div>
        </aside>

        {/* TOP MOBILE MENU */}
        <header className="md:hidden bg-slate-950/90 border-b border-slate-900/60 p-4 flex items-center justify-between backdrop-blur-2xl relative z-40">
          <div className="flex items-center gap-2">
            <Sparkles className={`w-4 h-4 ${themeClasses[theme].logoGlow}`} />
            <span className="text-xs font-sans font-extrabold text-white uppercase tracking-wider">
              CommunityOS
            </span>
          </div>
          <button
            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
            className="p-1.5 text-slate-400 hover:text-white bg-slate-900 rounded-lg border border-slate-800"
          >
            {isMobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        </header>

        {/* Mobile Navigation Drawer */}
        <AnimatePresence>
          {isMobileMenuOpen && (
            <motion.div
              initial={{ opacity: 0, y: -20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="md:hidden absolute top-[57px] left-0 right-0 z-30 bg-slate-950/95 border-b border-slate-800 p-4 space-y-2 backdrop-blur-3xl font-mono text-xs"
            >
              {sidebarTabs.map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => {
                    setActiveTab(tab.id);
                    setIsMobileMenuOpen(false);
                  }}
                  className={`w-full text-left p-3 rounded-lg flex items-center gap-3 ${
                    activeTab === tab.id
                      ? "bg-slate-900 text-cyan-200 font-bold border border-slate-800"
                      : "text-slate-400"
                  }`}
                >
                  {tab.icon}
                  {tab.label}
                </button>
              ))}
            </motion.div>
          )}
        </AnimatePresence>

        {/* MAIN BODY VIEW ROUTING CONTAINER */}
        <main className="flex-1 overflow-y-auto p-4 md:p-8 space-y-6">
          
          <AnimatePresence mode="wait">
            <motion.div
              key={activeTab}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.2 }}
            >
              {activeTab === "dashboard" && (
                <DashboardView
                  stats={stats}
                  traffic={traffic}
                  emergencies={emergency}
                  aqiList={airQuality}
                  water={water}
                  onTriggerAction={handleTriggerAction}
                  onNavigateToTab={setActiveTab}
                />
              )}

              {activeTab === "decision-center" && (
                <DecisionCenterView onTriggerAction={handleTriggerAction} />
              )}

              {activeTab === "document-rag" && (
                <DocumentRagView />
              )}

              {activeTab === "analytics" && (
                <AnalyticsView
                  traffic={traffic}
                  weather={weather}
                  airQuality={airQuality}
                  complaints={complaints}
                  power={power}
                  water={water}
                  hospital={hospital}
                />
              )}

              {activeTab === "complaints" && (
                <ComplaintsView
                  complaints={complaints}
                  onAddComplaint={handleAddComplaint}
                />
              )}

              {activeTab === "emergency" && (
                <EmergencyView
                  emergencies={emergency}
                  onTriggerEmergencyAction={handleTriggerAction}
                />
              )}

              {activeTab === "utilities" && (
                <UtilitiesView
                  water={water}
                  power={power}
                  onTriggerUtilityAction={handleTriggerAction}
                />
              )}

              {activeTab === "settings" && (
                <SettingsView
                  theme={theme}
                  onChangeTheme={setTheme}
                />
              )}
            </motion.div>
          </AnimatePresence>

        </main>

      </div>

      {/* RAG DISPATCH WORKFLOW MODAL */}
      <AnimatePresence>
        {activeApprovedWorkflow && (
          <WorkflowModal
            action={activeApprovedWorkflow}
            onClose={() => setActiveApprovedWorkflow(null)}
          />
        )}
      </AnimatePresence>

    </div>
  );
}
