import React from "react";
import { WaterRecord } from "../types";
import {
  Zap,
  Droplet,
  Trash2,
  Lightbulb,
  Sparkles,
  CheckCircle,
  AlertTriangle,
  Play,
  RotateCw,
} from "lucide-react";

interface UtilitiesViewProps {
  water: WaterRecord[];
  power: any[];
  onTriggerUtilityAction: (action: { id: string; title: string; department: string; sector: string; impactMetric: string }) => void;
}

export default function UtilitiesView({ water, power, onTriggerUtilityAction }: UtilitiesViewProps) {
  const reservoir = water.find((w) => w.facility === "Main Reservoir") || { reservoir_level_pct: 78.8, leak_rate_lps: 8.2, pressure_psi: 55, status: "Normal" };
  const currentGrid = power.find((p) => p.grid_id === "GRID-A") || { demand_mw: 105, capacity_mw: 120, status: "Normal" };

  return (
    <div className="space-y-6">
      
      {/* Top Header Banner */}
      <div className="p-6 bg-slate-900/40 rounded-2xl border border-slate-800/80 backdrop-blur-xl flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-sans font-bold tracking-tight text-white flex items-center gap-2">
            Smart Infrastructure & Utilities
            <span className="text-xs font-mono font-medium text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-full border border-emerald-500/20">
              ● ECO OPTIMIZATIONS ACTIVE
            </span>
          </h2>
          <p className="text-xs text-slate-400 mt-1">
            Minimizing grid losses, optimizing fresh water reservoir level preservation, and automating garbage dispatch loops.
          </p>
        </div>
      </div>

      {/* Grid of Utilities blocks (3 columns) */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">

        {/* 1. Electricity Grid optimization */}
        <div className="p-5 bg-slate-900/40 rounded-2xl border border-slate-800/80 backdrop-blur-xl flex flex-col justify-between h-full space-y-4">
          <div className="space-y-3">
            <div className="flex justify-between items-start">
              <span className="text-xs font-mono font-bold text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
                <Zap className="w-4 h-4 text-purple-400" />
                Smart Power Grid-A
              </span>
              <span className={`px-2 py-0.5 rounded text-[9px] font-mono font-bold border ${
                currentGrid.status.includes("Critical") ? "bg-red-500/15 text-red-300 border-red-500/30" : "bg-purple-500/10 text-purple-300 border-purple-500/20"
              }`}>
                {currentGrid.status}
              </span>
            </div>

            <p className="text-xs text-slate-400 font-sans leading-relaxed">
              Downtown Core transformer grid monitoring. Active load boundaries fluctuate based on heating/cooling demand.
            </p>

            <div className="bg-slate-950 p-3 rounded-xl border border-slate-900 font-mono text-[11px] space-y-1.5">
              <div className="flex justify-between">
                <span className="text-slate-500">Active Demand:</span>
                <span className="text-white font-bold">{currentGrid.demand_mw} MW</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Safety Cap Limit:</span>
                <span className="text-white font-bold">{currentGrid.capacity_mw} MW</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Thermal Efficiency:</span>
                <span className="text-emerald-400 font-bold">{currentGrid.efficiency_pct || 91}%</span>
              </div>
            </div>
          </div>

          <button
            onClick={() => onTriggerUtilityAction({
              id: "ACT-UT-POW",
              title: "Trigger Autonomous Peak-Grid Offload Timers",
              department: "Electrical Division",
              sector: "Smart Utilities",
              impactMetric: "Protects Downtown Core from localized overload brownouts",
            })}
            className="w-full py-2 rounded-xl bg-purple-600/20 hover:bg-purple-600/30 text-purple-300 border border-purple-500/25 font-mono text-xs font-bold flex items-center justify-center gap-1.5 transition-all"
          >
            <Sparkles className="w-3.5 h-3.5" />
            TRIGGER LOAD SHEDDING
          </button>
        </div>

        {/* 2. Water grid optimization */}
        <div className="p-5 bg-slate-900/40 rounded-2xl border border-slate-800/80 backdrop-blur-xl flex flex-col justify-between h-full space-y-4">
          <div className="space-y-3">
            <div className="flex justify-between items-start">
              <span className="text-xs font-mono font-bold text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
                <Droplet className="w-4 h-4 text-cyan-400" />
                Main Reservoir Water
              </span>
              <span className={`px-2 py-0.5 rounded text-[9px] font-mono font-bold border ${
                reservoir.status.includes("Leak") ? "bg-yellow-500/10 text-yellow-300 border-yellow-500/20 animate-pulse" : "bg-cyan-500/10 text-cyan-300 border-cyan-500/20"
              }`}>
                {reservoir.status}
              </span>
            </div>

            <p className="text-xs text-slate-400 font-sans leading-relaxed">
              Main fresh water reserve level tracking. Active monitoring metrics check chemical filters and water leakages.
            </p>

            <div className="bg-slate-950 p-3 rounded-xl border border-slate-900 font-mono text-[11px] space-y-1.5">
              <div className="flex justify-between">
                <span className="text-slate-500">Reservoir Volume:</span>
                <span className="text-white font-bold">{reservoir.reservoir_level_pct}%</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Pressure Index:</span>
                <span className="text-white font-bold">{reservoir.pressure_psi || 55} PSI</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Mains Leakage Rate:</span>
                <span className={`font-bold ${reservoir.leak_rate_lps > 5 ? "text-rose-400 animate-pulse" : "text-emerald-400"}`}>
                  {reservoir.leak_rate_lps} Liters/s
                </span>
              </div>
            </div>
          </div>

          <button
            onClick={() => onTriggerUtilityAction({
              id: "ACT-UT-H2O",
              title: "Activate Closed Loop Water Valve Pressure Modifiers",
              department: "Water Department",
              sector: "Smart Utilities",
              impactMetric: "Saves up to 45,000 Gallons water loss",
            })}
            className="w-full py-2 rounded-xl bg-cyan-600/20 hover:bg-cyan-600/30 text-cyan-300 border border-cyan-500/25 font-mono text-xs font-bold flex items-center justify-center gap-1.5 transition-all"
          >
            <Sparkles className="w-3.5 h-3.5" />
            ACTIVATE CLOSING BLOCK VALVES
          </button>
        </div>

        {/* 3. Solid waste collection loops */}
        <div className="p-5 bg-slate-900/40 rounded-2xl border border-slate-800/80 backdrop-blur-xl flex flex-col justify-between h-full space-y-4">
          <div className="space-y-3">
            <div className="flex justify-between items-start">
              <span className="text-xs font-mono font-bold text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
                <Trash2 className="w-4 h-4 text-emerald-400" />
                Waste Management
              </span>
              <span className="px-2 py-0.5 rounded text-[9px] font-mono font-bold border bg-emerald-500/10 text-emerald-300 border-emerald-500/20">
                Optimized
              </span>
            </div>

            <p className="text-xs text-slate-400 font-sans leading-relaxed">
              Autonomous garbage route monitoring. Compactor fill percentages determine localized garbage truck dispatch triggers.
            </p>

            <div className="bg-slate-950 p-3 rounded-xl border border-slate-900 font-mono text-[11px] space-y-1.5">
              <div className="flex justify-between">
                <span className="text-slate-500">Active garbage trucks:</span>
                <span className="text-white font-bold">12 Dispatched</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Tonnage Processed:</span>
                <span className="text-white font-bold">45.2 Tons/day</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Route Efficiency index:</span>
                <span className="text-emerald-400 font-bold">95.4% Optimized</span>
              </div>
            </div>
          </div>

          <button
            onClick={() => onTriggerUtilityAction({
              id: "ACT-UT-WASTE",
              title: "Re-calculate Waste Truck dynamic GPS routes",
              department: "Waste Management",
              sector: "Smart Utilities",
              impactMetric: "Saves up to 14% fuel and vehicle exhaust fumes",
            })}
            className="w-full py-2 rounded-xl bg-emerald-600/20 hover:bg-emerald-600/30 text-emerald-300 border border-emerald-500/25 font-mono text-xs font-bold flex items-center justify-center gap-1.5 transition-all"
          >
            <Sparkles className="w-3.5 h-3.5" />
            RE-ROUTE COMPACTORS
          </button>
        </div>

      </div>

    </div>
  );
}
