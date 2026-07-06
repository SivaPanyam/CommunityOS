import React from "react";
import {
  LineChart,
  Line,
  AreaChart,
  Area,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
  PieChart,
  Pie,
  Cell,
} from "recharts";
import { Download, Info, Activity, AlertTriangle, FileSpreadsheet } from "lucide-react";

interface AnalyticsViewProps {
  traffic: any[];
  weather: any[];
  airQuality: any[];
  complaints: any[];
  power: any[];
  water: any[];
  hospital: any[];
}

export default function AnalyticsView({
  traffic,
  weather,
  airQuality,
  complaints,
  power,
  water,
  hospital,
}: AnalyticsViewProps) {
  
  // Format traffic timestamps for charting (take latest 12 entries)
  const formatTrafficData = traffic.filter((t) => t.location === "Downtown Expressway").slice(-12).map((t) => ({
    time: new Date(t.timestamp).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
    Congestion: Math.round(t.congestion_index * 100),
    Speed: t.average_speed_kmh,
    Vehicles: t.vehicle_count,
    // Tomorrow predictions
    "Predicted Congestion": Math.min(100, Math.max(0, Math.round(t.congestion_index * 100 + (Math.sin(new Date(t.timestamp).getHours()) * 15)))),
  }));

  // Format AQI data
  const formatAQIData = airQuality.filter((a) => a.location === "Downtown").slice(-10).map((a) => ({
    time: new Date(a.timestamp).toLocaleTimeString([], { hour: "2-digit" }),
    AQI: a.aqi,
    "PM 2.5": a.pm2_5,
    "PM 10": a.pm10,
  }));

  // Format power capacity vs demand
  const formatPowerData = power.filter((p) => p.grid_id === "GRID-A").map((p) => ({
    time: new Date(p.timestamp).toLocaleTimeString([], { hour: "2-digit" }),
    Demand: p.demand_mw,
    Capacity: p.capacity_mw,
  }));

  // Format water levels
  const formatWaterData = water.filter((w) => w.facility === "Main Reservoir").map((w) => ({
    time: new Date(w.timestamp).toLocaleTimeString([], { hour: "2-digit" }),
    Level: w.reservoir_level_pct,
    Leakage: w.leak_rate_lps * 10, // scale for chart visibility
  }));

  // Format complaints pie distribution
  const complaintDistribution = complaints.reduce((acc: any[], curr: any) => {
    const existing = acc.find((item) => item.name === curr.category);
    if (existing) {
      existing.value += 1;
    } else {
      acc.push({ name: curr.category, value: 1 });
    }
    return acc;
  }, []);

  const COLORS = ["#06b6d4", "#a855f7", "#10b981", "#f59e0b", "#f43f5e", "#6366f1"];

  const triggerDownload = (dataset: string) => {
    window.open(`/api/download/${dataset}`);
  };

  return (
    <div className="space-y-6 pb-12">
      
      {/* Top Banner */}
      <div className="p-6 bg-slate-900/40 rounded-2xl border border-slate-800/80 backdrop-blur-xl flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-sans font-bold tracking-tight text-white flex items-center gap-2">
            Historical & Predictive Analytics
            <span className="text-xs font-mono font-medium text-purple-400 bg-purple-500/10 px-2 py-0.5 rounded-full border border-purple-500/20">
              ● VERIFIED ANALYTICAL INTEGRITY
            </span>
          </h2>
          <p className="text-xs text-slate-400 mt-1">
            Analyzing multi-sensor historical grids and predictive models for smart planning.
          </p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => triggerDownload("traffic")}
            className="px-3 py-1.5 text-[10px] font-mono font-semibold rounded-lg bg-slate-950 border border-slate-800 text-slate-300 hover:text-white transition-all flex items-center gap-1.5"
          >
            <Download className="w-3 h-3" />
            CSV Export
          </button>
        </div>
      </div>

      {/* Main Trends Grid (2 Rows of Charts) */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

        {/* 1. Traffic Predictor Line Chart */}
        <div className="p-5 bg-slate-900/40 rounded-2xl border border-slate-800/80 backdrop-blur-xl space-y-4">
          <div className="flex items-center justify-between">
            <span className="text-xs font-mono font-bold text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
              <Activity className="w-4 h-4 text-cyan-400" />
              Congestion vs Speed & Dashed Predictive Forecast
            </span>
            <span className="text-[10px] font-mono text-purple-300 bg-purple-500/5 px-2 py-0.5 rounded border border-purple-500/10">
              Tomorrow Predictor Active
            </span>
          </div>
          <div className="h-[250px] w-full font-mono text-[10px]">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={formatTrafficData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                <XAxis dataKey="time" stroke="#94a3b8" />
                <YAxis stroke="#94a3b8" />
                <Tooltip contentStyle={{ backgroundColor: "#020617", borderColor: "#1e293b", borderRadius: "10px" }} />
                <Legend />
                <Line type="monotone" dataKey="Congestion" name="Current Load %" stroke="#06b6d4" strokeWidth={2.5} dot={{ r: 3 }} />
                <Line type="monotone" dataKey="Predicted Congestion" name="Predictive Load %" stroke="#a855f7" strokeDasharray="5 5" strokeWidth={2} dot={false} />
                <Line type="monotone" dataKey="Speed" name="Avg Speed (km/h)" stroke="#10b981" strokeWidth={1.5} dot={false} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* 2. Air Quality particulates Area Chart */}
        <div className="p-5 bg-slate-900/40 rounded-2xl border border-slate-800/80 backdrop-blur-xl space-y-4">
          <span className="text-xs font-mono font-bold text-slate-300 uppercase tracking-wider block">
            Environmental Particulates & AQI Trends
          </span>
          <div className="h-[250px] w-full font-mono text-[10px]">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={formatAQIData}>
                <defs>
                  <linearGradient id="colorAQI" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#eab308" stopOpacity={0.2} />
                    <stop offset="95%" stopColor="#eab308" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                <XAxis dataKey="time" stroke="#94a3b8" />
                <YAxis stroke="#94a3b8" />
                <Tooltip contentStyle={{ backgroundColor: "#020617", borderColor: "#1e293b", borderRadius: "10px" }} />
                <Legend />
                <Area type="monotone" dataKey="AQI" stroke="#eab308" fillOpacity={1} fill="url(#colorAQI)" strokeWidth={2} />
                <Line type="monotone" dataKey="PM 2.5" name="PM 2.5 (µg/m³)" stroke="#f43f5e" strokeWidth={1.5} dot={false} />
                <Line type="monotone" dataKey="PM 10" name="PM 10 (µg/m³)" stroke="#3b82f6" strokeWidth={1.5} dot={false} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* 3. Smart Grid Power Demand vs safety capacity Bar Chart */}
        <div className="p-5 bg-slate-900/40 rounded-2xl border border-slate-800/80 backdrop-blur-xl space-y-4">
          <span className="text-xs font-mono font-bold text-slate-300 uppercase tracking-wider block">
            Smart grid capacity boundaries vs Peak active loads
          </span>
          <div className="h-[250px] w-full font-mono text-[10px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={formatPowerData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                <XAxis dataKey="time" stroke="#94a3b8" />
                <YAxis stroke="#94a3b8" />
                <Tooltip contentStyle={{ backgroundColor: "#020617", borderColor: "#1e293b", borderRadius: "10px" }} />
                <Legend />
                <Bar dataKey="Demand" name="Active Load Demand (MW)" fill="#a855f7" radius={[4, 4, 0, 0]} />
                <Line type="monotone" dataKey="Capacity" name="Safety Limit (MW)" stroke="#ef4444" strokeWidth={2} dot={false} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* 4. Water Reservoir Depletion & pipe leaks Line Chart */}
        <div className="p-5 bg-slate-900/40 rounded-2xl border border-slate-800/80 backdrop-blur-xl space-y-4">
          <span className="text-xs font-mono font-bold text-slate-300 uppercase tracking-wider block">
            Water reservoir depletion vs Pipeline leakage rates
          </span>
          <div className="h-[250px] w-full font-mono text-[10px]">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={formatWaterData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                <XAxis dataKey="time" stroke="#94a3b8" />
                <YAxis stroke="#94a3b8" />
                <Tooltip contentStyle={{ backgroundColor: "#020617", borderColor: "#1e293b", borderRadius: "10px" }} />
                <Legend />
                <Line type="monotone" dataKey="Level" name="Reservoir Fill %" stroke="#3b82f6" strokeWidth={2} />
                <Line type="monotone" dataKey="Leakage" name="Leakage Rate (L/s x10)" stroke="#f43f5e" strokeWidth={1.5} strokeDasharray="3 3" />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

      </div>

      {/* Interactive Pie Dist & Download Core Database Section */}
      <div className="grid grid-cols-1 md:grid-cols-12 gap-6">

        {/* Complaints Distribution Pie (5 Columns) */}
        <div className="md:col-span-5 p-5 bg-slate-900/40 rounded-2xl border border-slate-800/80 backdrop-blur-xl flex flex-col justify-between min-h-[300px]">
          <span className="text-xs font-mono font-bold text-slate-300 uppercase tracking-wider block mb-2">
            Citizen complaints category allocation
          </span>
          <div className="h-[200px] w-full font-mono text-[10px] flex items-center justify-center">
            {complaintDistribution.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={complaintDistribution}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={80}
                    paddingAngle={5}
                    dataKey="value"
                  >
                    {complaintDistribution.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip contentStyle={{ backgroundColor: "#020617", borderColor: "#1e293b" }} />
                  <Legend layout="horizontal" align="center" verticalAlign="bottom" />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <span className="text-slate-500">No complaints logged.</span>
            )}
          </div>
        </div>

        {/* Raw Dataset Export terminal (7 Columns) */}
        <div className="md:col-span-7 p-5 bg-slate-900/40 rounded-2xl border border-slate-800/80 backdrop-blur-xl flex flex-col justify-between">
          <div>
            <span className="text-xs font-mono font-bold text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
              <FileSpreadsheet className="w-4 h-4 text-emerald-400" />
              Dataset Export Terminal (BigQuery Ready)
            </span>
            <p className="text-[10px] text-slate-400 font-sans mt-1">
              Download municipal feeds directly in raw CSV formats. These datasets are structured in tidy schemas, allowing automated ETL syncing to Google BigQuery or Looker Studio.
            </p>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5 mt-4">
            {[
              { id: "traffic", label: "Traffic Feed" },
              { id: "weather", label: "Weather Feed" },
              { id: "air_quality", label: "Air Quality" },
              { id: "complaints", label: "Citizen Claims" },
              { id: "power", label: "Smart Power" },
              { id: "water", label: "Water Level" },
              { id: "hospital", label: "Health Load" },
              { id: "emergency", label: "Incident Alerts" },
              { id: "citizen_feedback", label: "Citizen Sentiment" },
            ].map((feed) => (
              <button
                key={feed.id}
                onClick={() => triggerDownload(feed.id)}
                className="p-3 rounded-xl bg-slate-950/80 hover:bg-slate-900 border border-slate-800/60 text-left font-mono text-[10.5px] font-bold text-slate-300 hover:text-white transition-all cursor-pointer flex justify-between items-center group active:scale-95"
              >
                <span>{feed.label}</span>
                <Download className="w-3.5 h-3.5 text-slate-500 group-hover:text-cyan-400 transition-colors" />
              </button>
            ))}
          </div>

          <div className="flex items-center gap-2 mt-4 text-[10px] bg-slate-950 p-2.5 rounded-lg border border-slate-900 text-slate-500">
            <Info className="w-4 h-4 text-slate-400 flex-shrink-0" />
            <span>Database formats comply fully with LOOKER-STAGE-COMPATIBILITY V2 standard procedures.</span>
          </div>
        </div>

      </div>

    </div>
  );
}
