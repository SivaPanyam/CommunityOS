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

import { useCityStore } from "./store/useCityStore";
import { useCityData } from "./hooks/useCityData";

export default function App() {
  const { activeTab, viewLanding, theme, activeApprovedWorkflow, setActiveTab, setViewLanding, setTheme, setActiveApprovedWorkflow } = useCityStore();
  const { data, isLoading, isWsReconnecting, triggerAction, addComplaint } = useCityData();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  // Fallbacks if data loading or failed
  const stats = data?.stats || {};
  const traffic = data?.traffic || [];
  const weather = data?.weather || [];
  const airQuality = data?.airQuality || [];
  const complaints = data?.complaints || [];
  const power = data?.power || [];
  const water = data?.water || [];
  const hospital = data?.hospital || [];
  const emergency = data?.emergency || [];
  const citizenFeedback = data?.citizenFeedback || [];

  const handleTriggerAction = async (action: { id: string; title: string; department: string; sector: string; impactMetric: string }) => {
    try {
      const result = await triggerAction(action);
      if (result && result.approvedItem) {
        setActiveApprovedWorkflow(result.approvedItem);
      }
    } catch (err) {
      console.error("Action dispatch error:", err);
    }
  };

  const handleAddComplaint = async (newComp: { title: string; description: string; location: string; imageUrl?: string }) => {
    try {
      await addComplaint(newComp);
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
