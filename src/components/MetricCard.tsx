import React from "react";
import { ArrowUpRight, ArrowDownRight, Activity } from "lucide-react";

interface MetricCardProps {
  title: string;
  value: string | number;
  unit?: string;
  trend?: string;
  trendDirection?: "up" | "down" | "neutral";
  icon: React.ReactNode;
  color: "cyan" | "purple" | "emerald" | "amber" | "rose" | "indigo";
}

export default function MetricCard({ title, value, unit, trend, trendDirection, icon, color }: MetricCardProps) {
  const borderColors = {
    cyan: "border-cyan-500/20 hover:border-cyan-500/40 focus-within:border-cyan-500/40",
    purple: "border-purple-500/20 hover:border-purple-500/40 focus-within:border-purple-500/40",
    emerald: "border-emerald-500/20 hover:border-emerald-500/40 focus-within:border-emerald-500/40",
    amber: "border-amber-500/20 hover:border-amber-500/40 focus-within:border-amber-500/40",
    rose: "border-rose-500/20 hover:border-rose-500/40 focus-within:border-rose-500/40",
    indigo: "border-indigo-500/20 hover:border-indigo-500/40 focus-within:border-indigo-500/40",
  };

  const bgGradients = {
    cyan: "from-cyan-500/5 to-transparent",
    purple: "from-purple-500/5 to-transparent",
    emerald: "from-emerald-500/5 to-transparent",
    amber: "from-amber-500/5 to-transparent",
    rose: "from-rose-500/5 to-transparent",
    indigo: "from-indigo-500/5 to-transparent",
  };

  const iconColors = {
    cyan: "text-cyan-400 bg-cyan-500/10",
    purple: "text-purple-400 bg-purple-500/10",
    emerald: "text-emerald-400 bg-emerald-500/10",
    amber: "text-amber-400 bg-amber-500/10",
    rose: "text-rose-400 bg-rose-500/10",
    indigo: "text-indigo-400 bg-indigo-500/10",
  };

  return (
    <div
      className={`relative p-5 rounded-2xl border bg-slate-950/40 backdrop-blur-md bg-gradient-to-br ${bgGradients[color]} ${borderColors[color]} transition-all duration-300 shadow-xl overflow-hidden group`}
    >
      {/* Abstract Background Ring */}
      <div className="absolute -right-6 -bottom-6 w-24 h-24 rounded-full bg-current opacity-[0.02] group-hover:opacity-[0.04] transition-all" />

      <div className="flex justify-between items-start mb-3">
        <span className="text-[11px] font-mono font-bold tracking-wider text-slate-400 group-hover:text-slate-300 uppercase transition-colors">
          {title}
        </span>
        <div className={`p-2 rounded-xl transition-transform duration-300 group-hover:scale-105 ${iconColors[color]}`}>
          {icon}
        </div>
      </div>

      <div className="flex items-baseline gap-1 mb-1.5">
        <span className="text-2xl font-bold font-sans tracking-tight text-white">{value}</span>
        {unit && <span className="text-xs font-mono font-medium text-slate-400">{unit}</span>}
      </div>

      {trend && (
        <div className="flex items-center gap-1">
          {trendDirection === "up" && (
            <span className="text-[10px] font-mono font-bold text-rose-400 bg-rose-500/10 px-1.5 py-0.5 rounded flex items-center">
              <ArrowUpRight className="w-3 h-3 mr-0.5" />
              {trend}
            </span>
          )}
          {trendDirection === "down" && (
            <span className="text-[10px] font-mono font-bold text-emerald-400 bg-emerald-500/10 px-1.5 py-0.5 rounded flex items-center">
              <ArrowDownRight className="w-3 h-3 mr-0.5" />
              {trend}
            </span>
          )}
          {trendDirection === "neutral" && (
            <span className="text-[10px] font-mono font-bold text-slate-400 bg-slate-500/10 px-1.5 py-0.5 rounded flex items-center">
              <Activity className="w-3 h-3 mr-0.5" />
              {trend}
            </span>
          )}
        </div>
      )}
    </div>
  );
}
