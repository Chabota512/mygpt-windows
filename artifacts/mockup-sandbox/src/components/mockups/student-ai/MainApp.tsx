import { useState } from "react";
import {
  Sparkles, Send, FileText, Image, BookOpen,
  Settings, ChevronRight, Paperclip, MoreHorizontal,
  WifiOff, Download, Clock, MessageSquare,
  X, Plus, Mic, Layers,
  PanelLeftClose, PanelLeftOpen, PanelRightClose, PanelRightOpen,
  PenLine, Calculator, ChevronUp, Search
} from "lucide-react";

type Message = {
  id: number;
  role: "user" | "assistant";
  content: string;
  timestamp: string;
  image?: string;
  typing?: boolean;
};

const DEMO_MESSAGES: Message[] = [
  {
    id: 1,
    role: "user",
    content: "Can you explain PID control from the diagram I uploaded in our last session?",
    timestamp: "09:14",
  },
  {
    id: 2,
    role: "assistant",
    content: `From your uploaded notes on **PID Control Systems** (Session: Nov 12, 2024), here's a breakdown:\n\nA **PID controller** has three components:\n\n- **P (Proportional):** Reacts to the *current* error. A higher gain means a faster response but can cause overshoot.\n- **I (Integral):** Eliminates steady-state error by accumulating past errors over time.\n- **D (Derivative):** Predicts future error by looking at the rate of change — helps dampen oscillation.\n\nThe combined output is:\n\n**u(t) = Kp·e(t) + Ki·∫e(t)dt + Kd·de(t)/dt**\n\nIn your lab diagram, the feedback loop shows the sensor output being subtracted from the setpoint to compute *e(t)*. Would you like me to draft a lab report section on this?`,
    timestamp: "09:14",
  },
  {
    id: 3,
    role: "user",
    content: "Yes please, write a lab report introduction for this topic.",
    timestamp: "09:15",
  },
  {
    id: 4,
    role: "assistant",
    content: `Here's a draft introduction for your lab report:\n\n---\n\n**Introduction**\n\nProportional-Integral-Derivative (PID) control is one of the most widely adopted feedback control strategies in industrial and academic applications. Its simplicity, robustness, and versatility make it a foundational concept in control systems engineering.\n\nThis experiment investigates the individual and combined effects of the proportional, integral, and derivative control actions on a second-order dynamic system. The primary objective is to observe how each tuning parameter — Kp, Ki, and Kd — influences system stability, transient response, and steady-state error...\n\n---\n\nReady to export? Click **Export to Word** to save this as a formatted .docx file.`,
    timestamp: "09:15",
  },
];

const MEMORY_ITEMS = [
  { icon: FileText, label: "PID Control Notes", date: "Nov 12", type: "notes" },
  { icon: Image, label: "Lab Diagram — Servo Motor", date: "Nov 10", type: "image" },
  { icon: BookOpen, label: "Thermodynamics Ch. 5 PDF", date: "Nov 8", type: "pdf" },
  { icon: FileText, label: "Assignment 3 Draft", date: "Nov 7", type: "doc" },
];

const SESSIONS = [
  { label: "PID Control Study", active: true, time: "Today" },
  { label: "Thermodynamics Laws", active: false, time: "Yesterday" },
  { label: "Circuit Analysis", active: false, time: "Mon" },
  { label: "Mechanics of Materials", active: false, time: "Last week" },
];

export function MainApp() {
  const [input, setInput] = useState("");
  const [activeTab, setActiveTab] = useState<"chat" | "memory" | "docs">("chat");
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [activeChat, setActiveChat] = useState("PID Control Study");
  const [toolsOpen, setToolsOpen] = useState(false);
  const [activeTool, setActiveTool] = useState<string | null>(null);
  const [rightOpen, setRightOpen] = useState(true);

  type Attachment = { name: string; kind: "image" | "pdf" | "doc" };
  const [attachments, setAttachments] = useState<Attachment[]>([
    { name: "servo_diagram.jpg", kind: "image" },
    { name: "Thermodynamics_Ch5.pdf", kind: "pdf" },
  ]);

  function selectChat(label: string) {
    setActiveChat(label);
    // auto-close sidebar after picking a chat
    setSidebarOpen(false);
  }

  return (
    <div className="flex h-screen bg-[#0f1117] text-white font-sans overflow-hidden">
      {/* Sidebar */}
      <aside
        className={`flex-shrink-0 bg-[#13151f] border-r border-white/[0.06] flex flex-col transition-all duration-300 ease-in-out overflow-hidden ${
          sidebarOpen ? "w-64" : "w-12"
        }`}
      >
        {sidebarOpen ? (
          /* ── EXPANDED STATE ── */
          <>
            {/* Logo + close button */}
            <div className="px-4 py-4 border-b border-white/[0.06] flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-indigo-500 to-violet-600 flex items-center justify-center shadow-lg shadow-indigo-500/20 flex-shrink-0">
                  <Sparkles className="w-4 h-4 text-white" />
                </div>
                <div>
                  <p className="text-sm font-semibold tracking-tight whitespace-nowrap">My_GPT 4 Students</p>
                  <p className="text-[10px] text-white/40 font-medium">Offline · Local Model</p>
                </div>
              </div>
              <button
                onClick={() => setSidebarOpen(false)}
                className="w-7 h-7 flex items-center justify-center rounded-lg text-white/30 hover:text-white/70 hover:bg-white/[0.06] transition-colors flex-shrink-0"
                title="Close sidebar"
              >
                <PanelLeftClose className="w-4 h-4" />
              </button>
            </div>

            {/* New Chat Button */}
            <div className="px-4 py-3">
              <button className="w-full flex items-center gap-2 px-3 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-500 transition-colors text-sm font-medium shadow-md shadow-indigo-500/20">
                <Plus className="w-4 h-4" />
                New Chat
              </button>
            </div>

            {/* Chats + Memory list */}
            <div className="flex-1 overflow-y-auto px-3 pb-4">
              <p className="text-[10px] uppercase tracking-widest text-white/30 font-semibold px-2 mb-2">Chats</p>
              <div className="space-y-0.5">
                {SESSIONS.map((s) => (
                  <button
                    key={s.label}
                    onClick={() => selectChat(s.label)}
                    className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-left transition-all ${
                      activeChat === s.label
                        ? "bg-indigo-600/20 text-white border border-indigo-500/20"
                        : "text-white/50 hover:text-white/80 hover:bg-white/[0.04]"
                    }`}
                  >
                    <MessageSquare className={`w-3.5 h-3.5 flex-shrink-0 ${activeChat === s.label ? "text-indigo-400" : ""}`} />
                    <span className="text-xs flex-1 truncate font-medium">{s.label}</span>
                    <span className="text-[10px] text-white/30">{s.time}</span>
                  </button>
                ))}
              </div>

              <p className="text-[10px] uppercase tracking-widest text-white/30 font-semibold px-2 mt-5 mb-2">Memory</p>
              <div className="space-y-0.5">
                {MEMORY_ITEMS.map((m) => (
                  <button
                    key={m.label}
                    className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-left text-white/50 hover:text-white/80 hover:bg-white/[0.04] transition-all"
                  >
                    <m.icon className="w-3.5 h-3.5 flex-shrink-0 text-violet-400" />
                    <span className="text-xs flex-1 truncate">{m.label}</span>
                    <span className="text-[10px] text-white/30">{m.date}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Status Bar */}
            <div className="px-4 py-3 border-t border-white/[0.06]">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-1.5">
                  <div className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                  <span className="text-[10px] text-white/40 font-medium">Llama 3.1 · 8B Q4</span>
                </div>
                <WifiOff className="w-3 h-3 text-white/25" />
              </div>
              <div className="w-full bg-white/[0.06] rounded-full h-1">
                <div className="bg-indigo-500/70 h-1 rounded-full" style={{ width: "62%" }} />
              </div>
              <p className="text-[10px] text-white/30 mt-1">3.2 GB / 5.1 GB VRAM</p>
            </div>

            {/* Settings */}
            <button className="flex items-center gap-2.5 px-5 py-3 border-t border-white/[0.06] text-white/40 hover:text-white/70 transition-colors text-xs">
              <Settings className="w-3.5 h-3.5" />
              Settings
            </button>
          </>
        ) : (
          /* ── COLLAPSED STATE — thin icon rail, click anywhere to open ── */
          <div
            className="flex flex-col items-center py-3 gap-3 h-full cursor-pointer group"
            onClick={() => setSidebarOpen(true)}
            title="Open sidebar"
          >
            {/* Open trigger icon */}
            <button
              className="w-8 h-8 flex items-center justify-center rounded-lg text-white/30 group-hover:text-white/70 group-hover:bg-white/[0.06] transition-colors"
              onClick={(e) => { e.stopPropagation(); setSidebarOpen(true); }}
            >
              <PanelLeftOpen className="w-4 h-4" />
            </button>

            <div className="w-6 h-px bg-white/[0.08] rounded" />

            {/* App icon */}
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-indigo-500 to-violet-600 flex items-center justify-center shadow-md shadow-indigo-500/20">
              <Sparkles className="w-3.5 h-3.5 text-white" />
            </div>

            <div className="w-6 h-px bg-white/[0.08] rounded" />

            {/* Icon hints */}
            <div className="flex flex-col items-center gap-2">
              {SESSIONS.slice(0, 3).map((s) => (
                <div
                  key={s.label}
                  className="w-7 h-7 flex items-center justify-center rounded-lg text-white/20 group-hover:text-white/40 transition-colors"
                  title={s.label}
                >
                  <MessageSquare className="w-3.5 h-3.5" />
                </div>
              ))}
            </div>

            {/* Settings at bottom */}
            <div className="mt-auto mb-1">
              <div className="w-7 h-7 flex items-center justify-center rounded-lg text-white/20 group-hover:text-white/40 transition-colors">
                <Settings className="w-3.5 h-3.5" />
              </div>
            </div>
          </div>
        )}
      </aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col min-w-0">
        {/* Top Bar */}
        <header className="flex items-center justify-between px-4 py-3 border-b border-white/[0.06] bg-[#0f1117]">
          <div className="flex items-center gap-3">
            {/* Open sidebar toggle — only visible when sidebar is closed */}
            {!sidebarOpen && (
              <button
                onClick={() => setSidebarOpen(true)}
                className="w-8 h-8 flex items-center justify-center rounded-lg text-white/30 hover:text-white/70 hover:bg-white/[0.06] transition-colors"
                title="Open sidebar"
              >
                <PanelLeftOpen className="w-4 h-4" />
              </button>
            )}
            <div>
              <h1 className="text-sm font-semibold">{activeChat}</h1>
              <p className="text-[11px] text-white/35">4 messages · 2 memory items referenced</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button className="w-8 h-8 flex items-center justify-center rounded-lg bg-white/[0.04] hover:bg-white/[0.08] text-white/40 transition-colors">
              <MoreHorizontal className="w-4 h-4" />
            </button>
            {!rightOpen && (
              <button
                onClick={() => setRightOpen(true)}
                className="w-8 h-8 flex items-center justify-center rounded-lg text-white/30 hover:text-white/70 hover:bg-white/[0.06] transition-colors"
                title="Open context panel"
              >
                <PanelRightOpen className="w-4 h-4" />
              </button>
            )}
          </div>
        </header>

        {/* Tabs */}
        <div className="flex border-b border-white/[0.06] bg-[#0f1117] px-6">
          {[
            { id: "chat", icon: MessageSquare, label: "Chat" },
            { id: "memory", icon: BookOpen, label: "Memory" },
            { id: "docs", icon: FileText, label: "Documents" },
          ].map((t) => (
            <button
              key={t.id}
              onClick={() => setActiveTab(t.id as typeof activeTab)}
              className={`flex items-center gap-1.5 px-4 py-2.5 text-xs font-medium border-b-2 transition-all ${
                activeTab === t.id
                  ? "border-indigo-500 text-white"
                  : "border-transparent text-white/40 hover:text-white/60"
              }`}
            >
              <t.icon className="w-3.5 h-3.5" />
              {t.label}
            </button>
          ))}
        </div>

        {/* Chat Messages */}
        <div className="flex-1 overflow-y-auto px-6 py-6 space-y-6">
          {/* Memory Context Banner */}
          <div className="flex items-center gap-2.5 px-4 py-2.5 rounded-xl bg-indigo-500/[0.08] border border-indigo-500/15">
            <Layers className="w-3.5 h-3.5 text-indigo-400 flex-shrink-0" />
            <p className="text-xs text-indigo-300/80">
              <span className="font-semibold text-indigo-300">2 memory items</span> loaded — PID Notes (Nov 12) and Lab Diagram (Nov 10)
            </p>
            <ChevronRight className="w-3.5 h-3.5 text-indigo-400/50 ml-auto" />
          </div>

          {DEMO_MESSAGES.map((msg) => (
            <div key={msg.id} className={`flex gap-3 ${msg.role === "user" ? "justify-end" : "justify-start"}`}>
              {msg.role === "assistant" && (
                <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-indigo-500 to-violet-600 flex items-center justify-center flex-shrink-0 mt-0.5 shadow-md shadow-indigo-500/20">
                  <Sparkles className="w-3.5 h-3.5 text-white" />
                </div>
              )}
              <div className={`max-w-[75%] ${msg.role === "user" ? "order-first" : ""}`}>
                <div
                  className={`rounded-2xl px-4 py-3 text-sm leading-relaxed ${
                    msg.role === "user"
                      ? "bg-indigo-600 text-white rounded-tr-sm"
                      : "bg-[#1a1d2e] text-white/85 rounded-tl-sm border border-white/[0.06]"
                  }`}
                >
                  {msg.content.split("\n").map((line, i) => {
                    const bold = line.replace(/\*\*(.*?)\*\*/g, (_, t) => `<strong>${t}</strong>`);
                    return (
                      <p
                        key={i}
                        className={line.startsWith("---") ? "border-t border-white/10 my-2" : line === "" ? "mb-1" : ""}
                        dangerouslySetInnerHTML={{ __html: bold }}
                      />
                    );
                  })}
                </div>
                <p className={`text-[10px] text-white/25 mt-1 ${msg.role === "user" ? "text-right" : "text-left"}`}>
                  {msg.timestamp}
                </p>
              </div>
              {msg.role === "user" && (
                <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-slate-600 to-slate-700 flex items-center justify-center flex-shrink-0 mt-0.5 text-xs font-semibold text-white/80">
                  S
                </div>
              )}
            </div>
          ))}

          {/* Typing indicator */}
          <div className="flex gap-3 justify-start">
            <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-indigo-500 to-violet-600 flex items-center justify-center flex-shrink-0 shadow-md shadow-indigo-500/20">
              <Sparkles className="w-3.5 h-3.5 text-white" />
            </div>
            <div className="bg-[#1a1d2e] border border-white/[0.06] rounded-2xl rounded-tl-sm px-4 py-3">
              <div className="flex gap-1 items-center h-4">
                <div className="w-1.5 h-1.5 rounded-full bg-indigo-400 animate-bounce" style={{ animationDelay: "0ms" }} />
                <div className="w-1.5 h-1.5 rounded-full bg-indigo-400 animate-bounce" style={{ animationDelay: "150ms" }} />
                <div className="w-1.5 h-1.5 rounded-full bg-indigo-400 animate-bounce" style={{ animationDelay: "300ms" }} />
              </div>
            </div>
          </div>
        </div>

        {/* Input Area */}
        <div className="px-6 py-4 border-t border-white/[0.06] bg-[#0f1117]">

          {/* Active tool badge */}
          {activeTool && (
            <div className="mb-3 flex items-center gap-2">
              <div className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-medium border ${
                activeTool === "Write Doc"
                  ? "bg-indigo-500/10 border-indigo-500/25 text-indigo-300"
                  : activeTool === "Calculator"
                  ? "bg-emerald-500/10 border-emerald-500/25 text-emerald-300"
                  : "bg-amber-500/10 border-amber-500/25 text-amber-300"
              }`}>
                {activeTool === "Write Doc" && <PenLine className="w-3 h-3" />}
                {activeTool === "Calculator" && <Calculator className="w-3 h-3" />}
                {activeTool === "Search Notes" && <Search className="w-3 h-3" />}
                {activeTool}
                <button onClick={() => setActiveTool(null)} className="ml-1 opacity-60 hover:opacity-100">
                  <X className="w-3 h-3" />
                </button>
              </div>
              <span className="text-[10px] text-white/25">
                {activeTool === "Write Doc" && "Responses will open in a document editor"}
                {activeTool === "Calculator" && "Step-by-step maths mode active"}
                {activeTool === "Search Notes" && "Searching across your saved memory"}
              </span>
            </div>
          )}

          {/* Attachment staging area — only visible when files are queued */}
          {attachments.length > 0 && (
            <div className="mb-3 flex items-center gap-2 flex-wrap">
              {attachments.map((att) => (
                <div key={att.name} className="flex items-center gap-2 pl-2 pr-1.5 py-1.5 rounded-xl bg-white/[0.04] border border-white/[0.06]">
                  <div className={`w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0 ${
                    att.kind === "image" ? "bg-violet-500/15" : att.kind === "pdf" ? "bg-rose-500/15" : "bg-blue-500/15"
                  }`}>
                    {att.kind === "image" && <Image className="w-3.5 h-3.5 text-violet-400" />}
                    {att.kind === "pdf"   && <FileText className="w-3.5 h-3.5 text-rose-400" />}
                    {att.kind === "doc"   && <FileText className="w-3.5 h-3.5 text-blue-400" />}
                  </div>
                  <div className="min-w-0">
                    <p className="text-xs font-medium text-white/70 max-w-[140px] truncate">{att.name}</p>
                    <p className="text-[10px] text-white/30">
                      {att.kind === "image" ? "Image · will be analysed" : att.kind === "pdf" ? "PDF · context for this message" : "Document"}
                    </p>
                  </div>
                  <button
                    onClick={() => setAttachments((a) => a.filter((x) => x.name !== att.name))}
                    className="ml-0.5 w-5 h-5 flex items-center justify-center rounded-md text-white/25 hover:text-white/60 hover:bg-white/[0.08] transition-colors"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </div>
              ))}
            </div>
          )}

          {/* Tools popover */}
          {toolsOpen && (
            <div className="mb-3 p-2 rounded-2xl bg-[#1a1d2e] border border-white/[0.08] grid grid-cols-3 gap-1">
              {[
                { id: "Write Doc", icon: PenLine, label: "Write Doc", desc: "Write & edit docs", color: "text-indigo-400", bg: "bg-indigo-500/10 border-indigo-500/15" },
                { id: "Calculator", icon: Calculator, label: "Calculator", desc: "Step-by-step maths", color: "text-emerald-400", bg: "bg-emerald-500/10 border-emerald-500/15" },
                { id: "Search Notes", icon: Search, label: "Search Notes", desc: "Search your memory", color: "text-amber-400", bg: "bg-amber-500/10 border-amber-500/15" },
              ].map((tool) => (
                <button
                  key={tool.id}
                  onClick={() => { setActiveTool(tool.id); setToolsOpen(false); }}
                  className={`flex flex-col items-center gap-1.5 p-3 rounded-xl border transition-all hover:scale-[1.02] ${
                    activeTool === tool.id
                      ? tool.bg + " border-opacity-100"
                      : "border-white/[0.06] hover:bg-white/[0.04]"
                  }`}
                >
                  <tool.icon className={`w-5 h-5 ${tool.color}`} />
                  <span className="text-[11px] font-semibold text-white/80">{tool.label}</span>
                  <span className="text-[9px] text-white/30 text-center leading-tight">{tool.desc}</span>
                </button>
              ))}
            </div>
          )}

          <div className="flex items-end gap-3">
            {/* Tools toggle button */}
            <button
              onClick={() => setToolsOpen((o) => !o)}
              className={`w-9 h-9 flex items-center justify-center rounded-xl border transition-all flex-shrink-0 mb-0.5 ${
                toolsOpen
                  ? "bg-white/[0.1] border-white/20 text-white/70"
                  : "bg-white/[0.04] border-white/[0.08] text-white/30 hover:text-white/60 hover:bg-white/[0.08]"
              }`}
              title="Tools"
            >
              {toolsOpen ? <ChevronUp className="w-4 h-4" /> : <Plus className="w-4 h-4" />}
            </button>

            <div className="flex-1 flex flex-col gap-0 rounded-2xl bg-[#1a1d2e] border border-white/[0.08] focus-within:border-indigo-500/40 transition-colors overflow-hidden">
              <textarea
                rows={2}
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder={
                  activeTool === "Write Doc" ? "Describe what you'd like to write or edit..."
                  : activeTool === "Calculator" ? "Enter an equation or problem..."
                  : activeTool === "Search Notes" ? "Search your saved notes and files..."
                  : "Ask anything, attach images or PDFs..."
                }
                className="flex-1 bg-transparent text-sm text-white/80 placeholder-white/20 resize-none outline-none leading-relaxed px-4 pt-3 pb-1"
              />
              <div className="flex items-center gap-1 px-3 pb-2">
                <button className="w-7 h-7 flex items-center justify-center rounded-lg text-white/30 hover:text-white/60 hover:bg-white/[0.06] transition-colors">
                  <Paperclip className="w-3.5 h-3.5" />
                </button>
                <button className="w-7 h-7 flex items-center justify-center rounded-lg text-white/30 hover:text-white/60 hover:bg-white/[0.06] transition-colors">
                  <Image className="w-3.5 h-3.5" />
                </button>
                <button className="w-7 h-7 flex items-center justify-center rounded-lg text-white/30 hover:text-white/60 hover:bg-white/[0.06] transition-colors">
                  <Mic className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
            <button className="w-10 h-10 flex items-center justify-center rounded-xl bg-indigo-600 hover:bg-indigo-500 transition-colors shadow-md shadow-indigo-500/20 flex-shrink-0 mb-0.5">
              <Send className="w-4 h-4 text-white" />
            </button>
          </div>
          <p className="text-[10px] text-white/20 mt-2.5 px-1">All processing is done locally · No internet needed</p>
        </div>
      </main>

      {/* Right Panel — Context / Memory */}
      <aside
        className={`flex-shrink-0 bg-[#13151f] border-l border-white/[0.06] flex flex-col transition-all duration-300 ease-in-out overflow-hidden ${
          rightOpen ? "w-72" : "w-12"
        }`}
      >
        {rightOpen ? (
          /* ── EXPANDED STATE ── */
          <>
            <div className="px-4 py-4 border-b border-white/[0.06] flex items-center justify-between">
              <div>
                <h2 className="text-xs font-semibold text-white/70 uppercase tracking-wider">Context</h2>
                <p className="text-[11px] text-white/30 mt-0.5">Memory items feeding this chat</p>
              </div>
              <button
                onClick={() => setRightOpen(false)}
                className="w-7 h-7 flex items-center justify-center rounded-lg text-white/30 hover:text-white/70 hover:bg-white/[0.06] transition-colors flex-shrink-0"
                title="Close context panel"
              >
                <PanelRightClose className="w-4 h-4" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-4 space-y-3">
              {[
                { icon: FileText, label: "PID Control Notes", date: "Nov 12", color: "text-blue-400", bg: "bg-blue-500/10", desc: "12 pages · Lecture notes from ME301" },
                { icon: Image, label: "Lab Diagram — Servo", date: "Nov 10", color: "text-violet-400", bg: "bg-violet-500/10", desc: "Whiteboard photo · Feedback loop diagram" },
              ].map((item) => (
                <div key={item.label} className="rounded-xl bg-white/[0.03] border border-white/[0.06] p-3">
                  <div className="flex items-start gap-2.5">
                    <div className={`w-7 h-7 rounded-lg ${item.bg} flex items-center justify-center flex-shrink-0`}>
                      <item.icon className={`w-3.5 h-3.5 ${item.color}`} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-medium text-white/80 truncate">{item.label}</p>
                      <p className="text-[10px] text-white/35 mt-0.5">{item.desc}</p>
                      <p className="text-[10px] text-white/25 mt-1">{item.date}</p>
                    </div>
                    <button className="text-white/20 hover:text-white/50 transition-colors">
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              ))}

              <div className="mt-2">
                <p className="text-[10px] uppercase tracking-widest text-white/30 font-semibold mb-2">Generated Documents</p>
                {[
                  { label: "Lab Report — PID Control", format: "DOCX", date: "Now" },
                  { label: "Summary — Thermodynamics", format: "PDF", date: "Yesterday" },
                ].map((doc) => (
                  <div key={doc.label} className="flex items-center gap-2.5 py-2.5 border-b border-white/[0.04]">
                    <div className="w-7 h-7 rounded-lg bg-emerald-500/10 flex items-center justify-center">
                      <FileText className="w-3.5 h-3.5 text-emerald-400" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs text-white/70 truncate">{doc.label}</p>
                      <p className="text-[10px] text-white/30">{doc.format} · {doc.date}</p>
                    </div>
                    <button className="text-white/25 hover:text-white/60 transition-colors">
                      <Download className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))}
              </div>

              <button className="w-full mt-2 flex items-center justify-center gap-2 py-2.5 rounded-xl border border-dashed border-white/[0.1] text-xs text-white/30 hover:text-white/60 hover:border-white/20 transition-colors">
                <Plus className="w-3.5 h-3.5" />
                Add files to memory
              </button>
            </div>

            <div className="px-4 py-4 border-t border-white/[0.06] space-y-2.5">
              {[
                { label: "Model", value: "Llama 3.1 8B", color: "text-indigo-400" },
                { label: "Vision", value: "Moondream2", color: "text-violet-400" },
                { label: "Memory", value: "ChromaDB · Local", color: "text-emerald-400" },
              ].map((row) => (
                <div key={row.label} className="flex items-center justify-between">
                  <span className="text-[10px] text-white/30 font-medium">{row.label}</span>
                  <span className={`text-[10px] font-semibold ${row.color}`}>{row.value}</span>
                </div>
              ))}
              <div className="flex items-center justify-between">
                <span className="text-[10px] text-white/30 font-medium">Status</span>
                <div className="flex items-center gap-1.5">
                  <div className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                  <span className="text-[10px] text-emerald-400 font-semibold">Fully Offline</span>
                </div>
              </div>
            </div>
          </>
        ) : (
          /* ── COLLAPSED STATE — thin icon rail, click anywhere to open ── */
          <div
            className="flex flex-col items-center py-3 gap-3 h-full cursor-pointer group"
            onClick={() => setRightOpen(true)}
            title="Open context panel"
          >
            {/* Open trigger icon */}
            <button
              className="w-8 h-8 flex items-center justify-center rounded-lg text-white/30 group-hover:text-white/70 group-hover:bg-white/[0.06] transition-colors"
              onClick={(e) => { e.stopPropagation(); setRightOpen(true); }}
            >
              <PanelRightOpen className="w-4 h-4" />
            </button>

            <div className="w-6 h-px bg-white/[0.08] rounded" />

            {/* Context icon */}
            <div className="w-8 h-8 rounded-lg bg-white/[0.04] flex items-center justify-center">
              <Layers className="w-3.5 h-3.5 text-white/25 group-hover:text-white/50 transition-colors" />
            </div>

            <div className="w-6 h-px bg-white/[0.08] rounded" />

            {/* File hint icons */}
            <div className="flex flex-col items-center gap-2">
              <div className="w-7 h-7 flex items-center justify-center rounded-lg text-white/20 group-hover:text-white/40 transition-colors" title="PID Control Notes">
                <FileText className="w-3.5 h-3.5" />
              </div>
              <div className="w-7 h-7 flex items-center justify-center rounded-lg text-white/20 group-hover:text-white/40 transition-colors" title="Lab Diagram — Servo">
                <Image className="w-3.5 h-3.5" />
              </div>
              <div className="w-7 h-7 flex items-center justify-center rounded-lg text-white/20 group-hover:text-white/40 transition-colors" title="Generated Documents">
                <BookOpen className="w-3.5 h-3.5" />
              </div>
            </div>

            {/* Offline dot at bottom */}
            <div className="mt-auto mb-2 flex flex-col items-center gap-1.5">
              <div className="w-1.5 h-1.5 rounded-full bg-emerald-400" title="Fully Offline" />
            </div>
          </div>
        )}
      </aside>
    </div>
  );
}
