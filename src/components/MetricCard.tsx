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
  loading?: boolean;
}

export default function MetricCard({ title, value, unit, trend, trendDirection, icon, color, loading = false }: MetricCardProps) {
  const accentColors = {
    cyan: "text-blue-400 bg-blue-500/10 border-blue-500/20",     // Map to Google Blue
    purple: "text-indigo-400 bg-indigo-500/10 border-indigo-500/20",
    emerald: "text-emerald-400 bg-emerald-500/10 border-emerald-500/20", // Map to Google Green
    amber: "text-amber-400 bg-amber-500/10 border-amber-500/20",     // Map to Google Yellow
    rose: "text-rose-400 bg-rose-500/10 border-rose-500/20",       // Map to Google Red
    indigo: "text-cyan-400 bg-cyan-500/10 border-cyan-500/20",
  };

  if (loading) {
    return (
      <div className="p-5 rounded-2xl gcp-glass animate-pulse">
        <div className="flex justify-between items-start mb-4">
          <div className="h-3 w-20 bg-white/10 rounded" />
          <div className="h-8 w-8 bg-white/10 rounded-xl" />
        </div>
        <div className="h-6 w-24 bg-white/15 rounded mb-2" />
        <div className="h-3 w-16 bg-white/10 rounded" />
      </div>
    );
  }

  return (
    <div className="relative p-5 rounded-2xl gcp-glass gcp-glass-hover overflow-hidden group">
      {/* Subtle Gradient Glow */}
      <div className="absolute inset-0 bg-gradient-to-br from-white/[0.02] to-transparent pointer-events-none" />
      
      <div className="flex justify-between items-start mb-3">
        <span className="text-[11px] font-mono font-bold tracking-wider text-slate-400 group-hover:text-slate-300 uppercase transition-colors">
          {title}
        </span>
        <div className={`p-2.5 rounded-xl transition-transform duration-300 group-hover:scale-105 ${accentColors[color]}`}>
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
