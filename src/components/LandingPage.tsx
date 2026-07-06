import React, { useState, useEffect } from "react";
import { motion } from "motion/react";
import {
  Sparkles,
  Layers,
  Activity,
  ArrowRight,
  Cpu,
  Shield,
  Gauge,
  CheckCircle2,
  Database,
  CloudLightning,
  Workflow,
  Globe2,
} from "lucide-react";

interface LandingPageProps {
  onEnterApp: () => void;
}

export default function LandingPage({ onEnterApp }: LandingPageProps) {
  const [latency, setLatency] = useState(24);
  const [nodesCount, setNodesCount] = useState(1482);
  const [uptime, setUptime] = useState(99.984);

  // Live simulation of high-fidelity IoT connection telemetry
  useEffect(() => {
    const interval = setInterval(() => {
      setLatency(prev => {
        const offset = Math.random() > 0.5 ? 1 : -1;
        const next = prev + offset;
        return next < 18 ? 18 : next > 32 ? 32 : next;
      });
      setNodesCount(prev => prev + (Math.random() > 0.7 ? 1 : Math.random() > 0.85 ? -1 : 0));
      setUptime(prev => {
        const fluctuation = (Math.random() * 0.0001);
        return Math.min(100, Math.max(99.98, prev + (Math.random() > 0.5 ? fluctuation : -fluctuation)));
      });
    }, 3000);
    return () => clearInterval(interval);
  }, []);

  const features = [
    {
      icon: <Cpu className="w-5 h-5 text-cyan-400" />,
      title: "Multi-Agent AI Decision Coordinator",
      description: "Harnesses Google Cloud Gemini Pro models to synthesize cross-correlated hazard feeds (traffic gridlocks, power loads, flash-floods) into automated standard operating procedures (SOPs).",
    },
    {
      icon: <Layers className="w-5 h-5 text-purple-400" />,
      title: "Cognitive Digital Twin & Maps",
      description: "Renders smart vector digital twin visualizations overlaying OpenStreetMap data and real-time corridor congestion, municipal incident cases, and air quality indexes.",
    },
    {
      icon: <Shield className="w-5 h-5 text-emerald-400" />,
      title: "Immutable Operations Audit Logs",
      description: "Maintains a transparent, cryptographically sound log of every AI analysis, human operator authorization, and API dispatch, matching enterprise governance standards.",
    },
    {
      icon: <Gauge className="w-5 h-5 text-amber-400" />,
      title: "Predictive Resource Allocation",
      description: "Estimates and balances water reservoir pressures, renewable solar-generation margins, and routes emergency response squads to optimize civic infrastructure load.",
    },
  ];

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col relative overflow-hidden select-none">
      
      {/* Decorative High-Contrast Glow Elements */}
      <div className="absolute inset-0 z-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-[20%] -left-[10%] w-[600px] h-[600px] rounded-full bg-gradient-to-tr from-cyan-500/10 to-indigo-500/5 filter blur-[120px] opacity-75 animate-pulse" />
        <div className="absolute bottom-[10%] right-[-10%] w-[550px] h-[550px] rounded-full bg-gradient-to-br from-purple-500/10 to-pink-500/5 filter blur-[110px] opacity-60" />
        
        {/* Subtle Tech-Grid overlay */}
        <div 
          className="absolute inset-0 opacity-[0.02]" 
          style={{
            backgroundImage: `radial-gradient(circle, #38bdf8 1px, transparent 1px)`,
            backgroundSize: "24px 24px",
          }}
        />
      </div>

      {/* Navigation Header */}
      <header className="relative z-10 border-b border-slate-900/60 bg-slate-950/40 backdrop-blur-md px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-slate-900 flex items-center justify-center border border-slate-800 shadow-inner">
            <Sparkles className="w-4 h-4 text-cyan-400 drop-shadow-[0_0_8px_rgba(34,211,238,0.5)]" />
          </div>
          <div>
            <span className="text-xs font-mono font-bold text-slate-400 uppercase tracking-widest leading-none block">
              Google Cloud Partner
            </span>
            <h1 className="text-sm font-sans font-extrabold tracking-tight text-white uppercase leading-none mt-1">
              CommunityOS
            </h1>
          </div>
        </div>

        {/* Live System Stats Header Pill */}
        <div className="hidden sm:flex items-center gap-5 font-mono text-[11px] text-slate-400">
          <span className="flex items-center gap-1.5 bg-slate-900/60 px-3 py-1.5 rounded-lg border border-slate-800">
            <Globe2 className="w-3.5 h-3.5 text-cyan-400" />
            Live Digital Twin: <strong className="text-white">{nodesCount} nodes</strong>
          </span>
          <span className="flex items-center gap-1.5 bg-slate-900/60 px-3 py-1.5 rounded-lg border border-slate-800">
            <Database className="w-3.5 h-3.5 text-emerald-400 animate-pulse" />
            Uptime: <strong className="text-white">{uptime.toFixed(3)}%</strong>
          </span>
        </div>
      </header>

      {/* Main Hero & Content Grid */}
      <main className="flex-1 relative z-10 max-w-7xl w-full mx-auto px-6 md:px-12 py-12 md:py-20 flex flex-col lg:flex-row items-center gap-12">
        
        {/* Left Hand: Hero Copy and Launch Actions */}
        <div className="flex-1 space-y-8 text-center lg:text-left">
          
          {/* Hackathon Badge */}
          <div className="inline-flex items-center gap-2 bg-gradient-to-r from-cyan-500/10 via-indigo-500/10 to-purple-500/10 border border-indigo-500/20 px-3 py-1.5 rounded-full backdrop-blur-md">
            <span className="w-2 h-2 rounded-full bg-cyan-400 animate-ping" />
            <span className="text-[10px] font-mono font-bold tracking-widest text-cyan-200 uppercase">
              Google Cloud Hackathon 2026 Entry
            </span>
          </div>

          <div className="space-y-4">
            <h2 className="text-3xl md:text-5xl font-sans font-extrabold text-white tracking-tight leading-[1.1] select-text">
              The AI Operating System for{" "}
              <span className="bg-clip-text text-transparent bg-gradient-to-r from-cyan-400 via-indigo-400 to-purple-400">
                Cognitive Smart Communities
              </span>
            </h2>
            <p className="text-sm md:text-base text-slate-300 max-w-xl leading-relaxed select-text font-sans">
              An enterprise-grade, multi-agent AI system designed to coordinate municipal hazard pipelines, predict congestion, load-balance renewable utilities, and streamline emergency response.
            </p>
          </div>

          {/* Action Trigger Block */}
          <div className="flex flex-col sm:flex-row items-center gap-4 justify-center lg:justify-start">
            <button
              onClick={onEnterApp}
              className="w-full sm:w-auto px-8 py-4 bg-gradient-to-r from-cyan-500 via-indigo-500 to-purple-500 hover:from-cyan-400 hover:via-indigo-400 hover:to-purple-400 text-white font-sans font-bold text-sm rounded-2xl shadow-2xl shadow-cyan-500/20 hover:shadow-indigo-500/30 transition-all flex items-center justify-center gap-2 group cursor-pointer border border-white/10"
            >
              LAUNCH CONTROL CONSOLE
              <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-1" />
            </button>
            <div className="flex flex-col items-center sm:items-start font-mono text-[10px] text-slate-500">
              <span className="flex items-center gap-1.5 text-slate-400">
                <CloudLightning className="w-3.5 h-3.5 text-cyan-400" />
                Connection: <strong>SECURE (TLS 1.3)</strong>
              </span>
              <span className="mt-0.5">
                Latency: <strong className="text-cyan-400">{latency}ms</strong> | Region: <strong className="text-slate-400">asia-southeast1</strong>
              </span>
            </div>
          </div>

          {/* Architecture Checklist indicators */}
          <div className="grid grid-cols-2 gap-4 pt-4 text-left border-t border-slate-900/60 max-w-md mx-auto lg:mx-0">
            <div className="flex items-start gap-2">
              <CheckCircle2 className="w-4 h-4 text-cyan-400 shrink-0 mt-0.5" />
              <div>
                <span className="text-[11px] font-sans font-bold text-white block">Explainable AI</span>
                <span className="text-[10px] text-slate-400">Actionable confidence scoring</span>
              </div>
            </div>
            <div className="flex items-start gap-2">
              <CheckCircle2 className="w-4 h-4 text-purple-400 shrink-0 mt-0.5" />
              <div>
                <span className="text-[11px] font-sans font-bold text-white block">Digital Twin Map</span>
                <span className="text-[10px] text-slate-400">Risk heatmaps and overlays</span>
              </div>
            </div>
            <div className="flex items-start gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
              <div>
                <span className="text-[11px] font-sans font-bold text-white block">Audit Trail</span>
                <span className="text-[10px] text-slate-400">Immutable Firestore logs</span>
              </div>
            </div>
            <div className="flex items-start gap-2">
              <CheckCircle2 className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
              <div>
                <span className="text-[11px] font-sans font-bold text-white block">Decision Timelines</span>
                <span className="text-[10px] text-slate-400">Chronological dispatches</span>
              </div>
            </div>
          </div>

        </div>

        {/* Right Hand: Interactive Showcase Feature Bento Cards */}
        <div className="flex-1 w-full grid grid-cols-1 md:grid-cols-2 gap-4">
          {features.map((feat, idx) => (
            <motion.div
              key={idx}
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: idx * 0.1, duration: 0.4 }}
              className="p-5 rounded-2xl bg-slate-900/40 border border-slate-800/80 hover:border-slate-700/50 hover:bg-slate-900/60 transition-all shadow-xl group text-left flex flex-col justify-between"
            >
              <div className="space-y-3">
                <div className="p-2 w-fit rounded-xl bg-slate-950 border border-slate-850 group-hover:scale-105 transition-transform">
                  {feat.icon}
                </div>
                <h3 className="text-xs font-sans font-bold text-white uppercase tracking-wider">
                  {feat.title}
                </h3>
                <p className="text-[11px] text-slate-400 leading-relaxed font-sans">
                  {feat.description}
                </p>
              </div>
              <div className="mt-4 pt-3 border-t border-slate-950 flex items-center justify-between text-[9px] font-mono text-slate-500">
                <span>SYSTEM MODULE</span>
                <span className="text-cyan-400 group-hover:translate-x-1 transition-transform">ACTIVE →</span>
              </div>
            </motion.div>
          ))}
        </div>

      </main>

      {/* Footer credits and stack alignment */}
      <footer className="relative z-10 border-t border-slate-900/40 bg-slate-950/60 px-6 py-5 flex flex-col sm:flex-row items-center justify-between gap-4 text-[10px] font-mono text-slate-500 max-w-7xl w-full mx-auto">
        <div className="flex items-center gap-1.5">
          <Activity className="w-3.5 h-3.5 text-cyan-500 animate-pulse" />
          <span>STATION-01 SYSTEM READY</span>
        </div>
        <div className="flex items-center gap-4">
          <span>GCP CLOUD RUN • FIRESTORE • GEMINI PRO SDK</span>
          <span className="text-white font-bold bg-slate-900 border border-slate-800 px-2 py-0.5 rounded">v1.2.0</span>
        </div>
      </footer>

    </div>
  );
}
