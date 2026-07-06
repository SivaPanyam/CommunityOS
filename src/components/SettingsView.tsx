import React, { useState } from "react";
import { SmartCityTheme } from "../types";
import {
  Settings,
  Cpu,
  Layers,
  Shield,
  BellRing,
  CheckCircle,
  HelpCircle,
  Key,
} from "lucide-react";

interface SettingsViewProps {
  theme: SmartCityTheme;
  onChangeTheme: (theme: SmartCityTheme) => void;
}

export default function SettingsView({ theme, onChangeTheme }: SettingsViewProps) {
  const [selectedModel, setSelectedModel] = useState("gemini-3.5-flash");
  const [enablePredictions, setEnablePredictions] = useState(true);
  const [notifyPriority, setNotifyPriority] = useState("High");

  return (
    <div className="space-y-6 max-w-4xl">
      
      {/* Top Banner */}
      <div className="p-6 bg-slate-900/40 rounded-2xl border border-slate-800/80 backdrop-blur-xl flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-sans font-bold tracking-tight text-white flex items-center gap-2">
            System Preferences & Configurations
            <span className="text-xs font-mono font-medium text-cyan-400 bg-cyan-500/10 px-2 py-0.5 rounded-full border border-cyan-500/20">
              ● ADMIN PROFILE ACTIVE
            </span>
          </h2>
          <p className="text-xs text-slate-400 mt-1">
            Configure Gemini reasoning parameters, smart-city interface visual profiles, and cloud audit trace logging parameters.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">

        {/* 1. Gemini Model Config block */}
        <div className="p-5 bg-slate-900/40 rounded-2xl border border-slate-800/80 backdrop-blur-xl space-y-4">
          <span className="text-xs font-mono font-bold text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
            <Cpu className="w-4 h-4 text-cyan-400" />
            Gemini Reasoning Engine
          </span>

          <div className="space-y-3 font-mono text-xs">
            <div>
              <label className="text-[10px] text-slate-400 font-bold block mb-1">REASONING LLM MODEL</label>
              <select
                value={selectedModel}
                onChange={(e) => setSelectedModel(e.target.value)}
                className="w-full bg-slate-950 text-white p-2.5 rounded-xl border border-slate-800 focus:outline-none"
              >
                <option value="gemini-3.5-flash">Gemini 3.5 Flash (Recommended for speed & low cost)</option>
                <option value="gemini-3.1-pro-preview">Gemini 3.1 Pro (Heavy predictive correlations)</option>
                <option value="gemini-3.1-flash-lite">Gemini 3.1 Flash Lite (Low latency summary runs)</option>
              </select>
            </div>

            <div className="flex justify-between items-center p-3 bg-slate-950/40 rounded-xl border border-slate-900">
              <div>
                <h4 className="font-sans font-bold text-slate-300">Continuous Predictor Cycles</h4>
                <p className="font-sans text-[10px] text-slate-500">Enable tomorrow-forecasting charts</p>
              </div>
              <input
                type="checkbox"
                checked={enablePredictions}
                onChange={() => setEnablePredictions(!enablePredictions)}
                className="w-4 h-4 accent-cyan-500"
              />
            </div>
          </div>
        </div>

        {/* 2. Style Theme Profile selection */}
        <div className="p-5 bg-slate-900/40 rounded-2xl border border-slate-800/80 backdrop-blur-xl space-y-4">
          <span className="text-xs font-mono font-bold text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
            <Layers className="w-4 h-4 text-purple-400" />
            Visual Style Profiles
          </span>

          <div className="space-y-3 text-xs">
            <label className="text-[10px] text-slate-400 font-mono font-bold block mb-1">INTERFACE COSMETIC THEME</label>
            <div className="grid grid-cols-3 gap-2 font-mono text-[11px] font-bold">
              {[
                { id: "glass-slate", label: "Modern Slate" },
                { id: "cyber-blue", label: "Cyber Blue" },
                { id: "emerald-green", label: "Emerald Eco" },
              ].map((styleTheme) => (
                <button
                  key={styleTheme.id}
                  onClick={() => onChangeTheme(styleTheme.id as SmartCityTheme)}
                  className={`p-3 rounded-xl border transition-all text-center cursor-pointer ${
                    theme === styleTheme.id
                      ? "bg-slate-950 text-white border-cyan-500/50 shadow-lg shadow-cyan-500/5"
                      : "bg-slate-950/30 text-slate-500 border-slate-900 hover:text-slate-300"
                  }`}
                >
                  {styleTheme.label}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* 3. API Key & Security details */}
        <div className="p-5 bg-slate-900/40 rounded-2xl border border-slate-800/80 backdrop-blur-xl space-y-4">
          <span className="text-xs font-mono font-bold text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
            <Key className="w-4 h-4 text-emerald-400" />
            API Key & Secure Credentials
          </span>

          <p className="text-xs text-slate-400 leading-relaxed font-sans">
            In compliance with Developer Security guidelines, all Gemini API and developer keys are stored securely in Node environment parameters on the server-side, never exposed to the client.
          </p>

          <div className="p-3 bg-slate-950/60 rounded-xl border border-slate-900 font-mono text-[10.5px] space-y-1.5 border-l-4 border-l-emerald-500">
            <div className="flex justify-between text-slate-300 font-bold">
              <span>GEMINI_API_KEY Status:</span>
              <span className="text-emerald-400 flex items-center gap-1">
                <CheckCircle className="w-3.5 h-3.5" />
                SECURED
              </span>
            </div>
            <p className="text-[9.5px] text-slate-500 mt-1 leading-normal">
              Credential automatically synchronizes using AI Studio Secrets panels during dev runs.
            </p>
          </div>
        </div>

        {/* 4. Automated Alerts Preferences */}
        <div className="p-5 bg-slate-900/40 rounded-2xl border border-slate-800/80 backdrop-blur-xl space-y-4">
          <span className="text-xs font-mono font-bold text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
            <BellRing className="w-4 h-4 text-amber-400" />
            Operational Notification Prefs
          </span>

          <div className="space-y-3 font-mono text-xs">
            <div>
              <label className="text-[10px] text-slate-400 font-bold block mb-1">NOTIFY TRIGGER SENSITIVITY</label>
              <select
                value={notifyPriority}
                onChange={(e) => setNotifyPriority(e.target.value)}
                className="w-full bg-slate-950 text-white p-2.5 rounded-xl border border-slate-800 focus:outline-none"
              >
                <option value="All">All Anomalies (Very High alert load)</option>
                <option value="High">High & Critical only (SOP thresholds only)</option>
                <option value="Critical">Critical Disasters only (Severe road hazards & fires)</option>
              </select>
            </div>
          </div>
        </div>

      </div>

    </div>
  );
}
