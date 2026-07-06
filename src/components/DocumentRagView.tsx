import React, { useState, useEffect, useRef } from "react";
import {
  UploadCloud,
  FileText,
  Trash2,
  Sliders,
  Search,
  FileCheck,
  Send,
  CheckCircle,
  XCircle,
  BookOpen,
  Sparkles,
  Info,
  ChevronRight,
  Database,
  ArrowRight
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";

interface RagDocument {
  id: string;
  filename: string;
  fileSize: number;
  mimeType: string;
  uploadTime: string;
  chunkCount: number;
  active: boolean;
  category: string;
}

interface RagSettings {
  chunkSize: number;
  chunkOverlap: number;
  alpha: number;
  searchLimit: number;
}

interface ChatMessage {
  id: string;
  role: "user" | "assistant";
  text: string;
  citations?: { index: number; filename: string; text: string }[];
  timestamp: string;
}

export default function DocumentRagView() {
  const [documents, setDocuments] = useState<RagDocument[]>([]);
  const [settings, setSettings] = useState<RagSettings>({
    chunkSize: 600,
    chunkOverlap: 100,
    alpha: 0.7,
    searchLimit: 5,
  });
  
  // Document Management State
  const [uploadCategory, setUploadCategory] = useState("Policy Guideline");
  const [isUploading, setIsUploading] = useState(false);
  const [dragActive, setDragActive] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  // Search Visualizer State
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  
  // Chat Playground State
  const [chatInput, setChatInput] = useState("");
  const [chatHistory, setChatHistory] = useState<ChatMessage[]>([]);
  const [isChatting, setIsChatting] = useState(false);
  const [activeCitations, setActiveCitations] = useState<{ index: number; filename: string; text: string }[]>([]);
  const chatBottomRef = useRef<HTMLDivElement>(null);
  
  // Tabs for interactive playground
  const [activePlaygroundTab, setActivePlaygroundTab] = useState<"chat" | "search">("chat");
  const [showSettings, setShowSettings] = useState(false);

  // Load documents and settings on mount
  useEffect(() => {
    fetchDocuments();
    fetchSettings();
  }, []);

  useEffect(() => {
    chatBottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [chatHistory]);

  const fetchDocuments = async () => {
    try {
      const res = await fetch("/api/rag/documents");
      if (res.ok) {
        const data = await res.json();
        setDocuments(data.documents || []);
      }
    } catch (err) {
      console.error("Error loading RAG documents:", err);
    }
  };

  const fetchSettings = async () => {
    try {
      const res = await fetch("/api/rag/settings");
      if (res.ok) {
        const data = await res.json();
        if (data.settings) setSettings(data.settings);
      }
    } catch (err) {
      console.error("Error loading RAG settings:", err);
    }
  };

  const handleSaveSettings = async (newSettings: Partial<RagSettings>) => {
    const updated = { ...settings, ...newSettings };
    setSettings(updated);
    try {
      await fetch("/api/rag/settings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(updated),
      });
    } catch (err) {
      console.error("Error saving RAG settings:", err);
    }
  };

  const handleToggleDoc = async (id: string) => {
    try {
      const res = await fetch("/api/rag/documents/toggle", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id }),
      });
      if (res.ok) {
        const data = await res.json();
        setDocuments(data.documents || []);
      }
    } catch (err) {
      console.error("Error toggling document active state:", err);
    }
  };

  const handleDeleteDoc = async (id: string) => {
    if (!confirm("Are you sure you want to delete this document and all its indexed vector chunks? This action is irreversible.")) return;
    try {
      const res = await fetch(`/api/rag/documents/${id}`, {
        method: "DELETE",
      });
      if (res.ok) {
        const data = await res.json();
        setDocuments(data.documents || []);
      }
    } catch (err) {
      console.error("Error deleting document:", err);
    }
  };

  // Drag and drop handlers
  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      await uploadFile(e.dataTransfer.files[0]);
    }
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      await uploadFile(e.target.files[0]);
    }
  };

  const uploadFile = async (file: File) => {
    setIsUploading(true);
    try {
      const reader = new FileReader();
      reader.onload = async () => {
        const base64Content = (reader.result as string).split(",")[1];
        
        const response = await fetch("/api/rag/upload", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            filename: file.name,
            fileContent: base64Content,
            category: uploadCategory,
          }),
        });

        if (response.ok) {
          const data = await response.json();
          setDocuments(data.documents || []);
          alert(`Successfully uploaded, chunked, and indexed "${file.name}" into Vector Space!`);
        } else {
          const errData = await response.json();
          alert(`Failed to index file: ${errData.error || "Unknown error"}`);
        }
      };
      reader.readAsDataURL(file);
    } catch (err) {
      console.error("Error uploading file:", err);
      alert("Error reading file content.");
    } finally {
      setIsUploading(false);
    }
  };

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!searchQuery.trim()) return;
    setIsSearching(true);
    try {
      const res = await fetch("/api/rag/search", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          query: searchQuery,
          limit: settings.searchLimit,
        }),
      });
      if (res.ok) {
        const data = await res.json();
        setSearchResults(data.results || []);
      }
    } catch (err) {
      console.error("Error executing semantic search:", err);
    } finally {
      setIsSearching(false);
    }
  };

  const handleSendChat = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!chatInput.trim() || isChatting) return;

    const userMessage: ChatMessage = {
      id: `msg_${Date.now()}`,
      role: "user",
      text: chatInput,
      timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
    };

    setChatHistory(prev => [...prev, userMessage]);
    setChatInput("");
    setIsChatting(true);

    // Format history for backend
    const apiHistory = chatHistory.map(h => ({
      role: h.role,
      text: h.text,
    }));

    try {
      const res = await fetch("/api/rag/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: userMessage.text,
          history: apiHistory,
        }),
      });

      if (res.ok) {
        const data = await res.json();
        const assistantMessage: ChatMessage = {
          id: `msg_${Date.now()}_reply`,
          role: "assistant",
          text: data.answer,
          citations: data.citations || [],
          timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
        };
        setChatHistory(prev => [...prev, assistantMessage]);
        if (data.citations && data.citations.length > 0) {
          setActiveCitations(data.citations);
        }
      }
    } catch (err) {
      console.error("Error chatting with RAG system:", err);
    } finally {
      setIsChatting(false);
    }
  };

  const formatSize = (bytes: number) => {
    return (bytes / 1024).toFixed(1) + " KB";
  };

  return (
    <div id="document-rag-container" className="space-y-6">
      {/* Top Banner Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between p-6 bg-slate-900/60 border border-slate-800/80 rounded-xl backdrop-blur-md">
        <div>
          <div className="flex items-center gap-2">
            <Database className="w-5 h-5 text-indigo-400" />
            <h1 className="text-xl font-semibold text-slate-100 tracking-tight">Municipal Policy RAG Engine</h1>
          </div>
          <p className="text-slate-400 text-sm mt-1">
            Production-ready vector pipeline with real-time chunking, semantic & keyword hybrid matching, and strict citation grounding.
          </p>
        </div>
        <div className="mt-4 md:mt-0 flex gap-2">
          <button
            onClick={() => setShowSettings(!showSettings)}
            className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-medium border transition-all ${
              showSettings 
                ? "bg-indigo-500/15 text-indigo-300 border-indigo-500/30" 
                : "bg-slate-800/60 text-slate-300 border-slate-700/50 hover:bg-slate-700/60"
            }`}
          >
            <Sliders className="w-3.5 h-3.5" />
            RAG Parameters
          </button>
        </div>
      </div>

      {/* RAG settings drawer */}
      <AnimatePresence>
        {showSettings && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            className="overflow-hidden bg-slate-900/40 border border-slate-800 rounded-xl p-5"
          >
            <h3 className="text-sm font-medium text-slate-200 mb-4 flex items-center gap-2">
              <Sliders className="w-4 h-4 text-indigo-400" />
              Adjust Vector & Chunk Split Settings
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div>
                <label className="block text-xs text-slate-400 mb-1">Chunk Size (chars)</label>
                <input
                  type="number"
                  value={settings.chunkSize}
                  onChange={(e) => handleSaveSettings({ chunkSize: parseInt(e.target.value) || 600 })}
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-1.5 text-xs text-slate-200"
                />
                <span className="text-[10px] text-slate-500 mt-1 block">Standard policy range: 400-800</span>
              </div>
              <div>
                <label className="block text-xs text-slate-400 mb-1">Chunk Overlap (chars)</label>
                <input
                  type="number"
                  value={settings.chunkOverlap}
                  onChange={(e) => handleSaveSettings({ chunkOverlap: parseInt(e.target.value) || 100 })}
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-1.5 text-xs text-slate-200"
                />
                <span className="text-[10px] text-slate-500 mt-1 block">Maintains continuity across segments</span>
              </div>
              <div>
                <label className="block text-xs text-slate-400 mb-1 flex justify-between">
                  <span>Hybrid Weight (Alpha)</span>
                  <span className="text-indigo-400 font-mono">{(settings.alpha * 100).toFixed(0)}% Semantic</span>
                </label>
                <input
                  type="range"
                  min="0"
                  max="1"
                  step="0.05"
                  value={settings.alpha}
                  onChange={(e) => handleSaveSettings({ alpha: parseFloat(e.target.value) })}
                  className="w-full h-1 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-indigo-500 mt-3"
                />
                <div className="flex justify-between text-[9px] text-slate-500 mt-1">
                  <span>Pure BM25 Keyword</span>
                  <span>Pure Semantic</span>
                </div>
              </div>
              <div>
                <label className="block text-xs text-slate-400 mb-1">Search Retrieval Limit</label>
                <input
                  type="number"
                  min="1"
                  max="10"
                  value={settings.searchLimit}
                  onChange={(e) => handleSaveSettings({ searchLimit: parseInt(e.target.value) || 5 })}
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-1.5 text-xs text-slate-200"
                />
                <span className="text-[10px] text-slate-500 mt-1 block">Context chunks supplied to prompt</span>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Document Uploader & Status Table (left 5 columns) */}
        <div className="lg:col-span-5 space-y-6">
          <div className="bg-slate-900/40 border border-slate-800/80 rounded-xl p-5">
            <h2 className="text-sm font-semibold text-slate-200 mb-3 flex items-center gap-2">
              <UploadCloud className="w-4 h-4 text-indigo-400" />
              1. Add Municipal SOP or Policy Document
            </h2>
            
            {/* Category selection */}
            <div className="mb-4">
              <label className="block text-[11px] text-slate-400 mb-1">Document Category</label>
              <div className="flex gap-2">
                {["Policy Guideline", "Emergency Plan", "Technical Guide", "Other"].map((cat) => (
                  <button
                    key={cat}
                    onClick={() => setUploadCategory(cat)}
                    className={`flex-1 py-1 rounded-lg text-[10px] font-medium border transition-all ${
                      uploadCategory === cat
                        ? "bg-indigo-600/10 text-indigo-400 border-indigo-500/30"
                        : "bg-slate-950 text-slate-400 border-slate-800 hover:text-slate-300"
                    }`}
                  >
                    {cat}
                  </button>
                ))}
              </div>
            </div>

            {/* File Drag Drop Zone */}
            <div
              onDragEnter={handleDrag}
              onDragOver={handleDrag}
              onDragLeave={handleDrag}
              onDrop={handleDrop}
              onClick={() => fileInputRef.current?.click()}
              className={`border border-dashed rounded-xl p-6 text-center cursor-pointer transition-all ${
                dragActive
                  ? "border-indigo-500 bg-indigo-500/5"
                  : "border-slate-800 bg-slate-950 hover:border-slate-700"
              }`}
            >
              <input
                type="file"
                ref={fileInputRef}
                onChange={handleFileChange}
                accept=".txt,.md,.json,.csv,.pdf"
                className="hidden"
              />
              <UploadCloud className="w-8 h-8 text-slate-500 mx-auto mb-2" />
              <p className="text-xs text-slate-300 font-medium">
                {isUploading ? "Uploading & Embedding Vector Chunks..." : "Drag and drop or select file"}
              </p>
              <p className="text-[10px] text-slate-500 mt-1">
                Supports TXT, MD, CSV, JSON, and PDF
              </p>
            </div>
          </div>

          <div className="bg-slate-900/40 border border-slate-800/80 rounded-xl p-5">
            <h2 className="text-sm font-semibold text-slate-200 mb-3 flex items-center gap-2">
              <FileText className="w-4 h-4 text-indigo-400" />
              2. Indexed Documents ({documents.length})
            </h2>

            {documents.length === 0 ? (
              <div className="text-center py-6 text-slate-500 text-xs">
                No active RAG policy documents. Upload a file above to index it.
              </div>
            ) : (
              <div className="space-y-3 max-h-[350px] overflow-y-auto pr-1">
                {documents.map((doc) => (
                  <div
                    key={doc.id}
                    className="flex items-center justify-between p-3 bg-slate-950 rounded-lg border border-slate-800/60"
                  >
                    <div className="flex items-start gap-2.5 max-w-[70%]">
                      <FileText className="w-4 h-4 text-slate-400 mt-0.5 shrink-0" />
                      <div>
                        <div className="text-xs font-medium text-slate-200 truncate" title={doc.filename}>
                          {doc.filename}
                        </div>
                        <div className="flex items-center gap-2 mt-1 text-[10px] text-slate-500 font-mono">
                          <span>{doc.category}</span>
                          <span>•</span>
                          <span>{formatSize(doc.fileSize)}</span>
                          <span>•</span>
                          <span className="text-indigo-400 font-bold">{doc.chunkCount} chunks</span>
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => handleToggleDoc(doc.id)}
                        className={`px-2 py-0.5 rounded text-[10px] font-medium border transition-all ${
                          doc.active
                            ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20 hover:bg-emerald-500/20"
                            : "bg-slate-800 text-slate-500 border-slate-700 hover:bg-slate-700"
                        }`}
                        title="Toggle metadata filtering active state"
                      >
                        {doc.active ? "Active" : "Inactive"}
                      </button>
                      <button
                        onClick={() => handleDeleteDoc(doc.id)}
                        className="p-1 hover:bg-red-500/10 rounded text-slate-500 hover:text-red-400 transition-colors"
                        title="Delete Document & Chunks"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Playground Grid (right 7 columns) */}
        <div className="lg:col-span-7 space-y-6">
          <div className="bg-slate-900/40 border border-slate-800/80 rounded-xl overflow-hidden flex flex-col h-[585px]">
            {/* Tab selection */}
            <div className="flex border-b border-slate-800 bg-slate-950/80 p-1 justify-between items-center">
              <div className="flex gap-1">
                <button
                  onClick={() => setActivePlaygroundTab("chat")}
                  className={`flex items-center gap-2 px-4 py-2 text-xs font-semibold rounded-lg transition-all ${
                    activePlaygroundTab === "chat"
                      ? "bg-slate-900 text-slate-100 shadow-sm border border-slate-800"
                      : "text-slate-400 hover:text-slate-200"
                  }`}
                >
                  <Sparkles className="w-3.5 h-3.5 text-indigo-400" />
                  RAG Chat Playground
                </button>
                <button
                  onClick={() => setActivePlaygroundTab("search")}
                  className={`flex items-center gap-2 px-4 py-2 text-xs font-semibold rounded-lg transition-all ${
                    activePlaygroundTab === "search"
                      ? "bg-slate-900 text-slate-100 shadow-sm border border-slate-800"
                      : "text-slate-400 hover:text-slate-200"
                  }`}
                >
                  <Search className="w-3.5 h-3.5 text-indigo-400" />
                  Semantic Search Index
                </button>
              </div>
              <div className="text-[10px] text-slate-500 font-mono px-3">
                PERSISTENT RAG WORKSPACE
              </div>
            </div>

            {/* Playground Panel Content */}
            <div className="flex-1 overflow-hidden p-5 flex flex-col">
              {activePlaygroundTab === "chat" ? (
                // CHAT PLAYGROUND PANEL
                <div className="flex-1 flex flex-col overflow-hidden">
                  {/* Messages scroll box */}
                  <div className="flex-1 overflow-y-auto space-y-4 mb-4 pr-1">
                    {chatHistory.length === 0 ? (
                      <div className="flex flex-col items-center justify-center h-full text-center p-6 space-y-3">
                        <div className="w-10 h-10 rounded-full bg-indigo-600/10 flex items-center justify-center border border-indigo-500/20">
                          <BookOpen className="w-5 h-5 text-indigo-400" />
                        </div>
                        <h4 className="text-xs font-semibold text-slate-300">Policy Query Sandbox</h4>
                        <p className="text-[11px] text-slate-500 max-w-[280px]">
                          Enter municipal questions. The AI is strictly bound to answer based only on active documents with inline sources.
                        </p>
                      </div>
                    ) : (
                      chatHistory.map((msg) => (
                        <div
                          key={msg.id}
                          className={`flex flex-col ${
                            msg.role === "user" ? "items-end" : "items-start"
                          }`}
                        >
                          <div
                            className={`max-w-[85%] rounded-xl px-4 py-3 text-xs leading-relaxed ${
                              msg.role === "user"
                                ? "bg-indigo-600/90 text-slate-50 font-medium"
                                : "bg-slate-950 border border-slate-800 text-slate-100"
                            }`}
                          >
                            {msg.text}
                          </div>
                          
                          {/* Footnotes & Citation display under reply */}
                          {msg.role === "assistant" && msg.citations && msg.citations.length > 0 && (
                            <div className="mt-2 flex flex-wrap gap-1.5 max-w-[85%]">
                              {msg.citations.map((cite) => (
                                <div
                                  key={cite.index}
                                  className="group relative cursor-pointer flex items-center gap-1 px-2 py-0.5 bg-indigo-500/10 hover:bg-indigo-500/20 border border-indigo-500/20 rounded text-[9px] text-indigo-400 font-mono transition-colors"
                                  onClick={() => {
                                    // Highlight citation or show text
                                    alert(`[Source ${cite.index}: ${cite.filename}]\n\n"${cite.text}"`);
                                  }}
                                >
                                  <span>[{cite.index}]</span>
                                  <span className="truncate max-w-[80px]">{cite.filename}</span>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      ))
                    )}
                    {isChatting && (
                      <div className="flex items-center gap-2 text-slate-500 text-xs font-mono">
                        <Sparkles className="w-3.5 h-3.5 text-indigo-400 animate-spin" />
                        Analyzing index guidelines...
                      </div>
                    )}
                    <div ref={chatBottomRef} />
                  </div>

                  {/* Input Form */}
                  <form onSubmit={handleSendChat} className="flex gap-2">
                    <input
                      type="text"
                      value={chatInput}
                      onChange={(e) => setChatInput(e.target.value)}
                      placeholder="Ask the policy document..."
                      className="flex-1 bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-xs text-slate-100 focus:outline-none focus:border-indigo-500"
                    />
                    <button
                      type="submit"
                      disabled={isChatting || !chatInput.trim()}
                      className="px-4 py-2.5 bg-indigo-600 hover:bg-indigo-500 disabled:bg-slate-800 disabled:text-slate-500 text-slate-100 text-xs font-semibold rounded-xl transition-all flex items-center gap-2 shrink-0 shadow-lg shadow-indigo-600/15"
                    >
                      <Send className="w-3.5 h-3.5" />
                      Send
                    </button>
                  </form>
                </div>
              ) : (
                // SEARCH VISUALIZER PANEL
                <div className="flex-1 flex flex-col overflow-hidden">
                  <form onSubmit={handleSearch} className="flex gap-2 mb-4">
                    <input
                      type="text"
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      placeholder="Search index and evaluate hybrid scores..."
                      className="flex-1 bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-xs text-slate-100 focus:outline-none focus:border-indigo-500"
                    />
                    <button
                      type="submit"
                      disabled={isSearching || !searchQuery.trim()}
                      className="px-4 py-2.5 bg-slate-800 hover:bg-slate-700 disabled:bg-slate-900 disabled:text-slate-600 text-slate-100 text-xs font-semibold rounded-xl transition-all flex items-center gap-2"
                    >
                      <Search className="w-3.5 h-3.5" />
                      Query
                    </button>
                  </form>

                  {/* Search Results Display */}
                  <div className="flex-1 overflow-y-auto space-y-4 pr-1">
                    {searchResults.length === 0 ? (
                      <div className="text-center py-12 text-slate-500 text-xs flex flex-col items-center justify-center space-y-2">
                        <Search className="w-8 h-8 text-slate-700" />
                        <span>Perform a query to visualize matching vector chunk parameters.</span>
                      </div>
                    ) : (
                      searchResults.map((result, idx) => (
                        <div
                          key={result.chunk.id}
                          className="bg-slate-950 p-4 rounded-xl border border-slate-800/80 space-y-2.5"
                        >
                          <div className="flex justify-between items-start border-b border-slate-900 pb-2">
                            <div className="max-w-[70%]">
                              <span className="px-1.5 py-0.5 bg-slate-900 text-slate-400 rounded text-[9px] font-mono mr-2">
                                MATCH {idx + 1}
                              </span>
                              <span className="text-[11px] font-medium text-slate-300 truncate" title={result.chunk.filename}>
                                {result.chunk.filename}
                              </span>
                            </div>
                            <div className="flex gap-2">
                              <span className="text-[10px] text-indigo-400 font-mono font-bold bg-indigo-500/5 px-2 py-0.5 rounded border border-indigo-500/10">
                                COMBINED: {(result.score * 100).toFixed(1)}%
                              </span>
                            </div>
                          </div>
                          
                          <p className="text-[11px] text-slate-300 leading-relaxed italic">
                            "{result.chunk.text}"
                          </p>

                          {/* Matching metrics detail */}
                          <div className="flex items-center gap-4 text-[10px] text-slate-500 pt-1.5 font-mono border-t border-slate-900/50">
                            <span>Chunk Index: <b className="text-slate-300">{result.chunk.index}</b></span>
                            <span>•</span>
                            <span>Semantic Cosine: <b className="text-slate-300">{(result.semanticScore * 100).toFixed(0)}%</b></span>
                            <span>•</span>
                            <span>Keyword Token Score: <b className="text-slate-300">{(result.keywordScore * 100).toFixed(0)}%</b></span>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
