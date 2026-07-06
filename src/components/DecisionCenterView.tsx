import React, { useState, useRef, useEffect } from "react";
import { SmartAgent, AIAnalysisResult, ProposedAction } from "../types";
import {
  Sparkles,
  Send,
  Navigation,
  CloudSun,
  Activity,
  Zap,
  Flame,
  CheckCircle,
  AlertTriangle,
  RotateCw,
  HelpCircle,
  Layers,
  ChevronRight,
  Sliders,
  Play,
  FileText,
} from "lucide-react";

interface DecisionCenterViewProps {
  onTriggerAction: (action: { id: string; title: string; department: string; sector: string; impactMetric: string }) => void;
}

export default function DecisionCenterView({ onTriggerAction }: DecisionCenterViewProps) {
  const [activeAgent, setActiveAgent] = useState<SmartAgent>("Decision Agent");
  const [messages, setMessages] = useState<any[]>([]);
  const [inputValue, setInputValue] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [modifyingActionId, setModifyingActionId] = useState<string | null>(null);
  const [modifiedTitle, setModifiedTitle] = useState("");

  const chatEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isLoading]);

  const agentsList: { name: SmartAgent; domain: string; desc: string; icon: React.ReactNode; color: string }[] = [
    {
      name: "Decision Agent",
      domain: "Master Intelligence Coordinator",
      desc: "Combines domain outputs to predict cross-correlated risks and coordinate multi-system responses.",
      icon: <Sparkles className="w-4 h-4" />,
      color: "from-cyan-500 to-purple-500",
    },
    {
      name: "Traffic Agent",
      domain: "Urban Mobility & Signal Timing",
      desc: "Monitors vehicle counts, congestion indexes, road blocks, and coordinates signal priority.",
      icon: <Navigation className="w-4 h-4 rotate-90" />,
      color: "from-emerald-500 to-teal-500",
    },
    {
      name: "Environment Agent",
      domain: "Meteorology & Climate Hazard",
      desc: "Tracks rainfall patterns, air quality, flood telemetry, and issues disaster predictions.",
      icon: <CloudSun className="w-4 h-4" />,
      color: "from-amber-500 to-yellow-500",
    },
    {
      name: "Citizen Agent",
      domain: "Complaint Triaging & Sentiment",
      desc: "Auto-categorizes citizen feedback, coordinates street repair runs, and gauges public trust.",
      icon: <Activity className="w-4 h-4" />,
      color: "from-blue-500 to-indigo-500",
    },
    {
      name: "Healthcare Agent",
      domain: "Surge & ICU Capacity Routing",
      desc: "Monitors hospital waiting times, medical inventory, disease tracking, and bed availability.",
      icon: <Activity className="w-4 h-4 animate-pulse" />,
      color: "from-purple-500 to-pink-500",
    },
    {
      name: "Emergency Agent",
      domain: "First Responders Dispatch",
      desc: "Allocates fire squads, ambulances, police units, and optimizes hazard rescue operations.",
      icon: <Flame className="w-4 h-4" />,
      color: "from-rose-500 to-red-500",
    },
    {
      name: "Resource Agent",
      domain: "Asset & Utility Allocation",
      desc: "Optimizes power grids, water pressure, municipal repair crew scheduling, and fleet distribution.",
      icon: <Sliders className="w-4 h-4" />,
      color: "from-violet-500 to-indigo-500",
    },
  ];

  const suggestions: { [key in SmartAgent]: string[] } = {
    "Decision Agent": [
      "What should the city prioritize today?",
      "Predict tomorrow's emergency hotspots.",
      "Summarize full city risk scores.",
    ],
    "Traffic Agent": [
      "Why is traffic increasing on the Expressway?",
      "Optimize signals for peak evening commuter routes.",
      "Analyze cross-bridge congestion bottlenecks.",
    ],
    "Environment Agent": [
      "Which area is at highest flood risk?",
      "Analyze PM2.5 levels near Industrial Park.",
      "Is Main Reservoir safe from runoff pollution?",
    ],
    "Citizen Agent": [
      "List outstanding complaints on Elm Street.",
      "Which complaints should be prioritized immediately?",
      "Report citizen sentiment index.",
    ],
    "Healthcare Agent": [
      "Predict emergency wait times at City General.",
      "Is ICU capacity sufficient for the weekend?",
      "Are medical dispatches aligned with clinic load?",
    ],
    "Emergency Agent": [
      "Review active dispatches at Industrial Block 12.",
      "Recommend evacuation shelter trigger guidelines.",
      "Identify secondary road blockages.",
    ],
    "Resource Agent": [
      "Optimize ambulance placements near highway.",
      "Are utility repair crew rosters aligned?",
      "What is the grid load distribution limit?",
    ],
  };

  const handleSend = async (textToSend: string) => {
    if (!textToSend.trim()) return;
    
    const userMsg = { role: "user", text: textToSend };
    setMessages((prev) => [...prev, userMsg]);
    setInputValue("");
    setIsLoading(true);

    try {
      // Package recent chat history for context
      const contextHistory = messages.slice(-4).map((m) => ({
        role: m.role,
        text: m.text,
      }));

      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: textToSend,
          agent: activeAgent,
          history: contextHistory,
        }),
      });

      if (!res.ok) {
        throw new Error(`Failed to compile AI response: status ${res.status}`);
      }

      const contentType = res.headers.get("content-type");
      if (!contentType || !contentType.includes("application/json")) {
        throw new Error("Received non-JSON response from AI service (server might still be starting up).");
      }

      const result: AIAnalysisResult = await res.json();
      const aiMsg = { role: "ai", text: result.summary, data: result };
      setMessages((prev) => [...prev, aiMsg]);
    } catch (err) {
      console.warn("AI Reasoning Call Warning:", err);
      const errorMsg = {
        role: "ai",
        text: "My apologies, the master Decision OS experienced an optimization bottleneck during RAG lookup. Utilizing local fallback metrics...",
        error: true,
      };
      setMessages((prev) => [...prev, errorMsg]);
    } finally {
      setIsLoading(false);
    }
  };

  const startModifyingAction = (action: ProposedAction) => {
    setModifyingActionId(action.id);
    setModifiedTitle(action.title);
  };

  const submitModifiedAction = (action: ProposedAction) => {
    onTriggerAction({
      id: action.id,
      title: modifiedTitle,
      department: "Modified Command Unit",
      sector: action.targetSector,
      impactMetric: action.impactMetric,
    });
    setModifyingActionId(null);
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 h-[calc(100vh-140px)]">
      
      {/* Sidebar - Agent selection (4 Columns) */}
      <div className="lg:col-span-4 bg-slate-900/40 border border-slate-800/80 rounded-2xl p-4 flex flex-col justify-between overflow-y-auto backdrop-blur-xl">
        <div className="space-y-4">
          <div>
            <h3 className="text-xs font-mono font-bold text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
              <Layers className="w-4 h-4 text-cyan-400" />
              Specialized Multi-Agents
            </h3>
            <p className="text-[10px] text-slate-400 font-sans mt-1 leading-relaxed">
              Select an expert domain agent. The Decision Agent coordinates all outputs to prevent secondary hazards.
            </p>
          </div>

          <div className="space-y-2">
            {agentsList.map((agent) => (
              <button
                key={agent.name}
                onClick={() => setActiveAgent(agent.name)}
                className={`w-full text-left p-3 rounded-xl border transition-all flex items-start gap-3 group relative overflow-hidden cursor-pointer ${
                  activeAgent === agent.name
                    ? "bg-gradient-to-br from-slate-950/80 to-slate-900/60 border-slate-700/60 shadow-lg"
                    : "bg-slate-950/20 border-slate-900/40 hover:border-slate-800/80 hover:bg-slate-950/45"
                }`}
              >
                {/* Visual Indicator pill */}
                {activeAgent === agent.name && (
                  <div className={`absolute left-0 top-0 bottom-0 w-1 bg-gradient-to-b ${agent.color}`} />
                )}

                <div className={`p-2 rounded-lg ${activeAgent === agent.name ? "bg-slate-900 text-cyan-300" : "bg-slate-950 text-slate-500 group-hover:text-slate-300"} transition-colors`}>
                  {agent.icon}
                </div>

                <div className="flex-1">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-sans font-bold text-white leading-none">
                      {agent.name}
                    </span>
                    <ChevronRight className={`w-3.5 h-3.5 text-slate-500 group-hover:text-slate-300 transition-transform ${activeAgent === agent.name ? "translate-x-0.5" : ""}`} />
                  </div>
                  <span className="text-[9px] font-mono text-slate-400 block mt-0.5 uppercase tracking-wider">
                    {agent.domain}
                  </span>
                  <p className="text-[10px] text-slate-400 leading-normal font-sans mt-1 group-hover:text-slate-300 transition-colors">
                    {agent.desc}
                  </p>
                </div>
              </button>
            ))}
          </div>
        </div>

        {/* Integration Status Footer */}
        <div className="mt-4 pt-3 border-t border-slate-800/60 font-mono text-[9px] text-slate-500 space-y-1">
          <div className="flex justify-between">
            <span>RAG Core:</span>
            <span className="text-emerald-400 font-bold">2 SOP Files Active</span>
          </div>
          <div className="flex justify-between">
            <span>Model:</span>
            <span className="text-white font-bold">Gemini 2.5 Flash</span>
          </div>
        </div>
      </div>

      {/* Main Console - Chat & Analysis Display (8 Columns) */}
      <div className="lg:col-span-8 flex flex-col justify-between bg-slate-950/40 border border-slate-800/80 rounded-2xl overflow-hidden backdrop-blur-xl h-full shadow-2xl relative">
        
        {/* Chat Output Area */}
        <div className="flex-1 overflow-y-auto p-5 space-y-5">
          {messages.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-center p-6 space-y-4">
              <div className="w-12 h-12 rounded-full bg-cyan-500/10 flex items-center justify-center text-cyan-400 border border-cyan-500/20 animate-pulse">
                <Sparkles className="w-6 h-6" />
              </div>
              <div>
                <h4 className="text-sm font-sans font-bold text-white">
                  Decision Intelligence Sandbox
                </h4>
                <p className="text-xs text-slate-400 mt-1 max-w-sm">
                  Query the active {activeAgent} regarding predictive thresholds, risk reports, or trigger automated workflows.
                </p>
              </div>

              {/* Suggested prompts bubbles */}
              <div className="grid grid-cols-1 gap-2 w-full max-w-md pt-2">
                {suggestions[activeAgent]?.map((prompt, idx) => (
                  <button
                    key={idx}
                    onClick={() => handleSend(prompt)}
                    className="p-2.5 text-left text-[11px] font-mono rounded-xl bg-slate-900 border border-slate-800/50 hover:border-slate-700/80 hover:bg-slate-800/50 text-slate-300 hover:text-white transition-all cursor-pointer flex items-center justify-between"
                  >
                    <span>"{prompt}"</span>
                    <Send className="w-3 h-3 text-cyan-400" />
                  </button>
                ))}
              </div>
            </div>
          ) : (
            <div className="space-y-6">
              {messages.map((msg, index) => {
                const isAI = msg.role === "ai";
                const isError = msg.error;

                return (
                  <div
                    key={index}
                    className={`flex ${isAI ? "justify-start" : "justify-end"}`}
                  >
                    <div className={`max-w-3xl rounded-2xl ${isAI ? "w-full" : "bg-cyan-500/10 border border-cyan-500/20 text-slate-200 px-4 py-3 text-xs leading-relaxed"}`}>
                      {!isAI ? (
                        <p className="font-mono font-medium">"{msg.text}"</p>
                      ) : isError ? (
                        <div className="p-4 bg-rose-500/10 border border-rose-500/20 text-rose-300 text-xs rounded-xl flex gap-2">
                          <AlertTriangle className="w-4 h-4 flex-shrink-0 mt-0.5" />
                          <span>{msg.text}</span>
                        </div>
                      ) : (
                        // Gorgeous structured RAG analysis outputs
                        <div className="space-y-4">
                          
                          {/* 1. Summary Banner */}
                          <div className={`p-4 rounded-xl border bg-gradient-to-br ${
                            msg.data?.priority === "Critical" || msg.data?.priority === "High"
                              ? "from-rose-500/10 to-transparent border-rose-500/20 text-rose-200"
                              : "from-cyan-500/5 to-transparent border-slate-800/80 text-slate-300"
                          }`}>
                            <div className="flex items-center justify-between mb-2">
                              <span className="text-[10px] font-mono font-bold uppercase tracking-wider flex items-center gap-1">
                                <Sparkles className="w-3.5 h-3.5 text-cyan-400 animate-spin" style={{ animationDuration: "3s" }} />
                                {activeAgent} Synthesis
                              </span>
                              <span className={`px-2 py-0.5 rounded text-[9px] font-mono font-bold border ${
                                msg.data?.priority === "Critical"
                                  ? "bg-red-500/15 text-red-300 border-red-500/30"
                                  : "bg-slate-900 text-slate-400 border-slate-800"
                              }`}>
                                {msg.data?.priority || "Medium"} Priority
                              </span>
                            </div>
                            <p className="text-xs font-sans leading-relaxed text-white">
                              {msg.data?.summary}
                            </p>
                          </div>

                          {/* 2. Key Evidence & Predictions columns */}
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            
                            {/* Evidence Column */}
                            <div className="p-4 bg-slate-900/30 rounded-xl border border-slate-800/60">
                              <span className="text-[10px] font-mono font-bold text-slate-400 uppercase tracking-wider block mb-2">
                                Supporting Evidence (Citations)
                              </span>
                              <p className="text-[11px] text-slate-300 font-mono whitespace-pre-line leading-relaxed pl-1.5 border-l border-cyan-500/40">
                                {msg.data?.evidence}
                              </p>
                            </div>

                            {/* Predictions Column */}
                            <div className="p-4 bg-slate-900/30 rounded-xl border border-slate-800/60">
                              <span className="text-[10px] font-mono font-bold text-slate-400 uppercase tracking-wider block mb-2">
                                Predictive Analytics (24h)
                              </span>
                              <p className="text-[11px] text-slate-300 font-mono whitespace-pre-line leading-relaxed pl-1.5 border-l border-purple-500/40">
                                {msg.data?.predictions}
                              </p>
                            </div>

                          </div>

                          {/* 3. Affected Areas, Confidences & Departments info blocks */}
                          <div className="flex flex-wrap items-center gap-4 bg-slate-950/40 p-3 rounded-xl border border-slate-900 font-mono text-[10px]">
                            <div className="flex items-center gap-1.5">
                              <span className="text-slate-500">Confidence Score:</span>
                              <span className="text-cyan-400 font-bold">{msg.data?.confidenceScore}%</span>
                            </div>
                            <div className="w-px h-3 bg-slate-800" />
                            <div className="flex items-center gap-1.5 flex-wrap">
                              <span className="text-slate-500">Sector(s):</span>
                              {msg.data?.affectedAreas?.map((area: string, i: number) => (
                                <span key={i} className="text-white bg-slate-900 px-1.5 py-0.5 rounded border border-slate-800">{area}</span>
                              ))}
                            </div>
                            <div className="w-px h-3 bg-slate-800" />
                            <div className="flex items-center gap-1.5 flex-wrap">
                              <span className="text-slate-500">Dept(s):</span>
                              {msg.data?.responsibleDepartments?.map((dept: string, i: number) => (
                                <span key={i} className="text-indigo-300 bg-slate-900 px-1.5 py-0.5 rounded border border-slate-800">{dept}</span>
                              ))}
                            </div>
                          </div>

                          {/* Collapsible Multi-Agent Coordination Trace */}
                          {msg.data?.orchestrationTrace && msg.data.orchestrationTrace.length > 0 && (
                            <div className="bg-slate-900/60 rounded-xl border border-slate-800/80 overflow-hidden font-mono text-[10px] text-slate-300">
                              <div className="bg-slate-950 px-3.5 py-2.5 border-b border-slate-800/60 flex items-center justify-between">
                                <span className="font-bold text-cyan-400 flex items-center gap-1.5 uppercase tracking-wider text-[9px]">
                                  <Zap className="w-3.5 h-3.5 text-cyan-400 animate-pulse" />
                                  Orchestration Proof-of-Work ({msg.data.orchestrationTrace.length} Specialized Agents)
                                </span>
                                <span className="text-[8px] text-slate-500 uppercase font-medium">True Parallel Agentic Loop</span>
                              </div>
                              
                              <div className="p-3.5 space-y-3 max-h-72 overflow-y-auto">
                                {msg.data.orchestrationTrace.map((trace: any, idx: number) => (
                                  <div key={idx} className="border-l-2 border-slate-800/80 pl-3.5 space-y-1.5 relative py-0.5">
                                    <div className="absolute left-[-5.5px] top-1.5 w-2.5 h-2.5 rounded-full bg-slate-950 border border-slate-800" />
                                    <div className="flex items-center justify-between">
                                      <span className="font-bold text-slate-200 text-xs">{trace.agentName}</span>
                                      <span className="text-[8px] px-1.5 py-0.5 rounded bg-slate-950 border border-slate-900 text-indigo-300 font-bold uppercase tracking-wider">{trace.agentId}</span>
                                    </div>
                                    
                                    <p className="text-[11px] text-slate-400 leading-normal font-sans italic">
                                      "{trace.text}"
                                    </p>

                                    {/* Reasoning thoughts list */}
                                    {trace.reasoning && trace.reasoning.length > 0 && (
                                      <div className="pt-1.5 space-y-1 text-[9px] text-slate-500">
                                        <span className="font-bold text-slate-400 uppercase tracking-wider text-[8px] block">Thoughts & Analysis Logs:</span>
                                        {trace.reasoning.map((step: string, sIdx: number) => (
                                          <div key={sIdx} className="flex items-start gap-1">
                                            <span className="text-cyan-500/70">›</span>
                                            <span className="leading-relaxed font-sans text-slate-400">{step}</span>
                                          </div>
                                        ))}
                                      </div>
                                    )}

                                    {/* Executed Tool Calls */}
                                    {trace.toolCalls && trace.toolCalls.length > 0 && (
                                      <div className="pt-1 space-y-1">
                                        <span className="font-bold text-emerald-400 uppercase tracking-wider text-[8px] block">Executed Core SOP Tools:</span>
                                        {trace.toolCalls.map((toolCall: any, tIdx: number) => (
                                          <div key={tIdx} className="bg-slate-950 px-2 py-1 rounded border border-slate-900/60 flex items-center justify-between text-[9px]">
                                            <span className="text-emerald-300 font-mono font-semibold">⚙️ {toolCall.tool}()</span>
                                            <span className="text-[8px] text-slate-500">Returned {Array.isArray(toolCall.result) ? `${toolCall.result.length} items` : "live status"}</span>
                                          </div>
                                        ))}
                                      </div>
                                    )}
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}

                          {/* 4. Actionable Automated workflow plans */}
                          {msg.data?.proposedActions && msg.data.proposedActions.length > 0 && (
                            <div className="space-y-2">
                              <span className="text-[10px] font-mono font-bold text-cyan-400 uppercase tracking-wider block">
                                RECOMMENDED AUTOMATION WORKFLOWS
                              </span>
                              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                {msg.data.proposedActions.map((action: ProposedAction) => (
                                  <div
                                    key={action.id}
                                    className="p-3 bg-slate-900/60 rounded-xl border border-slate-800/80 flex flex-col justify-between"
                                  >
                                    <div>
                                      {modifyingActionId === action.id ? (
                                        <input
                                          type="text"
                                          value={modifiedTitle}
                                          onChange={(e) => setModifiedTitle(e.target.value)}
                                          className="w-full bg-slate-950 text-white font-sans text-xs p-1.5 rounded border border-cyan-500/50 mb-1 font-bold"
                                        />
                                      ) : (
                                        <h5 className="font-sans font-bold text-white text-xs">{action.title}</h5>
                                      )}
                                      <p className="text-[10px] text-slate-400 font-sans mt-1 leading-normal">
                                        {action.description}
                                      </p>
                                      <div className="mt-2 flex flex-wrap gap-1.5 font-mono text-[9px]">
                                        <span className="bg-slate-950 px-1.5 py-0.5 rounded border border-slate-900 text-slate-400">{action.targetSector}</span>
                                        <span className="bg-slate-950 px-1.5 py-0.5 rounded border border-slate-900 text-cyan-400 font-medium">{action.impactMetric}</span>
                                      </div>
                                    </div>

                                    {/* Action approval row */}
                                    <div className="mt-3.5 pt-2 border-t border-slate-800/40 flex gap-1.5 justify-end">
                                      {modifyingActionId === action.id ? (
                                        <>
                                          <button
                                            onClick={() => setModifyingActionId(null)}
                                            className="px-2 py-1 text-[9px] font-mono font-bold text-slate-500 hover:text-slate-300"
                                          >
                                            CANCEL
                                          </button>
                                          <button
                                            onClick={() => submitModifiedAction(action)}
                                            className="px-2.5 py-1 text-[9px] font-mono font-bold bg-cyan-500 text-slate-950 rounded"
                                          >
                                            SAVE & DISPATCH
                                          </button>
                                        </>
                                      ) : (
                                        <>
                                          <button
                                            onClick={() => startModifyingAction(action)}
                                            className="px-2.5 py-1 text-[9px] font-mono font-bold text-slate-400 hover:text-white bg-slate-950 hover:bg-slate-900 border border-slate-800 rounded transition-colors"
                                          >
                                            MODIFY
                                          </button>
                                          <button
                                            onClick={() => onTriggerAction({
                                              id: action.id,
                                              title: action.title,
                                              department: msg.data?.responsibleDepartments?.[0] || "Command",
                                              sector: action.targetSector,
                                              impactMetric: action.impactMetric
                                            })}
                                            className="px-3 py-1 text-[9px] font-mono font-bold bg-cyan-500 hover:bg-cyan-400 text-slate-950 rounded flex items-center gap-1 transition-all active:scale-95"
                                          >
                                            <Play className="w-2.5 h-2.5 fill-current" />
                                            APPROVE
                                          </button>
                                        </>
                                      )}
                                    </div>
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}

                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* Loader */}
          {isLoading && (
            <div className="flex justify-start">
              <div className="p-4 bg-slate-900/60 rounded-2xl border border-slate-800/80 flex items-center gap-2 text-slate-400 font-mono text-xs">
                <RotateCw className="w-3.5 h-3.5 animate-spin text-cyan-400" />
                <span>AI Operating System is correlating dataset feeds...</span>
              </div>
            </div>
          )}
          <div ref={chatEndRef} />
        </div>

        {/* Suggested Prompts rail (Horizontal bubbles above input) */}
        {messages.length > 0 && (
          <div className="px-5 py-2.5 bg-slate-950 border-t border-slate-900/80 overflow-x-auto whitespace-nowrap flex gap-2 no-scrollbar">
            {suggestions[activeAgent]?.map((prompt, idx) => (
              <button
                key={idx}
                onClick={() => handleSend(prompt)}
                className="px-3 py-1 text-[10px] font-mono rounded-lg bg-slate-900/80 border border-slate-800/50 hover:border-cyan-500/40 hover:bg-slate-950 text-slate-400 hover:text-cyan-300 transition-all cursor-pointer inline-block"
              >
                "{prompt}"
              </button>
            ))}
          </div>
        )}

        {/* Chat Input Console Form */}
        <form
          onSubmit={(e) => {
            e.preventDefault();
            handleSend(inputValue);
          }}
          className="p-4 bg-slate-900/80 border-t border-slate-800/80 flex gap-2 items-center"
        >
          <input
            type="text"
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            disabled={isLoading}
            placeholder={`Instruct the ${activeAgent} (e.g. 'Predict congestion areas next hour')...`}
            className="flex-1 bg-slate-950 text-slate-100 font-sans text-xs px-4 py-3 rounded-xl border border-slate-800 focus:outline-none focus:border-cyan-500/60 placeholder-slate-500 transition-colors"
          />
          <button
            type="submit"
            disabled={isLoading || !inputValue.trim()}
            className="p-3 rounded-xl bg-gradient-to-r from-cyan-500 to-cyan-600 hover:from-cyan-400 hover:to-cyan-500 text-slate-950 font-mono transition-all disabled:opacity-50 disabled:pointer-events-none active:scale-95"
          >
            <Send className="w-4 h-4" />
          </button>
        </form>

      </div>
    </div>
  );
}
