import React from "react";
import { ApprovedAction } from "../types";
import { FileText, Download, CheckCircle, ShieldAlert, Sparkles } from "lucide-react";

interface WorkflowModalProps {
  action: ApprovedAction | null;
  onClose: () => void;
}

export default function WorkflowModal({ action, onClose }: WorkflowModalProps) {
  if (!action) return null;

  const handleDownload = () => {
    const element = document.createElement("a");
    const file = new Blob([action.report], { type: "text/plain" });
    element.href = URL.createObjectURL(file);
    element.download = `CommunityOS_Dispatch_${action.dispatchId}.txt`;
    document.body.appendChild(element);
    element.click();
    document.body.removeChild(element);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-md animate-fade-in">
      <div className="relative w-full max-w-2xl bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        
        {/* Modal Header */}
        <div className="p-5 border-b border-slate-800 bg-gradient-to-r from-cyan-500/10 to-purple-500/10 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-cyan-400 animate-pulse" />
            <div>
              <h3 className="text-sm font-mono font-bold text-white uppercase tracking-wider">
                Workflow Dispatched Successfully
              </h3>
              <p className="text-[10px] text-cyan-300/80 font-mono">
                DISPATCH ID: {action.dispatchId} • SECURE TRACE ENABLED
              </p>
            </div>
          </div>
          <span className="px-2.5 py-0.5 text-[9px] font-mono font-bold rounded bg-emerald-500/15 text-emerald-300 border border-emerald-500/30">
            COMPLETED
          </span>
        </div>

        {/* Modal Content */}
        <div className="flex-1 overflow-y-auto p-6 font-mono text-[11px] leading-relaxed space-y-6">
          
          {/* Dispatch Banner */}
          <div className="bg-slate-950 p-4 rounded-xl border border-slate-800/80 flex items-start gap-3">
            <CheckCircle className="w-5 h-5 text-emerald-400 flex-shrink-0 mt-0.5" />
            <div>
              <p className="text-white font-bold text-xs">COMMUNITYOS AUTOMATION DIRECTIVE TRIGGERED</p>
              <p className="text-slate-400 mt-1">
                The master AI Decision Agent recommended an operational optimization. The corresponding smart city automation flow has been successfully compiled and dispatched to relevant municipal services.
              </p>
            </div>
          </div>

          {/* Legal/Official Report Block */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-bold text-slate-300 flex items-center gap-1.5">
                <FileText className="w-3.5 h-3.5 text-cyan-400" />
                OFFICIAL SYSTEM DISPATCH LOG
              </span>
              <button
                onClick={handleDownload}
                className="text-[10px] text-cyan-400 hover:text-cyan-300 flex items-center gap-1 transition-colors"
              >
                <Download className="w-3 h-3" />
                Download Report
              </button>
            </div>
            <pre className="bg-slate-950 p-4 rounded-xl border border-slate-800 text-slate-300 overflow-x-auto whitespace-pre-wrap leading-relaxed max-h-[300px] border-l-4 border-l-cyan-500">
              {action.report}
            </pre>
          </div>

          {/* Simulation Steps Checklist */}
          <div className="space-y-2">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
              Autonomous Action Sequence Checks:
            </span>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-[10px]">
              <div className="flex items-center gap-2 bg-slate-950 p-2 rounded border border-slate-900">
                <CheckCircle className="w-3.5 h-3.5 text-emerald-400" />
                <span className="text-slate-300">Authorize API credentials (Node)</span>
              </div>
              <div className="flex items-center gap-2 bg-slate-950 p-2 rounded border border-slate-900">
                <CheckCircle className="w-3.5 h-3.5 text-emerald-400" />
                <span className="text-slate-300">Parse telemetry threshold trigger</span>
              </div>
              <div className="flex items-center gap-2 bg-slate-950 p-2 rounded border border-slate-900">
                <CheckCircle className="w-3.5 h-3.5 text-emerald-400" />
                <span className="text-slate-300">Broadcast cloud webhook trigger</span>
              </div>
              <div className="flex items-center gap-2 bg-slate-950 p-2 rounded border border-slate-900">
                <CheckCircle className="w-3.5 h-3.5 text-emerald-400" />
                <span className="text-slate-300">Synchronize database indicators</span>
              </div>
            </div>
          </div>

          {/* Cloud Run and BigQuery ready notice */}
          <div className="flex items-center gap-2 bg-indigo-950/20 p-3 rounded-xl border border-indigo-900/30 text-[10px] text-indigo-300">
            <ShieldAlert className="w-4 h-4 text-indigo-400 flex-shrink-0" />
            <span>
              <strong>Google Cloud Architecture:</strong> This routine triggers simulated Cloud Run service workflows and registers audit tables in BigQuery for subsequent Looker Studio dashboard visualization.
            </span>
          </div>

        </div>

        {/* Modal Footer */}
        <div className="p-4 border-t border-slate-800 bg-slate-950/50 flex justify-end gap-2">
          <button
            onClick={onClose}
            className="w-full sm:w-auto px-4 py-2 text-xs font-mono font-bold rounded-xl bg-slate-800 hover:bg-slate-700 text-white transition-colors"
          >
            CLOSE VIEW
          </button>
        </div>

      </div>
    </div>
  );
}
