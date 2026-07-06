import React from "react";
import { EmergencyRecord } from "../types";
import {
  Flame,
  Droplets,
  Shield,
  Activity,
  UserCheck,
  AlertOctagon,
  PhoneCall,
  MapPin,
  Clock,
  Sparkles,
} from "lucide-react";

interface EmergencyViewProps {
  emergencies: EmergencyRecord[];
  onTriggerEmergencyAction: (action: { id: string; title: string; department: string; sector: string; impactMetric: string }) => void;
}

export default function EmergencyView({ emergencies, onTriggerEmergencyAction }: EmergencyViewProps) {
  
  // Resource allocations
  const resources = [
    { name: "Ambulance Squads", total: 10, occupied: 6, status: "Normal" },
    { name: "Police Patrol Units", total: 16, occupied: 12, status: "High Demand" },
    { name: "Fire Truck Teams", total: 8, occupied: 3, status: "Clear" },
    { name: "Disaster Shelters", total: 5, occupied: 1, status: "Fully Ready" },
  ];

  // Risks score
  const riskSensors = [
    { name: "River Level / Flood Risk", value: "82% Capacity", level: "High", color: "text-amber-400" },
    { name: "Forest / Fire Risk Index", value: "34% humidity", level: "Low", color: "text-emerald-400" },
    { name: "Seismic Tremor Grid", value: "0.15 Peak G", level: "Safe", color: "text-emerald-400" },
    { name: "Industrial Air Risk", value: "185 AQI Load", level: "Critical", color: "text-red-400" },
  ];

  return (
    <div className="space-y-6">
      
      {/* View Header */}
      <div className="p-6 bg-slate-900/40 rounded-2xl border border-slate-800/80 backdrop-blur-xl flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-sans font-bold tracking-tight text-white flex items-center gap-2">
            Emergency & Crisis Command Center
            <span className="text-xs font-mono font-medium text-rose-400 bg-rose-500/10 px-2 py-0.5 rounded-full border border-rose-500/20 animate-pulse">
              ● CRISIS MODE STAGED
            </span>
          </h2>
          <p className="text-xs text-slate-400 mt-1">
            Coordinating municipal dispatches, tracking active hazards, and optimizing emergency response squad logistics.
          </p>
        </div>
        <div className="flex gap-2">
          <a
            href="tel:911"
            className="px-4 py-2 text-xs font-mono font-bold rounded-xl bg-rose-600/20 hover:bg-rose-600/30 text-rose-300 border border-rose-500/30 flex items-center gap-1.5 transition-all"
          >
            <PhoneCall className="w-3.5 h-3.5" />
            CRISIS DIRECTORY
          </a>
        </div>
      </div>

      {/* Mid layout: Grid status blocks & Resource meters */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">

        {/* 1. Critical Risk Indicators (5 Columns) */}
        <div className="lg:col-span-5 p-5 bg-slate-900/40 rounded-2xl border border-slate-800/80 backdrop-blur-xl space-y-4">
          <span className="text-xs font-mono font-bold text-slate-300 uppercase tracking-wider block">
            Environmental Risk Indicators
          </span>

          <div className="space-y-3">
            {riskSensors.map((sensor, idx) => (
              <div
                key={idx}
                className="p-3 bg-slate-950/40 rounded-xl border border-slate-900 flex justify-between items-center text-xs"
              >
                <div>
                  <h4 className="font-sans font-bold text-slate-200">{sensor.name}</h4>
                  <p className="text-[10px] text-slate-400 font-mono mt-0.5">{sensor.value}</p>
                </div>
                <span className={`text-[10px] font-mono font-bold px-2 py-0.5 rounded-md ${sensor.color} bg-slate-950`}>
                  {sensor.level}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* 2. Dispatch Resources Allocation Bars (7 Columns) */}
        <div className="lg:col-span-7 p-5 bg-slate-900/40 rounded-2xl border border-slate-800/80 backdrop-blur-xl space-y-4">
          <span className="text-xs font-mono font-bold text-slate-300 uppercase tracking-wider block">
            Available Response Squads Allocation
          </span>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {resources.map((res, idx) => {
              const occupiedPct = Math.round((res.occupied / res.total) * 100);
              return (
                <div key={idx} className="space-y-2">
                  <div className="flex justify-between items-baseline font-mono text-[10.5px]">
                    <span className="text-slate-300 font-bold">{res.name}</span>
                    <span className="text-slate-400">
                      {res.occupied}/{res.total} units
                    </span>
                  </div>
                  <div className="w-full h-2 bg-slate-950 rounded-full border border-slate-800 overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all duration-500 ${
                        occupiedPct > 80 ? "bg-red-500" : occupiedPct > 50 ? "bg-amber-400" : "bg-cyan-500"
                      }`}
                      style={{ width: `${occupiedPct}%` }}
                    />
                  </div>
                  <div className="flex justify-between text-[9px] font-mono text-slate-500">
                    <span>{occupiedPct}% Load</span>
                    <span className={res.status === "High Demand" ? "text-red-400" : "text-emerald-400"}>
                      {res.status}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

      </div>

      {/* 3. Lower Active Emergency incidents table */}
      <div className="p-5 bg-slate-900/40 rounded-2xl border border-slate-800/80 backdrop-blur-xl space-y-4">
        <div className="flex items-center justify-between">
          <span className="text-xs font-mono font-bold text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
            <AlertOctagon className="w-4 h-4 text-rose-400 animate-pulse" />
            Live Crisis Incident Logs & Smart dispatches
          </span>
          <span className="text-[10px] font-mono text-slate-500">
            Automated telemetry dispatch enabled
          </span>
        </div>

        <div className="space-y-3">
          {emergencies.map((emg) => (
            <div
              key={emg.id}
              className="p-4 bg-slate-950/40 rounded-xl border border-slate-800/50 hover:border-slate-700/80 transition-all flex flex-col md:flex-row md:items-center justify-between gap-4"
            >
              <div className="flex-1 space-y-2">
                <div className="flex flex-wrap items-center gap-2 text-[10px] font-mono">
                  <span className="font-bold text-slate-500">{emg.id}</span>
                  <span className={`px-2 py-0.5 rounded font-bold border ${
                    emg.severity === "Critical" ? "bg-red-500/10 text-red-400 border-red-500/20" : emg.severity === "Severe" ? "bg-orange-500/10 text-orange-400 border-orange-500/20" : "bg-slate-900 text-slate-400 border-slate-800"
                  }`}>
                    {emg.severity}
                  </span>
                  <span className="text-slate-400 font-bold">{emg.type}</span>
                </div>

                <p className="text-xs text-white font-sans leading-relaxed">{emg.description}</p>

                <div className="flex flex-wrap gap-4 text-[10px] font-mono text-slate-400">
                  <div className="flex items-center gap-1">
                    <MapPin className="w-3.5 h-3.5 text-cyan-400" />
                    <span>{emg.location}</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <UserCheck className="w-3.5 h-3.5 text-purple-400" />
                    <span>Squads: <strong className="text-white">{emg.responding_units}</strong></span>
                  </div>
                </div>
              </div>

              {/* Responder dispatcher suggested actions */}
              <div className="flex flex-col justify-center items-end gap-2 text-right md:w-[220px]">
                <span className={`text-[10px] font-mono font-bold px-2 py-0.5 rounded border ${
                  emg.status === "Resolved" ? "bg-emerald-500/10 text-emerald-300 border-emerald-500/20" : "bg-yellow-500/10 text-yellow-300 border-yellow-500/20"
                }`}>
                  {emg.status}
                </span>

                {emg.status !== "Resolved" && (
                  <button
                    onClick={() => onTriggerEmergencyAction({
                      id: `ACT-EMG-${emg.id}`,
                      title: `Redeploy auxiliary responder units to ${emg.location}`,
                      department: "Emergency Management Agency",
                      sector: "Emergency Center",
                      impactMetric: "Saves up to 7 minutes response latency",
                    })}
                    className="w-full py-1.5 rounded-lg bg-rose-600 hover:bg-rose-500 text-white font-mono text-[10px] font-bold flex items-center justify-center gap-1 transition-all"
                  >
                    <Sparkles className="w-3 h-3 text-white" />
                    AUTO SQUAD ALLOCATE
                  </button>
                )}
              </div>

            </div>
          ))}
        </div>
      </div>

    </div>
  );
}
