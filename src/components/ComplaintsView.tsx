import React, { useState } from "react";
import { ComplaintRecord } from "../types";
import {
  FileText,
  AlertTriangle,
  Clock,
  Sparkles,
  MapPin,
  Building,
  CheckCircle,
  PlusCircle,
  XCircle,
  CornerDownRight,
  Send,
} from "lucide-react";

interface ComplaintsViewProps {
  complaints: ComplaintRecord[];
  onAddComplaint: (complaint: { title: string; description: string; location: string; imageUrl?: string }) => void;
}

export default function ComplaintsView({ complaints, onAddComplaint }: ComplaintsViewProps) {
  const [showForm, setShowForm] = useState(false);
  const [title, setTitle] = useState("");
  const [location, setLocation] = useState("");
  const [description, setDescription] = useState("");
  const [imageUrl, setImageUrl] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title || !location || !description) return;

    setIsSubmitting(true);
    try {
      await onAddComplaint({ title, location, description, imageUrl });
      setTitle("");
      setLocation("");
      setDescription("");
      setImageUrl("");
      setShowForm(false);
    } catch (err) {
      console.error(err);
    } finally {
      setIsSubmitting(false);
    }
  };

  const getPriorityStyle = (priority: string) => {
    switch (priority.toLowerCase()) {
      case "critical":
        return "bg-red-500/10 text-red-400 border-red-500/20";
      case "high":
        return "bg-orange-500/10 text-orange-400 border-orange-500/20";
      case "medium":
        return "bg-yellow-500/10 text-yellow-400 border-yellow-500/20";
      default:
        return "bg-emerald-500/10 text-emerald-400 border-emerald-500/20";
    }
  };

  const getStatusStyle = (status: string) => {
    switch (status.toLowerCase()) {
      case "resolved":
        return "bg-emerald-500/15 text-emerald-300 border-emerald-500/30";
      case "in progress":
        return "bg-cyan-500/15 text-cyan-300 border-cyan-500/30";
      case "assigned":
        return "bg-purple-500/15 text-purple-300 border-purple-500/30";
      default:
        return "bg-slate-900 text-slate-400 border-slate-800";
    }
  };

  return (
    <div className="space-y-6">
      
      {/* View Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-6 bg-slate-900/40 rounded-2xl border border-slate-800/80 backdrop-blur-xl">
        <div>
          <h2 className="text-xl font-sans font-bold tracking-tight text-white flex items-center gap-2">
            Citizen Complaints & Triage
            <span className="text-xs font-mono font-medium text-cyan-400 bg-cyan-500/10 px-2 py-0.5 rounded-full border border-cyan-500/20">
              ● REAL-TIME AI ROUTING ACTIVE
            </span>
          </h2>
          <p className="text-xs text-slate-400 mt-1">
            Browse active claims or log a new complaint. CommunityOS uses Gemini in real-time to auto-classify category, priority, and route to corresponding departments.
          </p>
        </div>
        <button
          onClick={() => setShowForm(!showForm)}
          className="px-4 py-2.5 text-xs font-mono font-bold rounded-xl bg-gradient-to-r from-cyan-500 to-cyan-600 hover:from-cyan-400 hover:to-cyan-500 text-slate-950 flex items-center justify-center gap-1.5 cursor-pointer shadow-lg active:scale-95 transition-all"
        >
          {showForm ? <XCircle className="w-4 h-4" /> : <PlusCircle className="w-4 h-4" />}
          {showForm ? "Cancel Log" : "Log New Claim"}
        </button>
      </div>

      {/* Submitting Form Modal/Collapse */}
      {showForm && (
        <div className="p-6 bg-slate-900/80 rounded-2xl border border-cyan-500/20 shadow-2xl backdrop-blur-2xl space-y-4 animate-fade-in">
          <span className="text-xs font-mono font-bold text-cyan-400 uppercase tracking-wider flex items-center gap-1.5">
            <Sparkles className="w-4 h-4 text-cyan-400 animate-spin" style={{ animationDuration: "3s" }} />
            Log New Claim with Auto AI Category & Triage Router
          </span>

          <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-4">
              <div>
                <label className="text-[10px] font-mono font-bold text-slate-400 block mb-1">CLAIM TITLE</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Hazardous deep pothole on Westside"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="w-full bg-slate-950 text-white font-sans text-xs px-3 py-2.5 rounded-xl border border-slate-800 focus:outline-none focus:border-cyan-500/40"
                />
              </div>

              <div>
                <label className="text-[10px] font-mono font-bold text-slate-400 block mb-1">LOCATION CORRIDOR / ADDRESS</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. 128 Maple Lane or Downtown Route 2"
                  value={location}
                  onChange={(e) => setLocation(e.target.value)}
                  className="w-full bg-slate-950 text-white font-sans text-xs px-3 py-2.5 rounded-xl border border-slate-800 focus:outline-none focus:border-cyan-500/40"
                />
              </div>

              <div>
                <label className="text-[10px] font-mono font-bold text-slate-400 block mb-1">MOCK IMAGE CORNER URL (OPTIONAL)</label>
                <input
                  type="text"
                  placeholder="Paste an unsplash image link if desired"
                  value={imageUrl}
                  onChange={(e) => setImageUrl(e.target.value)}
                  className="w-full bg-slate-950 text-white font-sans text-xs px-3 py-2.5 rounded-xl border border-slate-800 focus:outline-none focus:border-cyan-500/40"
                />
              </div>
            </div>

            <div className="flex flex-col justify-between space-y-4">
              <div className="flex-1 flex flex-col">
                <label className="text-[10px] font-mono font-bold text-slate-400 block mb-1">DESCRIPTION DETAILS</label>
                <textarea
                  required
                  rows={5}
                  placeholder="Provide precise details of the hazard. e.g. 'A large tree branch has snapped and is completely blocking the southbound lane. Highly hazardous at night.'"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="flex-1 w-full bg-slate-950 text-white font-sans text-xs px-3 py-2.5 rounded-xl border border-slate-800 focus:outline-none focus:border-cyan-500/40 resize-none"
                />
              </div>

              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full py-2.5 rounded-xl bg-gradient-to-r from-cyan-500 to-cyan-600 hover:from-cyan-400 hover:to-cyan-500 text-slate-950 font-mono font-bold text-xs flex items-center justify-center gap-1.5 transition-all cursor-pointer disabled:opacity-50"
              >
                {isSubmitting ? (
                  <>
                    <Clock className="w-3.5 h-3.5 animate-spin" />
                    GEMINI CLASSIFYING DIRECTIVE...
                  </>
                ) : (
                  <>
                    <Send className="w-3.5 h-3.5" />
                    SUBMIT TO MUNICIPAL AI ROUTER
                  </>
                )}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Complaints Grid Layout */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        {complaints.map((comp) => (
          <div
            key={comp.id}
            className="p-5 bg-slate-900/40 rounded-2xl border border-slate-800/80 backdrop-blur-xl hover:border-slate-700/80 transition-all flex flex-col justify-between"
          >
            <div>
              {/* Header Status Bar */}
              <div className="flex flex-wrap items-center justify-between gap-2 mb-3 font-mono text-[10px]">
                <span className="font-bold text-slate-500 uppercase tracking-wider">{comp.id}</span>
                <div className="flex gap-1.5">
                  <span className={`px-2 py-0.5 rounded-md border font-semibold text-[9px] ${getPriorityStyle(comp.priority)}`}>
                    {comp.priority}
                  </span>
                  <span className={`px-2 py-0.5 rounded-md border font-bold text-[9px] ${getStatusStyle(comp.status)}`}>
                    {comp.status}
                  </span>
                </div>
              </div>

              <h3 className="font-sans font-bold text-white text-sm mb-1">{comp.title}</h3>

              <div className="flex flex-col gap-1.5 mb-3 text-[10.5px]">
                <div className="flex items-center gap-1.5 text-slate-400 font-mono">
                  <MapPin className="w-3.5 h-3.5 text-cyan-400" />
                  <span>{comp.location}</span>
                </div>
                <div className="flex items-center gap-1.5 text-slate-400 font-mono">
                  <Building className="w-3.5 h-3.5 text-purple-400" />
                  <span>
                    Dept: <strong className="text-white">{comp.department}</strong>
                  </span>
                </div>
              </div>

              <p className="text-xs text-slate-300 font-sans leading-relaxed mb-4">{comp.description}</p>

              {comp.image_url && (
                <div className="mb-4 rounded-xl border border-slate-800/60 overflow-hidden max-h-[140px]">
                  <img
                    src={comp.image_url}
                    alt="Citizen Upload"
                    referrerPolicy="no-referrer"
                    className="w-full h-full object-cover"
                  />
                </div>
              )}
            </div>

            {/* AI Actionable Suggestion bottom panel */}
            <div className="pt-3 border-t border-slate-800/60 bg-slate-950/20 p-2.5 rounded-xl border border-slate-900/40">
              <span className="text-[9.5px] font-mono font-bold text-cyan-400 uppercase tracking-wider flex items-center gap-1">
                <Sparkles className="w-3.5 h-3.5 text-cyan-400 animate-spin" style={{ animationDuration: "3s" }} />
                AI TRIAGE SUGGESTION
              </span>
              <p className="text-[10.5px] text-slate-300 font-sans mt-1 pl-3 border-l border-cyan-500/40 leading-relaxed">
                {comp.suggested_action}
              </p>
            </div>

          </div>
        ))}
      </div>

    </div>
  );
}
