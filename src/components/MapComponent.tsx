import React, { useState } from "react";
import { TrafficRecord, EmergencyRecord, AQIRecord, WaterRecord } from "../types";
import { AlertCircle, Flame, Navigation, MapPin, Activity, Zap, Droplet } from "lucide-react";

interface MapComponentProps {
  traffic: TrafficRecord[];
  emergencies: EmergencyRecord[];
  aqiList: AQIRecord[];
  water: WaterRecord[];
  onSelectPOI?: (poi: { name: string; details: string; type: string }) => void;
}

export default function MapComponent({ traffic, emergencies, aqiList, water, onSelectPOI }: MapComponentProps) {
  const [activeLayer, setActiveLayer] = useState<"all" | "traffic" | "emergency" | "aqi" | "utilities" | "risk">("all");
  const [activeRiskType, setActiveRiskType] = useState<"flood" | "pollution" | "congestion">("flood");
  const [selectedPoi, setSelectedPoi] = useState<any | null>(null);

  // Filter latest entries for distinct POIs
  const latestExpressway = traffic.filter((t) => t.location === "Downtown Expressway").slice(-1)[0] || { congestion_index: 0.65 };
  const latestBridge = traffic.filter((t) => t.location === "Metro Bridge").slice(-1)[0] || { congestion_index: 0.88 };
  const latestRingRoad = traffic.filter((t) => t.location === "North Ring Road").slice(-1)[0] || { congestion_index: 0.75 };
  const latestTunnel = traffic.filter((t) => t.location === "Westside Tunnel").slice(-1)[0] || { congestion_index: 0.5 };

  const latestIndustrialAQI = aqiList.filter((a) => a.location === "Industrial Park").slice(-1)[0] || { aqi: 185 };
  const latestDowntownAQI = aqiList.filter((a) => a.location === "Downtown").slice(-1)[0] || { aqi: 125 };
  const latestResidentialAQI = aqiList.filter((a) => a.location === "Residential West").slice(-1)[0] || { aqi: 58 };

  const activeReservoir = water.find((w) => w.facility === "Main Reservoir") || { reservoir_level_pct: 78 };

  const getTrafficColor = (index: number) => {
    if (index > 0.8) return "stroke-red-500 stroke-[5] animate-pulse";
    if (index > 0.5) return "stroke-amber-400 stroke-[4.5]";
    return "stroke-emerald-400 stroke-[4]";
  };

  const getAQIColor = (aqi: number) => {
    if (aqi > 150) return "fill-red-500 stroke-red-300";
    if (aqi > 100) return "fill-orange-400 stroke-orange-200";
    if (aqi > 50) return "fill-yellow-400 stroke-yellow-200";
    return "fill-emerald-400 stroke-emerald-200";
  };

  const handlePoiClick = (poi: { name: string; details: string; type: string }) => {
    setSelectedPoi(poi);
    if (onSelectPOI) onSelectPOI(poi);
  };

  return (
    <div className="relative w-full h-[410px] bg-slate-950/80 rounded-2xl border border-slate-800/80 overflow-hidden shadow-2xl backdrop-blur-xl">
      {/* Map Header Controls */}
      <div className="absolute top-3 left-3 right-3 z-10 space-y-2">
        <div className="flex flex-wrap items-center justify-between gap-2 bg-slate-900/90 p-2 rounded-xl border border-slate-800 backdrop-blur-md">
          <span className="text-xs font-mono font-medium text-slate-300 flex items-center gap-1.5 pl-1.5">
            <Activity className="w-3.5 h-3.5 text-cyan-400 animate-pulse" />
            COMMUNITYOS COGNITIVE DIGITAL TWIN
          </span>
          <div className="flex gap-1 flex-wrap">
            {(["all", "traffic", "emergency", "aqi", "utilities", "risk"] as const).map((layer) => (
              <button
                key={layer}
                onClick={() => setActiveLayer(layer)}
                className={`px-2.5 py-1 text-[10px] font-mono font-semibold rounded-lg transition-all capitalize ${
                  activeLayer === layer
                    ? "bg-cyan-500/25 border border-cyan-500 text-cyan-200"
                    : "bg-slate-950 border border-slate-800/50 text-slate-400 hover:text-slate-200"
                }`}
              >
                {layer}
              </button>
            ))}
          </div>
        </div>

        {/* Risk Heatmap Selector panel when activeLayer is "risk" */}
        {activeLayer === "risk" && (
          <div className="flex items-center justify-between gap-2 bg-slate-900/95 p-1.5 rounded-lg border border-red-500/10 shadow-lg backdrop-blur-md animate-fadeIn">
            <span className="text-[9px] font-mono font-bold text-red-400 pl-2 uppercase tracking-wider">
              ☢ SELECT HEAT RISK OVERLAY:
            </span>
            <div className="flex gap-1">
              {(["flood", "pollution", "congestion"] as const).map((risk) => (
                <button
                  key={risk}
                  onClick={() => setActiveRiskType(risk)}
                  className={`px-2 py-0.5 text-[9px] font-mono font-bold rounded uppercase transition-all ${
                    activeRiskType === risk
                      ? "bg-red-500/20 border border-red-500/40 text-red-300"
                      : "bg-slate-950 text-slate-500 hover:text-slate-300"
                  }`}
                >
                  {risk}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Interactive Vector Smart City Graphic SVG */}
      <svg className="w-full h-full text-slate-700 bg-slate-950" viewBox="0 0 800 400">
        <defs>
          <radialGradient id="glow" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="cyan" stopOpacity="0.15" />
            <stop offset="100%" stopColor="cyan" stopOpacity="0" />
          </radialGradient>
          <radialGradient id="floodHeatGrad" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="#3b82f6" stopOpacity="0.35" />
            <stop offset="60%" stopColor="#2563eb" stopOpacity="0.15" />
            <stop offset="100%" stopColor="#1d4ed8" stopOpacity="0" />
          </radialGradient>
          <radialGradient id="pollutionHeatGrad" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="#ef4444" stopOpacity="0.35" />
            <stop offset="60%" stopColor="#dc2626" stopOpacity="0.15" />
            <stop offset="100%" stopColor="#991b1b" stopOpacity="0" />
          </radialGradient>
          <radialGradient id="congestionHeatGrad" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="#f59e0b" stopOpacity="0.35" />
            <stop offset="60%" stopColor="#d97706" stopOpacity="0.15" />
            <stop offset="100%" stopColor="#b45309" stopOpacity="0" />
          </radialGradient>
          <filter id="blur" x="-20%" y="-20%" width="140%" height="140%">
            <feGaussianBlur stdDeviation="3" />
          </filter>
        </defs>

        {/* Dynamic Scan lines background */}
        <rect width="800" height="400" fill="url(#grid)" opacity="0.05" />

        {/* Land Background Zones */}
        <path d="M 0 100 Q 200 80, 400 120 T 800 100 L 800 400 L 0 400 Z" fill="#0c1122" opacity="0.4" />
        <path d="M 200 400 C 350 300, 450 300, 600 400 Z" fill="#0f172a" opacity="0.6" />

        {/* River Water Bodies (Estuary) */}
        <path
          d="M 120 400 Q 180 250, 150 180 T 110 0 L 170 0 Q 240 180, 210 250 T 260 400 Z"
          fill="#172554"
          opacity="0.55"
          className="stroke-blue-800/20 stroke-2"
        />

        {/* Dynamic Risk Heatmap Overlays */}
        {activeLayer === "risk" && (
          <g>
            {activeRiskType === "flood" && (
              <>
                <g className="cursor-pointer" onClick={() => handlePoiClick({
                  name: "Estuary Overflow Risk Hotspot (Zone-F1)",
                  details: "Elevation: 1.1m above high tide. Highly vulnerable to flash flooding from intense precipitation runoff and tidal surges. Automated barrier deployment SOP calibrated.",
                  type: "emergency"
                })}>
                  <circle cx="155" cy="190" r="95" fill="url(#floodHeatGrad)" />
                  <circle cx="155" cy="190" r="40" fill="url(#floodHeatGrad)" className="animate-pulse" style={{ transformOrigin: "155px 190px" }} />
                  <circle cx="155" cy="190" r="4" fill="#3b82f6" />
                </g>
                <g className="cursor-pointer" onClick={() => handlePoiClick({
                  name: "Residential West Low-lying Basin (Zone-F2)",
                  details: "Clay-heavy soil retention profiles with slow natural absorption rates. Prone to surface ponding during rainfall exceeding 25mm/hr.",
                  type: "emergency"
                })}>
                  <circle cx="110" cy="280" r="120" fill="url(#floodHeatGrad)" />
                  <circle cx="110" cy="280" r="50" fill="url(#floodHeatGrad)" className="animate-pulse" style={{ transformOrigin: "110px 280px" }} />
                </g>
              </>
            )}

            {activeRiskType === "pollution" && (
              <>
                <g className="cursor-pointer" onClick={() => handlePoiClick({
                  name: "Industrial Sulphur & Particulate Dispersal (Zone-P1)",
                  details: "Heavy smart energy transformer emissions and logistics depot drafts. Local wind coordinates carry heavy aerosols. Current estimated PM2.5 load: 185ppm.",
                  type: "aqi"
                })}>
                  <circle cx="670" cy="280" r="140" fill="url(#pollutionHeatGrad)" />
                  <circle cx="670" cy="280" r="60" fill="url(#pollutionHeatGrad)" className="animate-pulse" style={{ transformOrigin: "670px 280px" }} />
                  <circle cx="670" cy="280" r="4" fill="#ef4444" />
                </g>
                <g className="cursor-pointer" onClick={() => handlePoiClick({
                  name: "Downtown Exhaust Settling Basin (Zone-P2)",
                  details: "Concrete skyscraper micro-climate traps vehicular exhaust patterns. Diurnal thermal inversion risks detected during high temperature peaks.",
                  type: "aqi"
                })}>
                  <circle cx="550" cy="130" r="95" fill="url(#pollutionHeatGrad)" />
                  <circle cx="550" cy="130" r="35" fill="url(#pollutionHeatGrad)" className="animate-pulse" style={{ transformOrigin: "550px 130px" }} />
                </g>
              </>
            )}

            {activeRiskType === "congestion" && (
              <>
                <g className="cursor-pointer" onClick={() => handlePoiClick({
                  name: "Downtown Route-1 Funnel (Zone-C1)",
                  details: "Inter-expressway junction with heavy commuter vehicle density. Confluence point for cross-city commercial freight corridors. Adaptive split-timing active.",
                  type: "traffic"
                })}>
                  <circle cx="410" cy="180" r="120" fill="url(#congestionHeatGrad)" />
                  <circle cx="410" cy="180" r="45" fill="url(#congestionHeatGrad)" className="animate-pulse" style={{ transformOrigin: "410px 180px" }} />
                  <circle cx="410" cy="180" r="4" fill="#f59e0b" />
                </g>
                <g className="cursor-pointer" onClick={() => handlePoiClick({
                  name: "Metro Bridge River crossing bottleneck (Zone-C2)",
                  details: "Dual-lane restricted width crossing. Experience high peak queuing. Recommending dynamic lane reversal policies during transit emergencies.",
                  type: "traffic"
                })}>
                  <circle cx="160" cy="180" r="85" fill="url(#congestionHeatGrad)" />
                  <circle cx="160" cy="180" r="30" fill="url(#congestionHeatGrad)" className="animate-pulse" style={{ transformOrigin: "160px 180px" }} />
                </g>
              </>
            )}
          </g>
        )}

        {/* Roads Grid (Rendered statically but colored dynamically) */}
        {(activeLayer === "all" || activeLayer === "traffic") && (
          <>
            {/* North Ring Road */}
            <path
              id="North Ring Road"
              d="M 50 80 L 750 80"
              fill="none"
              className={`transition-all duration-500 cursor-pointer ${getTrafficColor(latestRingRoad.congestion_index)}`}
              onClick={() =>
                handlePoiClick({
                  name: "North Ring Road Corridor",
                  details: `Congestion Index: ${(latestRingRoad.congestion_index * 100).toFixed(0)}% | Speed: 32 km/h. Standard arterial artery.`,
                  type: "traffic",
                })
              }
            />

            {/* Westside Tunnel */}
            <path
              id="Westside Tunnel"
              d="M 100 320 Q 300 340, 500 320"
              fill="none"
              className={`transition-all duration-500 cursor-pointer ${getTrafficColor(latestTunnel.congestion_index)}`}
              onClick={() =>
                handlePoiClick({
                  name: "Westside Tunnel Expressway",
                  details: `Congestion Index: ${(latestTunnel.congestion_index * 100).toFixed(0)}% | Underpass bypass channels operating normally.`,
                  type: "traffic",
                })
              }
            />

            {/* Downtown Expressway */}
            <path
              id="Downtown Expressway"
              d="M 380 0 Q 390 180, 450 400"
              fill="none"
              className={`transition-all duration-500 cursor-pointer ${getTrafficColor(latestExpressway.congestion_index)}`}
              onClick={() =>
                handlePoiClick({
                  name: "Downtown Expressway (Route 1)",
                  details: `Congestion Index: ${(latestExpressway.congestion_index * 100).toFixed(0)}% | Core north-south city corridor. Highly sensitive during rush hours.`,
                  type: "traffic",
                })
              }
            />

            {/* Metro Bridge */}
            <path
              id="Metro Bridge"
              d="M 120 180 L 220 180"
              fill="none"
              className={`transition-all duration-500 cursor-pointer ${getTrafficColor(latestBridge.congestion_index)}`}
              onClick={() =>
                handlePoiClick({
                  name: "Metro Bridge River crossing",
                  details: `Congestion Index: ${(latestBridge.congestion_index * 100).toFixed(0)}% | Cross-river logistics bridge experiencing congestion.`,
                  type: "traffic",
                })
              }
            />
          </>
        )}

        {/* Bridges & Underpasses Graphics */}
        <rect x="135" y="172" width="50" height="16" fill="#334155" rx="3" opacity="0.8" />
        <line x1="135" y1="172" x2="185" y2="172" stroke="#475569" strokeWidth="2" />
        <line x1="135" y1="188" x2="185" y2="188" stroke="#475569" strokeWidth="2" />

        {/* Neighborhood POIs & Zones Labeling */}
        <g opacity="0.85">
          {/* Downtown Core */}
          <rect
            x="480"
            y="120"
            width="140"
            height="50"
            fill="#1e1b4b/40"
            stroke="#312e81"
            rx="8"
            className="cursor-pointer hover:fill-indigo-950/40"
            onClick={() =>
              handlePoiClick({
                name: "Downtown Financial District",
                details: "Core commercial center. Active smart lights, building integrations, and congestion zones reporting. Current AQI: " + latestDowntownAQI.aqi,
                type: "zone",
              })
            }
          />
          <text x="550" y="148" textAnchor="middle" fill="#c7d2fe" className="text-[11px] font-mono font-semibold select-none">
            DOWNTOWN CORE
          </text>

          {/* Industrial Park */}
          <rect
            x="600"
            y="260"
            width="140"
            height="50"
            fill="#3f1c1c/20"
            stroke="#7f1d1d"
            rx="8"
            className="cursor-pointer hover:fill-red-950/20"
            onClick={() =>
              handlePoiClick({
                name: "Industrial manufacturing Zone",
                details: "Manufacturing park containing heavy smart energy transformers and pollutant discharge points. Primary AQI watch area.",
                type: "zone",
              })
            }
          />
          <text x="670" y="288" textAnchor="middle" fill="#fca5a5" className="text-[11px] font-mono font-semibold select-none">
            INDUSTRIAL PARK
          </text>

          {/* Residential West */}
          <rect
            x="50"
            y="220"
            width="140"
            height="50"
            fill="#064e3b/20"
            stroke="#065f46"
            rx="8"
            className="cursor-pointer hover:fill-emerald-950/20"
            onClick={() =>
              handlePoiClick({
                name: "Residential West Suburb",
                details: "Low-density smart housing zone. High recycling compliance and low AQI load.",
                type: "zone",
              })
            }
          />
          <text x="120" y="248" textAnchor="middle" fill="#a7f3d0" className="text-[11px] font-mono font-semibold select-none">
            RESIDENTIAL WEST
          </text>
        </g>

        {/* AQI Sensors Layer */}
        {(activeLayer === "all" || activeLayer === "aqi") && (
          <g>
            {/* Industrial AQI */}
            <circle
              cx="670"
              cy="230"
              r="12"
              className={`transition-all cursor-pointer ${getAQIColor(latestIndustrialAQI.aqi)}`}
              onClick={() =>
                handlePoiClick({
                  name: "Sensor AQI-101 (Industrial)",
                  details: `AQI: ${latestIndustrialAQI.aqi} | Particulates PM2.5 are significantly elevated due to heavy wind drafts.`,
                  type: "aqi",
                })
              }
            />
            <circle cx="670" cy="230" r="18" fill="none" stroke="#f87171" strokeWidth="1" strokeDasharray="2,3" className="animate-spin" style={{ transformOrigin: "670px 230px" }} />

            {/* Downtown AQI */}
            <circle
              cx="550"
              cy="90"
              r="10"
              className={`transition-all cursor-pointer ${getAQIColor(latestDowntownAQI.aqi)}`}
              onClick={() =>
                handlePoiClick({
                  name: "Sensor AQI-102 (Downtown)",
                  details: `AQI: ${latestDowntownAQI.aqi} | Heavy traffic exhaust load during high commuter hours.`,
                  type: "aqi",
                })
              }
            />

            {/* Residential West AQI */}
            <circle
              cx="120"
              cy="140"
              r="9"
              className={`transition-all cursor-pointer ${getAQIColor(latestResidentialAQI.aqi)}`}
              onClick={() =>
                handlePoiClick({
                  name: "Sensor AQI-103 (Residential)",
                  details: `AQI: ${latestResidentialAQI.aqi} | Clear botanical filter belt functioning. Extremely safe and clean air.`,
                  type: "aqi",
                })
              }
            />
          </g>
        )}

        {/* Utilities Layer */}
        {(activeLayer === "all" || activeLayer === "utilities") && (
          <g>
            {/* Main reservoir */}
            <circle
              cx="260"
              cy="50"
              r="15"
              fill="#1e3a8a"
              stroke="#60a5fa"
              strokeWidth="2.5"
              className="cursor-pointer hover:fill-blue-900"
              onClick={() =>
                handlePoiClick({
                  name: "Main Water Filtration Reservoir",
                  details: `Level: ${activeReservoir.reservoir_level_pct}% | Fully integrated monitoring checks water flow and turbidity metrics.`,
                  type: "utility",
                })
              }
            />
            <text x="260" y="54" textAnchor="middle" fill="#93c5fd" className="text-[9px] font-mono font-bold pointer-events-none">
              H2O
            </text>

            {/* Power Grid Main Station */}
            <polygon
              points="450,220 440,240 460,240"
              fill="#f59e0b"
              stroke="#fbbf24"
              strokeWidth="1.5"
              className="cursor-pointer hover:fill-amber-600"
              onClick={() =>
                handlePoiClick({
                  name: "Power Transformer Grid-A",
                  details: "Supplies Downtown Core with 120MW capacity. Integrated warning alerts trigger automated grid off-loading if limits exceed.",
                  type: "utility",
                })
              }
            />
          </g>
        )}

        {/* Active Emergencies Layer with flashing beacons */}
        {(activeLayer === "all" || activeLayer === "emergency") && (
          <g>
            {emergencies
              .filter((e) => e.status !== "Resolved")
              .map((e, idx) => {
                // Map latitude/longitude offsets into visual coordinate ranges on SVG
                // Simple proportional mapping
                const x = e.type === "Road Accident" ? 440 : e.type === "Fire Alert" ? 640 : 200;
                const y = e.type === "Road Accident" ? 220 : e.type === "Fire Alert" ? 280 : 180;

                return (
                  <g key={e.id} className="cursor-pointer" onClick={() => handlePoiClick({ name: `${e.type} Incident (${e.id})`, details: `${e.description} | Status: ${e.status}. Responding squads: ${e.responding_units}`, type: "emergency" })}>
                    {/* Pulsing Beacon glow effect */}
                    <circle cx={x} cy={y} r="25" fill="url(#glow)" className="animate-ping" style={{ transformOrigin: `${x}px ${y}px`, animationDuration: "2s" }} />
                    <circle cx={x} cy={y} r="8" className="fill-red-600 stroke-white stroke-2 animate-pulse" />
                    
                    {/* Mini Icon indicator inside map */}
                    <path
                      d={
                        e.type === "Fire Alert"
                          ? `M ${x - 4} ${y + 4} L ${x + 4} ${y + 4} L ${x} ${y - 6} Z`
                          : `M ${x - 4} ${y - 4} H ${x + 4} V ${y + 4} H ${x - 4} Z`
                      }
                      fill="white"
                    />
                  </g>
                );
              })}
          </g>
        )}
      </svg>

      {/* Floating Info card panel */}
      {selectedPoi && (
        <div className="absolute bottom-4 left-4 right-4 bg-slate-900/95 p-3 rounded-xl border border-slate-800/80 shadow-2xl backdrop-blur-lg flex justify-between items-start gap-3 transition-all">
          <div className="flex-1">
            <div className="flex items-center gap-1.5 mb-1">
              {selectedPoi.type === "traffic" && <Navigation className="w-4 h-4 text-emerald-400 rotate-90" />}
              {selectedPoi.type === "emergency" && <AlertCircle className="w-4 h-4 text-red-500 animate-bounce" />}
              {selectedPoi.type === "aqi" && <Activity className="w-4 h-4 text-yellow-400" />}
              {selectedPoi.type === "utility" && <Zap className="w-4 h-4 text-amber-400" />}
              {selectedPoi.type === "zone" && <MapPin className="w-4 h-4 text-indigo-400" />}
              <span className="text-xs font-mono font-bold text-white capitalize">{selectedPoi.name}</span>
            </div>
            <p className="text-[10.5px] text-slate-300 leading-relaxed font-sans">{selectedPoi.details}</p>
          </div>
          <button onClick={() => setSelectedPoi(null)} className="text-[9px] font-mono font-semibold text-slate-500 hover:text-slate-300 bg-slate-950 px-2 py-1 rounded">
            CLOSE
          </button>
        </div>
      )}
    </div>
  );
}
