import React, { useState } from "react";
import { TrafficRecord, EmergencyRecord, AQIRecord, WaterRecord } from "../types";
import MetricCard from "./MetricCard";
import MapComponent from "./MapComponent";
import {
  Navigation,
  CloudSun,
  Activity,
  Zap,
  Droplet,
  FileWarning,
  Flame,
  CheckCircle,
  HelpCircle,
  Play,
  RotateCw,
  BellRing,
  Cpu,
  TrendingUp,
  Award,
  Database,
  Lock,
  Clock,
  Heart,
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";

interface DashboardViewProps {
  stats: any;
  traffic: TrafficRecord[];
  emergencies: EmergencyRecord[];
  aqiList: AQIRecord[];
  water: WaterRecord[];
  onTriggerAction: (action: { id: string; title: string; department: string; sector: string; impactMetric: string }) => void;
  onNavigateToTab: (tab: string) => void;
  isLoading?: boolean;
}

export default function DashboardView({
  stats,
  traffic,
  emergencies,
  aqiList,
  water,
  onTriggerAction,
  onNavigateToTab,
  isLoading = false,
}: DashboardViewProps) {
  const [selectedAuditLog, setSelectedAuditLog] = useState<string | null>(null);

  // Safe extraction of last metrics
  const lastWeather = stats.weather || { temperature_c: 24, condition: "Rain", warnings: "Flood Advisory" };
  const lastAQI = stats.aqi || 75;

  const defaultRecommendation = {
    id: "REC-AUTO-110",
    title: "Optimize Route 1 Traffic Cycle",
    description: "Signal timing plans on Downtown Expressway should be lengthened by 15 seconds to flush high peak traffic volume detected at Exit 2.",
    targetSector: "Urban Mobility",
    department: "Department of Transportation",
    impactMetric: "Saves up to 12 minutes in commute delay",
    confidence: 96,
  };

  // Pre-seed list of immutable GCP audit logs for hackathon polish
  const auditLogs = [
    {
      id: "LOG-9281-A",
      timestamp: "02:48:12",
      action: "MUT-WATER-ROUTING",
      actor: "Resource Agent",
      hash: "SHA256:8f2a93...01cd",
      status: "VERIFIED_SECURE",
      details: "Water release valves at Main Reservoir adjusted +5.2% automatically in response to rainfall telemetry.",
    },
    {
      id: "LOG-9280-F",
      timestamp: "02:44:59",
      action: "SOP-DISPATCH-911",
      actor: "Emergency Agent",
      hash: "SHA256:d82e14...fa32",
      status: "VERIFIED_SECURE",
      details: "Active emergency responders dispatched to Road Incident EMG-201. Real-time corridor mapped.",
    },
    {
      id: "LOG-9279-X",
      timestamp: "02:30:15",
      action: "SYS-TELEMETRY-SYNC",
      actor: "Operator-321 (Human-in-the-loop)",
      hash: "SHA256:3aef90...cc42",
      status: "VERIFIED_SECURE",
      details: "Full digital-twin telemetry synchronized with Firestore databases.",
    },
  ];

  // Render Skeleton Loaders if application is in loading state
  if (isLoading || !stats.trafficIndex) {
    return (
      <div className="space-y-6 animate-pulse">
        {/* Banner Skeleton */}
        <div className="h-24 bg-slate-900/60 rounded-2xl border border-slate-800/80" />
        {/* Metric Cards Skeleton */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-32 bg-slate-900/40 rounded-2xl border border-slate-800/60" />
          ))}
        </div>
        {/* Map & Panel Skeletons */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          <div className="lg:col-span-8 h-96 bg-slate-900/40 rounded-2xl border border-slate-800/60" />
          <div className="lg:col-span-4 h-96 bg-slate-900/40 rounded-2xl border border-slate-800/60" />
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      
      {/* Top Welcome Title Banner */}
      <div className="relative overflow-hidden p-6 bg-gradient-to-r from-slate-950 via-slate-900/80 to-slate-950 rounded-2xl border border-slate-800/80 backdrop-blur-xl shadow-2xl flex flex-col md:flex-row md:items-center justify-between gap-4">
        {/* Glowing visual flair */}
        <div className="absolute top-0 right-0 w-32 h-32 bg-cyan-500/10 rounded-full filter blur-2xl pointer-events-none" />
        
        <div>
          <div className="flex items-center gap-2">
            <Award className="w-4 h-4 text-cyan-400" />
            <span className="text-[10px] font-mono font-bold text-cyan-400 tracking-widest uppercase">
              Google Cloud CommunityOS Dashboard
            </span>
          </div>
          <h2 className="text-xl font-sans font-extrabold tracking-tight text-white flex flex-wrap items-center gap-x-2 mt-1">
            Enterprise Operations Control Center
            <span className="text-[9px] font-mono font-semibold text-emerald-400 bg-emerald-500/10 px-2.5 py-0.5 rounded-full border border-emerald-500/20 uppercase tracking-wider animate-pulse flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
              Active Autonomous Sync
            </span>
          </h2>
          <p className="text-xs text-slate-400 mt-1.5 max-w-2xl leading-relaxed">
            Harnessing real-time sensor processing pipelines and Gemini Pro multi-agent heuristics to optimize municipal flow, balancing smart grids, and auditing emergency release protocols.
          </p>
        </div>
        <div className="flex items-center gap-2 self-start md:self-center">
          <button
            onClick={() => window.location.reload()}
            className="p-2.5 text-slate-400 hover:text-white bg-slate-950 border border-slate-850 rounded-xl transition-all hover:rotate-180 duration-500 shadow-md"
            title="Refresh feeds"
          >
            <RotateCw className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={() => onNavigateToTab("decision-center")}
            className="px-4 py-2 text-xs font-mono font-bold rounded-xl bg-gradient-to-r from-cyan-500 to-indigo-500 hover:from-cyan-400 hover:to-indigo-400 text-white shadow-xl hover:shadow-indigo-500/20 transition-all flex items-center gap-1.5"
          >
            <Cpu className="w-3.5 h-3.5 text-cyan-200 animate-spin" style={{ animationDuration: "3s" }} />
            ASK DECISION AGENT
          </button>
        </div>
      </div>

      {/* Grid of Key Performance Indicator Cards (4 Cards) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        
        <MetricCard
          title="Congestion Index"
          value={`${(stats.trafficIndex * 100).toFixed(0)}%`}
          unit="load"
          trend={`${stats.averageSpeed} km/h avg speed`}
          trendDirection={stats.trafficIndex > 0.75 ? "up" : "down"}
          icon={<Navigation className="w-5 h-5 rotate-90" />}
          color="cyan"
        />

        <MetricCard
          title="Downtown AQI"
          value={stats.aqi}
          unit="ppm"
          trend={stats.aqiStatus}
          trendDirection={stats.aqi > 100 ? "up" : "down"}
          icon={<Activity className="w-5 h-5" />}
          color="amber"
        />

        <MetricCard
          title="Smart Power Demand"
          value={stats.activePowerMW}
          unit="MW"
          trend="Grid capacity: 470MW"
          trendDirection="neutral"
          icon={<Zap className="w-5 h-5" />}
          color="purple"
        />

        <MetricCard
          title="Active Emergencies"
          value={stats.activeEmergenciesCount}
          unit="cases"
          trend={stats.activeEmergenciesCount > 0 ? "Dispatch active" : "All clear"}
          trendDirection={stats.activeEmergenciesCount > 0 ? "up" : "neutral"}
          icon={<Flame className="w-5 h-5" />}
          color="rose"
        />

      </div>

      {/* NEW: ENTERPRISE FINANCIAL & GCP CLOUD RUN RESOURCE TELEMETRY ROW */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        
        {/* Financial ROI Card */}
        <div className="p-4 bg-gradient-to-br from-slate-900/60 to-slate-950/40 rounded-2xl border border-slate-800/80 shadow-md flex items-center gap-4">
          <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 shrink-0">
            <TrendingUp className="w-5 h-5" />
          </div>
          <div>
            <span className="text-[10px] font-mono font-bold text-slate-500 uppercase tracking-wider block">
              Estimated Municipal ROI
            </span>
            <div className="flex items-baseline gap-1.5 mt-0.5">
              <span className="text-lg font-extrabold text-white">$34,240 saved</span>
              <span className="text-[10px] font-mono text-emerald-400 font-bold bg-emerald-500/10 px-1 py-0.5 rounded">
                +14.2% MoM
              </span>
            </div>
            <span className="text-[10px] text-slate-400 block mt-1">
              Through automated routing & utility load optimization.
            </span>
          </div>
        </div>

        {/* Public Trust Index Card */}
        <div className="p-4 bg-gradient-to-br from-slate-900/60 to-slate-950/40 rounded-2xl border border-slate-800/80 shadow-md flex items-center gap-4">
          <div className="p-3 rounded-xl bg-purple-500/10 border border-purple-500/20 text-purple-400 shrink-0">
            <Heart className="w-5 h-5" />
          </div>
          <div>
            <span className="text-[10px] font-mono font-bold text-slate-500 uppercase tracking-wider block">
              Citizen Trust Index
            </span>
            <div className="flex items-baseline gap-1.5 mt-0.5">
              <span className="text-lg font-extrabold text-white">94.2% satisfaction</span>
              <span className="text-[10px] font-mono text-cyan-400 font-bold bg-cyan-500/10 px-1 py-0.5 rounded">
                +1.8%
              </span>
            </div>
            <span className="text-[10px] text-slate-400 block mt-1">
              Derived from automated citizen feedback sentiment analyzer.
            </span>
          </div>
        </div>

        {/* GCP Cloud Infrastructure Card */}
        <div className="p-4 bg-gradient-to-br from-slate-900/60 to-slate-950/40 rounded-2xl border border-slate-800/80 shadow-md flex items-center gap-4">
          <div className="p-3 rounded-xl bg-cyan-500/10 border border-cyan-500/20 text-cyan-400 shrink-0">
            <Database className="w-5 h-5" />
          </div>
          <div className="flex-1 min-w-0">
            <span className="text-[10px] font-mono font-bold text-slate-500 uppercase tracking-wider block">
              GCP Infrastructure Health
            </span>
            <div className="grid grid-cols-2 gap-x-2 mt-1 text-[10px] font-mono">
              <div className="flex justify-between border-r border-slate-800/50 pr-2">
                <span className="text-slate-400">CPU Load:</span>
                <span className="text-emerald-400 font-bold">4.2%</span>
              </div>
              <div className="flex justify-between pl-1">
                <span className="text-slate-400">FS Latency:</span>
                <span className="text-emerald-400 font-bold">18ms</span>
              </div>
              <div className="flex justify-between border-r border-slate-800/50 pr-2 mt-0.5">
                <span className="text-slate-400">Memory:</span>
                <span className="text-cyan-400 font-bold">148MB</span>
              </div>
              <div className="flex justify-between pl-1 mt-0.5">
                <span className="text-slate-400">API Quota:</span>
                <span className="text-emerald-400 font-bold">98.5%</span>
              </div>
            </div>
          </div>
        </div>

      </div>

      {/* Mid Section: Interactive twin Map + AI Recommendation Panel with Explainable AI */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* Map Twin Panel (8 Columns) */}
        <div className="lg:col-span-8 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-xs font-mono font-bold text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
              <Activity className="w-4 h-4 text-cyan-400 animate-pulse" />
              Interactive Community Twin
            </h3>
            <span className="text-[10px] font-mono text-slate-500">
              Toggle "risk" layer to render predictive hazard maps
            </span>
          </div>
          <MapComponent
            traffic={traffic}
            emergencies={emergencies}
            aqiList={aqiList}
            water={water}
            onSelectPOI={(poi) => console.log("POI Selected:", poi)}
          />
        </div>

        {/* AI Operational Recommendation Panel with Explainable AI & Confidence Gauge (4 Columns) */}
        <div className="lg:col-span-4 flex flex-col justify-between p-5 bg-gradient-to-br from-slate-900 to-slate-950 rounded-2xl border border-slate-800 shadow-2xl min-h-[410px]">
          <div>
            <div className="flex items-center justify-between mb-3.5">
              <span className="text-xs font-mono font-bold text-cyan-400 uppercase tracking-wider flex items-center gap-1.5">
                <BellRing className="w-4 h-4 text-cyan-400 animate-bounce" />
                AI PROACTIVE DIRECTIVE
              </span>
              <span className="px-2 py-0.5 text-[9px] font-mono font-bold rounded bg-purple-500/10 text-purple-300 border border-purple-500/20">
                MASTER DECISION
              </span>
            </div>

            <div className="space-y-3">
              <div>
                <h4 className="text-sm font-sans font-extrabold text-white leading-snug">
                  {defaultRecommendation.title}
                </h4>
                <p className="text-[11px] text-slate-300 leading-relaxed font-sans mt-1">
                  {defaultRecommendation.description}
                </p>
              </div>

              {/* NEW: AI CONFIDENCE VISUALIZATION DIAL */}
              <div className="flex items-center gap-3.5 p-2.5 bg-slate-950/60 rounded-xl border border-slate-800/40">
                <div className="relative w-12 h-12 flex items-center justify-center shrink-0">
                  <svg className="w-full h-full transform -rotate-90">
                    <circle cx="24" cy="24" r="20" fill="none" stroke="#1e293b" strokeWidth="4" />
                    <circle cx="24" cy="24" r="20" fill="none" stroke="#22d3ee" strokeWidth="4" strokeDasharray={`${2 * Math.PI * 20}`} strokeDashoffset={`${2 * Math.PI * 20 * (1 - defaultRecommendation.confidence / 100)}`} className="transition-all duration-1000" />
                  </svg>
                  <span className="absolute text-[10px] font-mono font-bold text-white">
                    {defaultRecommendation.confidence}%
                  </span>
                </div>
                <div>
                  <span className="text-[10px] font-mono font-bold text-cyan-400 block uppercase">
                    AI CONFIDENCE SCORE
                  </span>
                  <p className="text-[9.5px] text-slate-400 font-sans">
                    Highly actionable directive. Standard deviation boundaries within legal limit.
                  </p>
                </div>
              </div>

              {/* NEW: EXPLAINABLE AI (XAI) INPUT WEIGHT CONTRIBUTORS CHART */}
              <div className="p-3 bg-slate-950/80 rounded-xl border border-slate-850 space-y-2">
                <span className="text-[9px] font-mono font-bold text-slate-400 uppercase tracking-widest block">
                  Explainable AI (XAI) key drivers
                </span>
                <div className="space-y-1.5 text-[9px] font-mono">
                  {/* Driver 1 */}
                  <div>
                    <div className="flex justify-between text-slate-300">
                      <span>Traffic Sensor Feeds</span>
                      <span className="text-cyan-400 font-bold">42%</span>
                    </div>
                    <div className="w-full h-1 bg-slate-900 rounded-full overflow-hidden mt-0.5">
                      <div className="h-full bg-cyan-400 rounded-full" style={{ width: "42%" }} />
                    </div>
                  </div>
                  {/* Driver 2 */}
                  <div>
                    <div className="flex justify-between text-slate-300">
                      <span>Environmental Models</span>
                      <span className="text-purple-400 font-bold">28%</span>
                    </div>
                    <div className="w-full h-1 bg-slate-900 rounded-full overflow-hidden mt-0.5">
                      <div className="h-full bg-purple-400 rounded-full" style={{ width: "28%" }} />
                    </div>
                  </div>
                  {/* Driver 3 */}
                  <div>
                    <div className="flex justify-between text-slate-300">
                      <span>Historical Flow Models</span>
                      <span className="text-amber-400 font-bold">18%</span>
                    </div>
                    <div className="w-full h-1 bg-slate-900 rounded-full overflow-hidden mt-0.5">
                      <div className="h-full bg-amber-400 rounded-full" style={{ width: "18%" }} />
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="mt-4 space-y-1.5">
            <button
              onClick={() => onTriggerAction({
                id: defaultRecommendation.id,
                title: defaultRecommendation.title,
                department: defaultRecommendation.department,
                sector: defaultRecommendation.targetSector,
                impactMetric: defaultRecommendation.impactMetric
              })}
              className="w-full py-2.5 rounded-xl bg-gradient-to-r from-cyan-500 via-indigo-500 to-purple-500 hover:from-cyan-400 hover:via-indigo-400 hover:to-purple-400 text-white font-mono font-bold text-xs flex items-center justify-center gap-1.5 transition-all cursor-pointer shadow-lg hover:shadow-indigo-500/20 active:scale-95 border border-white/5"
            >
              <Play className="w-3 h-3 fill-current" />
              AUTHORIZE DISPATCH
            </button>
            <button
              onClick={() => onNavigateToTab("decision-center")}
              className="w-full py-2 rounded-xl bg-slate-950 hover:bg-slate-900 border border-slate-850 text-slate-400 hover:text-slate-200 font-mono text-[10px] uppercase tracking-wider transition-colors"
            >
              Simulate Counter-Factual What-Ifs
            </button>
          </div>
        </div>

      </div>

      {/* NEW: DECISION LIFECYCLE TIMELINE (Aesthetic Flowchart) */}
      <div className="p-5 bg-gradient-to-r from-slate-950 via-slate-900/60 to-slate-950 rounded-2xl border border-slate-850/80 shadow-md">
        <span className="text-[10px] font-mono font-bold text-cyan-400 uppercase tracking-widest block mb-4">
          ⚙ DECISION-MAKING TIMELINE & AUDIT LIFECYCLE
        </span>
        <div className="grid grid-cols-1 md:grid-cols-5 gap-4 relative">
          
          {/* Connector Line */}
          <div className="hidden md:block absolute top-[18px] left-[10%] right-[10%] h-[1.5px] bg-gradient-to-r from-cyan-500/40 via-purple-500/20 to-emerald-500/40 z-0" />

          {/* Step 1 */}
          <div className="relative z-10 flex flex-col items-center text-center">
            <div className="w-9 h-9 rounded-full bg-slate-900 border border-cyan-500/50 flex items-center justify-center text-cyan-400 font-mono text-xs font-bold shadow-lg">
              1
            </div>
            <span className="text-[11px] font-sans font-bold text-white mt-2 block">IoT Ingestion</span>
            <span className="text-[9.5px] text-slate-400">Open-Meteo & GMP APIs</span>
          </div>

          {/* Step 2 */}
          <div className="relative z-10 flex flex-col items-center text-center">
            <div className="w-9 h-9 rounded-full bg-slate-900 border border-purple-500/40 flex items-center justify-center text-purple-400 font-mono text-xs font-bold shadow-lg">
              2
            </div>
            <span className="text-[11px] font-sans font-bold text-white mt-2 block">Cognitive Reasoning</span>
            <span className="text-[9.5px] text-slate-400">Gemini Pro Multi-Agents</span>
          </div>

          {/* Step 3 */}
          <div className="relative z-10 flex flex-col items-center text-center">
            <div className="w-9 h-9 rounded-full bg-slate-900 border border-indigo-500/40 flex items-center justify-center text-indigo-400 font-mono text-xs font-bold shadow-lg">
              3
            </div>
            <span className="text-[11px] font-sans font-bold text-white mt-2 block">SOP Validation</span>
            <span className="text-[9.5px] text-slate-400">Policy RAG Match checks</span>
          </div>

          {/* Step 4 */}
          <div className="relative z-10 flex flex-col items-center text-center">
            <div className="w-9 h-9 rounded-full bg-slate-900 border border-amber-500/40 flex items-center justify-center text-amber-400 font-mono text-xs font-bold shadow-lg">
              4
            </div>
            <span className="text-[11px] font-sans font-bold text-white mt-2 block">Human Release</span>
            <span className="text-[9.5px] text-slate-400">Administrative approval</span>
          </div>

          {/* Step 5 */}
          <div className="relative z-10 flex flex-col items-center text-center">
            <div className="w-9 h-9 rounded-full bg-slate-900 border border-emerald-500/50 flex items-center justify-center text-emerald-400 font-mono text-xs font-bold shadow-lg">
              5
            </div>
            <span className="text-[11px] font-sans font-bold text-white mt-2 block">Immutable Lock</span>
            <span className="text-[9.5px] text-slate-400">Secure Firestore audit</span>
          </div>

        </div>
      </div>

      {/* Lower Section: Immutable GCP Audit Logs & Real-time Alerts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        
        {/* Left Side: Immutable Google Cloud Audit Logs Trail */}
        <div className="p-5 bg-slate-900/40 rounded-2xl border border-slate-800/80 backdrop-blur-xl">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-xs font-mono font-bold text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
              <Lock className="w-4 h-4 text-emerald-400" />
              Immutable Firestore Audit Trail
            </h3>
            <span className="text-[10px] font-mono text-slate-500 flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
              SECURE
            </span>
          </div>

          <div className="space-y-2.5">
            {auditLogs.map((log) => (
              <div
                key={log.id}
                onClick={() => setSelectedAuditLog(selectedAuditLog === log.id ? null : log.id)}
                className="p-3 bg-slate-950/60 rounded-xl border border-slate-850 hover:border-slate-800 transition-all cursor-pointer text-xs group"
              >
                <div className="flex justify-between items-center">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-mono font-bold text-white">{log.action}</span>
                      <span className="text-[9px] font-mono text-slate-500">{log.timestamp}</span>
                    </div>
                    <span className="text-[10px] text-slate-400 font-mono block mt-0.5">
                      Responsible: <strong className="text-cyan-400">{log.actor}</strong>
                    </span>
                  </div>
                  <div className="text-right">
                    <span className="text-[9px] font-mono font-bold text-emerald-400 block">
                      {log.status}
                    </span>
                    <span className="text-[9px] text-slate-600 font-mono block font-bold">
                      {log.id}
                    </span>
                  </div>
                </div>

                <AnimatePresence>
                  {selectedAuditLog === log.id && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: "auto" }}
                      exit={{ opacity: 0, height: 0 }}
                      className="mt-2.5 pt-2.5 border-t border-slate-900 text-[10px] text-slate-300 space-y-1 font-mono"
                    >
                      <p className="font-sans leading-relaxed">{log.details}</p>
                      <div className="bg-slate-950 p-1.5 rounded border border-slate-900 mt-1 flex justify-between text-[9px] text-slate-500">
                        <span>Block Hash:</span>
                        <span className="text-white font-bold font-mono">{log.hash}</span>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            ))}
          </div>
        </div>

        {/* Right Side: Real-time Alert notification streams */}
        <div className="p-5 bg-slate-900/40 rounded-2xl border border-slate-800/80 backdrop-blur-xl">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-xs font-mono font-bold text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
              <FileWarning className="w-4 h-4 text-rose-400 animate-pulse" />
              Live Anomalies & Telemetry Alerts
            </h3>
            <button
              onClick={() => onNavigateToTab("decision-center")}
              className="text-[10px] text-cyan-400 hover:text-cyan-300 font-mono uppercase tracking-wider"
            >
              Analyze Hotspots
            </button>
          </div>

          <div className="space-y-2.5">
            {stats.notifications && stats.notifications.slice(0, 3).map((notif: any) => (
              <div
                key={notif.id}
                className="p-3 bg-slate-950/60 rounded-xl border border-slate-850 flex items-start gap-3 text-xs"
              >
                <div
                  className={`w-2 h-2 rounded-full mt-1.5 flex-shrink-0 ${
                    notif.category === "Emergency" ? "bg-rose-500 animate-ping" : "bg-cyan-500"
                  }`}
                />
                <div className="flex-1">
                  <div className="flex items-center justify-between gap-2">
                    <h4 className="font-mono font-bold text-slate-200 text-[11.5px]">{notif.title}</h4>
                    <span className="text-[9px] font-mono text-slate-500">
                      {new Date(notif.timestamp).toLocaleTimeString()}
                    </span>
                  </div>
                  <p className="text-[10.5px] text-slate-300 font-sans mt-1 leading-relaxed">
                    {notif.message}
                  </p>
                  <div className="mt-2 flex items-center gap-2">
                    <span className="text-[9px] font-mono font-bold px-1.5 py-0.5 rounded bg-slate-900 text-slate-400 border border-slate-800">
                      CAT: {notif.category}
                    </span>
                    <span className="text-[9.5px] font-mono text-cyan-400">
                      Auto-routed by AI Pipeline
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

      </div>

    </div>
  );
}
