import { useState, useRef } from "react";
import {
  Sparkles, Send, FileText, Image, BookOpen, Settings,
  ChevronRight, Paperclip, MoreHorizontal, WifiOff, Download,
  MessageSquare, X, Plus, Mic, Layers,
  PanelLeftClose, PanelLeftOpen, PanelRightClose, PanelRightOpen,
  PenLine, Calculator, ChevronUp, Search,
  ExternalLink, CheckCircle2, Circle, Loader2,
  FlaskConical, TrendingUp, Scale, Stethoscope, BarChart2,
  GripHorizontal, Minimize2
} from "lucide-react";

/* ─────────────── Types ─────────────── */
type Message = { id: number; role: "user" | "assistant"; content: string; timestamp: string };
type Attachment = { name: string; kind: "image" | "pdf" | "doc" };

/* ─────────────── Static demo data ─────────────── */
const DEMO_MESSAGES: Message[] = [
  { id: 1, role: "user", content: "Can you explain PID control from the diagram I uploaded in our last session?", timestamp: "09:14" },
  { id: 2, role: "assistant", content: `From your uploaded notes on **PID Control Systems** (Session: Nov 12), here's a breakdown:\n\nA **PID controller** has three components:\n\n- **P (Proportional):** Reacts to the *current* error.\n- **I (Integral):** Eliminates steady-state error by accumulating past errors.\n- **D (Derivative):** Predicts future error — dampens oscillation.\n\nCombined output: **u(t) = Kp·e(t) + Ki·∫e(t)dt + Kd·de(t)/dt**\n\nIn your lab diagram, the feedback loop shows the sensor output subtracted from the setpoint to compute *e(t)*. Would you like me to draft a lab report on this?`, timestamp: "09:14" },
  { id: 3, role: "user", content: "Yes please — write a full lab report introduction and experimental setup section.", timestamp: "09:15" },
];

const DOC_SECTIONS = [
  { label: "Title Page", done: true },
  { label: "Abstract", done: true },
  { label: "Introduction", done: true },
  { label: "Experimental Setup", done: false, active: true },
  { label: "Results & Analysis", done: false },
  { label: "Conclusion & References", done: false },
];

const SEARCH_RESULTS = [
  {
    type: "pdf" as const,
    title: "PID Control Notes — Lecture Notes ME301",
    path: "Memory › Uploads › Nov 12, 2024",
    snippet: "…the feedback loop in a **PID control** system compares the setpoint to the measured output to compute error *e(t)*. The controller then applies proportional, integral and derivative corrections to the plant input…",
    meta: "12 pages · PDF",
    relevance: 98,
  },
  {
    type: "image" as const,
    title: "Lab Diagram — Servo Motor Feedback Loop",
    path: "Memory › Images › Nov 10, 2024",
    snippet: "Whiteboard photo showing a servo motor **PID feedback** loop block diagram. Labels visible: Setpoint, Error, Controller, Plant, Sensor. Handwritten gain values Kp=1.2, Ki=0.4…",
    meta: "1 image · JPG",
    relevance: 91,
  },
  {
    type: "pdf" as const,
    title: "Thermodynamics Ch.5 — Feedback Control Applications",
    path: "Memory › PDFs › Nov 8, 2024",
    snippet: "Chapter 5 covers thermal **feedback** systems and control loops as applied to heat exchangers. Section 5.3 references **PID** tuning for thermal regulation using Ziegler–Nichols method…",
    meta: "28 pages · PDF",
    relevance: 74,
  },
  {
    type: "doc" as const,
    title: "Assignment 3 Draft — Control Systems",
    path: "Memory › Documents › Nov 7, 2024",
    snippet: "In this assignment we implement a digital **PID controller** using MATLAB Simulink. The **feedback** topology follows the block diagram from lecture 8, with discretisation step Ts=0.01s…",
    meta: "6 pages · DOCX",
    relevance: 67,
  },
];

const CALC_SCHOOLS = [
  {
    id: "engineering", label: "Engineering", short: "Sci", icon: FlaskConical, color: "text-indigo-400",
    desc: "Scientific + unit converter",
    rows: [
      ["sin","cos","tan","π"],
      ["log","ln","√","x²"],
      ["(",")","%","÷"],
      ["7","8","9","×"],
      ["4","5","6","−"],
      ["1","2","3","+"],
      ["±","0",".","="],
    ],
  },
  {
    id: "business", label: "Business", short: "Fin", icon: TrendingUp, color: "text-emerald-400",
    desc: "NPV, IRR, loan & investment",
    rows: [
      ["PV","FV","PMT","n"],
      ["i%","NPV","IRR","%"],
      ["(",")",  "CE","÷"],
      ["7","8","9","×"],
      ["4","5","6","−"],
      ["1","2","3","+"],
      ["±","0",".","="],
    ],
  },
  {
    id: "humanities", label: "Humanities", short: "Std", icon: BookOpen, color: "text-amber-400",
    desc: "Standard + date & unit convert",
    rows: [
      ["Day↔","Yr↔","°C↔F","%"],
      ["(",")",  "CE","÷"],
      ["7","8","9","×"],
      ["4","5","6","−"],
      ["1","2","3","+"],
      ["±","0",".","="],
    ],
  },
  {
    id: "law", label: "Law", short: "Leg", icon: Scale, color: "text-violet-400",
    desc: "Billing hours, fees & time",
    rows: [
      ["hr×$","days","VAT","%"],
      ["(",")",  "CE","÷"],
      ["7","8","9","×"],
      ["4","5","6","−"],
      ["1","2","3","+"],
      ["±","0",".","="],
    ],
  },
  {
    id: "medicine", label: "Medicine", short: "Med", icon: Stethoscope, color: "text-rose-400",
    desc: "Dosage, BMI & clinical calc",
    rows: [
      ["mg/kg","BSA","BMI","CrCl"],
      ["(",")",  "CE","÷"],
      ["7","8","9","×"],
      ["4","5","6","−"],
      ["1","2","3","+"],
      ["±","0",".","="],
    ],
  },
  {
    id: "statistics", label: "Statistics", short: "Stat", icon: BarChart2, color: "text-cyan-400",
    desc: "Stats, probability & regression",
    rows: [
      ["σ","μ","r²","P(x)"],
      ["∑","n!","Cₙᵣ","%"],
      ["(",")",  "CE","÷"],
      ["7","8","9","×"],
      ["4","5","6","−"],
      ["1","2","3","+"],
      ["±","0",".","="],
    ],
  },
];

const SESSIONS = [
  { label: "PID Control Study", time: "Today" },
  { label: "Thermodynamics Laws", time: "Yesterday" },
  { label: "Circuit Analysis", time: "Mon" },
  { label: "Mechanics of Materials", time: "Last week" },
];

const MEMORY_ITEMS = [
  { icon: FileText, label: "PID Control Notes", date: "Nov 12" },
  { icon: Image, label: "Lab Diagram — Servo Motor", date: "Nov 10" },
  { icon: BookOpen, label: "Thermodynamics Ch. 5 PDF", date: "Nov 8" },
  { icon: FileText, label: "Assignment 3 Draft", date: "Nov 7" },
];

/* ─────────────── Component ─────────────── */
export function MainApp() {
  const [input, setInput] = useState("");
  const [activeTab, setActiveTab] = useState<"chat" | "memory" | "docs">("chat");
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [activeChat, setActiveChat] = useState("PID Control Study");
  const [toolsOpen, setToolsOpen] = useState(false);
  const [activeTool, setActiveTool] = useState<string | null>(null);
  const [rightOpen, setRightOpen] = useState(true);
  const [attachments, setAttachments] = useState<Attachment[]>([
    { name: "servo_diagram.jpg", kind: "image" },
    { name: "Thermodynamics_Ch5.pdf", kind: "pdf" },
  ]);
  const [searchQuery, setSearchQuery] = useState("PID control feedback loop");

  /* ── Calculator state ── */
  const [calcSchool, setCalcSchool] = useState("engineering");
  const [calcDisplay, setCalcDisplay] = useState("0");
  const [calcPos, setCalcPos] = useState({ x: 320, y: 80 });
  const [calcSize, setCalcSize] = useState({ w: 310, h: 490 });
  const dragRef = useRef<{ ox: number; oy: number; px: number; py: number } | null>(null);
  const resizeRef = useRef<{ ox: number; oy: number; w: number; h: number } | null>(null);

  function startDrag(e: React.MouseEvent) {
    e.preventDefault();
    dragRef.current = { ox: e.clientX, oy: e.clientY, px: calcPos.x, py: calcPos.y };
    const onMove = (ev: MouseEvent) => {
      if (!dragRef.current) return;
      setCalcPos({ x: dragRef.current.px + ev.clientX - dragRef.current.ox, y: dragRef.current.py + ev.clientY - dragRef.current.oy });
    };
    const onUp = () => { dragRef.current = null; document.removeEventListener("mousemove", onMove); document.removeEventListener("mouseup", onUp); };
    document.addEventListener("mousemove", onMove);
    document.addEventListener("mouseup", onUp);
  }

  function startResize(e: React.MouseEvent) {
    e.preventDefault(); e.stopPropagation();
    resizeRef.current = { ox: e.clientX, oy: e.clientY, w: calcSize.w, h: calcSize.h };
    const onMove = (ev: MouseEvent) => {
      if (!resizeRef.current) return;
      setCalcSize({ w: Math.max(280, resizeRef.current.w + ev.clientX - resizeRef.current.ox), h: Math.max(400, resizeRef.current.h + ev.clientY - resizeRef.current.oy) });
    };
    const onUp = () => { resizeRef.current = null; document.removeEventListener("mousemove", onMove); document.removeEventListener("mouseup", onUp); };
    document.addEventListener("mousemove", onMove);
    document.addEventListener("mouseup", onUp);
  }

  function onCalcKey(key: string) {
    const specials = ["sin","cos","tan","π","log","ln","√","x²","PV","FV","PMT","n","i%","NPV","IRR","σ","μ","r²","P(x)","∑","n!","Cₙᵣ","mg/kg","BSA","BMI","CrCl","hr×$","days","VAT","Day↔","Yr↔","°C↔F"];
    if (key === "=") {
      try {
        const expr = calcDisplay.replace(/×/g,"*").replace(/÷/g,"/").replace(/−/g,"-");
        // eslint-disable-next-line no-new-func
        const r = Function('"use strict"; return (' + expr + ")")();
        setCalcDisplay(String(parseFloat(r.toFixed(10))));
      } catch { setCalcDisplay("Error"); }
    } else if (key === "CE") {
      setCalcDisplay("0");
    } else if (key === "±") {
      setCalcDisplay(d => d.startsWith("-") ? d.slice(1) : "-" + d);
    } else if (specials.includes(key)) {
      setCalcDisplay(key + "(");
    } else {
      setCalcDisplay(d => d === "0" || d === "Error" ? key : d + key);
    }
  }

  function selectChat(label: string) { setActiveChat(label); setSidebarOpen(false); }
  function pickTool(id: string) { setActiveTool(id); setToolsOpen(false); }

  const school = CALC_SCHOOLS.find(s => s.id === calcSchool) ?? CALC_SCHOOLS[0];

  /* ── special key styling ── */
  function keyClass(key: string) {
    if (key === "=") return "col-span-1 bg-indigo-600 hover:bg-indigo-500 text-white font-bold rounded-xl text-sm transition-colors";
    if (["+","−","×","÷"].includes(key)) return "bg-white/[0.08] hover:bg-white/[0.14] text-indigo-300 font-semibold rounded-xl text-sm transition-colors";
    if (["CE","±","%"].includes(key)) return "bg-white/[0.06] hover:bg-white/[0.1] text-white/60 rounded-xl text-xs transition-colors";
    const specials = ["sin","cos","tan","π","log","ln","√","x²","PV","FV","PMT","n","i%","NPV","IRR","σ","μ","r²","P(x)","∑","n!","Cₙᵣ","mg/kg","BSA","BMI","CrCl","hr×$","days","VAT","Day↔","Yr↔","°C↔F"];
    if (specials.includes(key)) return "bg-white/[0.04] hover:bg-white/[0.08] text-white/50 rounded-xl text-[10px] font-medium transition-colors";
    return "bg-white/[0.04] hover:bg-white/[0.1] text-white/80 rounded-xl text-sm transition-colors";
  }

  return (
    <div className="relative flex h-screen bg-[#0f1117] text-white font-sans overflow-hidden">

      {/* ══ LEFT SIDEBAR ══ */}
      <aside className={`flex-shrink-0 bg-[#13151f] border-r border-white/[0.06] flex flex-col transition-all duration-300 ease-in-out overflow-hidden ${sidebarOpen ? "w-64" : "w-12"}`}>
        {sidebarOpen ? (
          <>
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
              <button onClick={() => setSidebarOpen(false)} className="w-7 h-7 flex items-center justify-center rounded-lg text-white/30 hover:text-white/70 hover:bg-white/[0.06] transition-colors">
                <PanelLeftClose className="w-4 h-4" />
              </button>
            </div>
            <div className="px-4 py-3">
              <button className="w-full flex items-center gap-2 px-3 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-500 transition-colors text-sm font-medium shadow-md shadow-indigo-500/20">
                <Plus className="w-4 h-4" />New Chat
              </button>
            </div>
            <div className="flex-1 overflow-y-auto px-3 pb-4">
              <p className="text-[10px] uppercase tracking-widest text-white/30 font-semibold px-2 mb-2">Chats</p>
              <div className="space-y-0.5">
                {SESSIONS.map(s => (
                  <button key={s.label} onClick={() => selectChat(s.label)}
                    className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-left transition-all ${activeChat === s.label ? "bg-indigo-600/20 text-white border border-indigo-500/20" : "text-white/50 hover:text-white/80 hover:bg-white/[0.04]"}`}>
                    <MessageSquare className={`w-3.5 h-3.5 flex-shrink-0 ${activeChat === s.label ? "text-indigo-400" : ""}`} />
                    <span className="text-xs flex-1 truncate font-medium">{s.label}</span>
                    <span className="text-[10px] text-white/30">{s.time}</span>
                  </button>
                ))}
              </div>
              <p className="text-[10px] uppercase tracking-widest text-white/30 font-semibold px-2 mt-5 mb-2">Memory</p>
              <div className="space-y-0.5">
                {MEMORY_ITEMS.map(m => (
                  <button key={m.label} className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-left text-white/50 hover:text-white/80 hover:bg-white/[0.04] transition-all">
                    <m.icon className="w-3.5 h-3.5 flex-shrink-0 text-violet-400" />
                    <span className="text-xs flex-1 truncate">{m.label}</span>
                    <span className="text-[10px] text-white/30">{m.date}</span>
                  </button>
                ))}
              </div>
            </div>
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
            <button className="flex items-center gap-2.5 px-5 py-3 border-t border-white/[0.06] text-white/40 hover:text-white/70 transition-colors text-xs">
              <Settings className="w-3.5 h-3.5" />Settings
            </button>
          </>
        ) : (
          <div className="flex flex-col items-center py-3 gap-3 h-full cursor-pointer group" onClick={() => setSidebarOpen(true)}>
            <button className="w-8 h-8 flex items-center justify-center rounded-lg text-white/30 group-hover:text-white/70 group-hover:bg-white/[0.06] transition-colors" onClick={e => { e.stopPropagation(); setSidebarOpen(true); }}>
              <PanelLeftOpen className="w-4 h-4" />
            </button>
            <div className="w-6 h-px bg-white/[0.08] rounded" />
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-indigo-500 to-violet-600 flex items-center justify-center shadow-md shadow-indigo-500/20">
              <Sparkles className="w-3.5 h-3.5 text-white" />
            </div>
            <div className="w-6 h-px bg-white/[0.08] rounded" />
            <div className="flex flex-col items-center gap-2">
              {SESSIONS.slice(0, 3).map(s => (
                <div key={s.label} className="w-7 h-7 flex items-center justify-center rounded-lg text-white/20 group-hover:text-white/40 transition-colors" title={s.label}>
                  <MessageSquare className="w-3.5 h-3.5" />
                </div>
              ))}
            </div>
            <div className="mt-auto mb-1">
              <div className="w-7 h-7 flex items-center justify-center rounded-lg text-white/20 group-hover:text-white/40 transition-colors">
                <Settings className="w-3.5 h-3.5" />
              </div>
            </div>
          </div>
        )}
      </aside>

      {/* ══ MAIN CONTENT ══ */}
      <main className="flex-1 flex flex-col min-w-0">
        {/* Header */}
        <header className="flex items-center justify-between px-4 py-3 border-b border-white/[0.06] bg-[#0f1117]">
          <div className="flex items-center gap-3">
            {!sidebarOpen && (
              <button onClick={() => setSidebarOpen(true)} className="w-8 h-8 flex items-center justify-center rounded-lg text-white/30 hover:text-white/70 hover:bg-white/[0.06] transition-colors">
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
              <button onClick={() => setRightOpen(true)} className="w-8 h-8 flex items-center justify-center rounded-lg text-white/30 hover:text-white/70 hover:bg-white/[0.06] transition-colors">
                <PanelRightOpen className="w-4 h-4" />
              </button>
            )}
          </div>
        </header>

        {/* Tabs */}
        <div className="flex border-b border-white/[0.06] bg-[#0f1117] px-6">
          {[{ id:"chat", icon: MessageSquare, label:"Chat" }, { id:"memory", icon: BookOpen, label:"Memory" }, { id:"docs", icon: FileText, label:"Documents" }].map(t => (
            <button key={t.id} onClick={() => setActiveTab(t.id as typeof activeTab)}
              className={`flex items-center gap-1.5 px-4 py-2.5 text-xs font-medium border-b-2 transition-all ${activeTab === t.id ? "border-indigo-500 text-white" : "border-transparent text-white/40 hover:text-white/60"}`}>
              <t.icon className="w-3.5 h-3.5" />{t.label}
            </button>
          ))}
        </div>

        {/* ── SEARCH NOTES RESULTS VIEW ── */}
        {activeTool === "Search Notes" ? (
          <div className="flex-1 overflow-y-auto px-6 py-5">
            {/* Search bar */}
            <div className="flex items-center gap-3 mb-5">
              <div className="flex-1 flex items-center gap-2.5 px-3.5 py-2.5 rounded-xl bg-[#1a1d2e] border border-white/[0.1] focus-within:border-amber-500/40 transition-colors">
                <Search className="w-4 h-4 text-amber-400 flex-shrink-0" />
                <input value={searchQuery} onChange={e => setSearchQuery(e.target.value)}
                  className="flex-1 bg-transparent text-sm text-white/80 outline-none placeholder-white/30"
                  placeholder="Search your notes and files..." />
                {searchQuery && (
                  <button onClick={() => setSearchQuery("")} className="text-white/30 hover:text-white/60">
                    <X className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
              <button className="px-3 py-2.5 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-400 text-xs font-medium hover:bg-amber-500/20 transition-colors">
                Search
              </button>
            </div>

            {/* Results count */}
            <p className="text-[11px] text-white/30 mb-4">
              About <span className="text-white/60 font-semibold">4 results</span> for "{searchQuery}" in your memory
            </p>

            {/* Results list */}
            <div className="space-y-4">
              {SEARCH_RESULTS.map((r, i) => (
                <div key={i} className="group rounded-xl border border-white/[0.06] hover:border-white/[0.12] bg-white/[0.015] hover:bg-white/[0.03] transition-all p-4">
                  {/* Result header */}
                  <div className="flex items-start gap-3 mb-2">
                    <div className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 mt-0.5 ${r.type === "image" ? "bg-violet-500/15" : r.type === "pdf" ? "bg-rose-500/15" : "bg-blue-500/15"}`}>
                      {r.type === "image"
                        ? <Image className="w-4 h-4 text-violet-400" />
                        : <FileText className={`w-4 h-4 ${r.type === "pdf" ? "text-rose-400" : "text-blue-400"}`} />}
                    </div>
                    <div className="flex-1 min-w-0">
                      {/* Title (clickable, Google-style) */}
                      <button className="text-left text-indigo-400 hover:text-indigo-300 hover:underline text-sm font-medium leading-snug transition-colors">
                        {r.title}
                      </button>
                      {/* Breadcrumb */}
                      <p className="text-[10px] text-emerald-600/80 mt-0.5 font-mono">{r.path}</p>
                    </div>
                    {/* Relevance badge */}
                    <div className="flex-shrink-0 flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-white/[0.04] border border-white/[0.06]">
                      <div className={`w-1.5 h-1.5 rounded-full ${r.relevance >= 90 ? "bg-emerald-400" : r.relevance >= 70 ? "bg-amber-400" : "bg-white/30"}`} />
                      <span className="text-[10px] text-white/40">{r.relevance}%</span>
                    </div>
                  </div>

                  {/* Snippet */}
                  <p className="text-[12px] text-white/50 leading-relaxed ml-11 mb-3"
                    dangerouslySetInnerHTML={{ __html: r.snippet.replace(/\*\*(.*?)\*\*/g, '<strong class="text-white/80">$1</strong>').replace(/\*(.*?)\*/g, '<em class="text-white/65">$1</em>') }} />

                  {/* Actions */}
                  <div className="flex items-center gap-2 ml-11">
                    <span className="text-[10px] text-white/25">{r.meta}</span>
                    <div className="w-px h-3 bg-white/10" />
                    <button className="flex items-center gap-1 text-[11px] text-indigo-400 hover:text-indigo-300 font-medium transition-colors">
                      <ExternalLink className="w-3 h-3" />
                      Open file
                    </button>
                    <button className="text-[11px] text-white/35 hover:text-white/60 font-medium transition-colors">
                      Reference in chat
                    </button>
                  </div>
                </div>
              ))}
            </div>

            {/* Tip at bottom */}
            <div className="mt-6 flex items-center gap-2 px-4 py-2.5 rounded-xl bg-amber-500/[0.06] border border-amber-500/15">
              <Layers className="w-3.5 h-3.5 text-amber-400/70 flex-shrink-0" />
              <p className="text-[11px] text-amber-300/60">Click any result to open it in its original app, or use <span className="font-semibold text-amber-300/80">Reference in chat</span> to pull it into your current message.</p>
            </div>
          </div>

        ) : (
          /* ── NORMAL CHAT VIEW ── */
          <div className="flex-1 overflow-y-auto px-6 py-6 space-y-6">
            {/* Memory banner */}
            <div className="flex items-center gap-2.5 px-4 py-2.5 rounded-xl bg-indigo-500/[0.08] border border-indigo-500/15">
              <Layers className="w-3.5 h-3.5 text-indigo-400 flex-shrink-0" />
              <p className="text-xs text-indigo-300/80">
                <span className="font-semibold text-indigo-300">2 memory items</span> loaded — PID Notes (Nov 12) and Lab Diagram (Nov 10)
              </p>
              <ChevronRight className="w-3.5 h-3.5 text-indigo-400/50 ml-auto" />
            </div>

            {/* Messages */}
            {DEMO_MESSAGES.map(msg => (
              <div key={msg.id} className={`flex gap-3 ${msg.role === "user" ? "justify-end" : "justify-start"}`}>
                {msg.role === "assistant" && (
                  <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-indigo-500 to-violet-600 flex items-center justify-center flex-shrink-0 mt-0.5 shadow-md shadow-indigo-500/20">
                    <Sparkles className="w-3.5 h-3.5 text-white" />
                  </div>
                )}
                <div className={`max-w-[75%] ${msg.role === "user" ? "order-first" : ""}`}>
                  <div className={`rounded-2xl px-4 py-3 text-sm leading-relaxed ${msg.role === "user" ? "bg-indigo-600 text-white rounded-tr-sm" : "bg-[#1a1d2e] text-white/85 rounded-tl-sm border border-white/[0.06]"}`}>
                    {msg.content.split("\n").map((line, i) => {
                      const html = line.replace(/\*\*(.*?)\*\*/g, "<strong>$1</strong>").replace(/\*(.*?)\*/g, "<em>$1</em>");
                      return <p key={i} className={line.startsWith("---") ? "border-t border-white/10 my-2" : line === "" ? "mb-1" : ""} dangerouslySetInnerHTML={{ __html: html }} />;
                    })}
                  </div>
                  <p className={`text-[10px] text-white/25 mt-1 ${msg.role === "user" ? "text-right" : "text-left"}`}>{msg.timestamp}</p>
                </div>
                {msg.role === "user" && (
                  <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-slate-600 to-slate-700 flex items-center justify-center flex-shrink-0 mt-0.5 text-xs font-semibold text-white/80">S</div>
                )}
              </div>
            ))}

            {/* ── DOCUMENT GENERATION CARD (Write Doc mode) ── */}
            {activeTool === "Write Doc" ? (
              <div className="flex gap-3 justify-start">
                <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-indigo-500 to-violet-600 flex items-center justify-center flex-shrink-0 mt-0.5 shadow-md shadow-indigo-500/20">
                  <Sparkles className="w-3.5 h-3.5 text-white" />
                </div>
                <div className="flex-1 max-w-[85%]">
                  {/* Brief assistant message */}
                  <div className="bg-[#1a1d2e] border border-white/[0.06] rounded-2xl rounded-tl-sm px-4 py-3 text-sm text-white/80 mb-3 leading-relaxed">
                    Sure — I'm writing your lab report now. I'll structure it across 6 sections based on your notes and uploaded diagram.
                  </div>

                  {/* Document card */}
                  <div className="rounded-2xl border border-indigo-500/25 bg-[#1a1d2e] overflow-hidden shadow-lg shadow-indigo-500/10">
                    {/* Doc header */}
                    <div className="px-4 py-3 bg-indigo-500/[0.07] border-b border-indigo-500/15 flex items-center gap-3">
                      <div className="w-9 h-9 rounded-xl bg-indigo-500/20 flex items-center justify-center flex-shrink-0">
                        <FileText className="w-4.5 h-4.5 text-indigo-400" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold text-white/90 truncate">Lab Report — PID Control Systems</p>
                        <p className="text-[10px] text-white/40">Engineering · DOCX · Writing section 4 of 6</p>
                      </div>
                      <div className="flex items-center gap-1.5 flex-shrink-0">
                        <Loader2 className="w-3.5 h-3.5 text-indigo-400 animate-spin" />
                        <span className="text-[10px] text-indigo-400 font-medium">Writing…</span>
                      </div>
                    </div>

                    {/* Progress bar */}
                    <div className="px-4 pt-3 pb-1">
                      <div className="flex items-center justify-between mb-1.5">
                        <span className="text-[10px] text-white/40">Overall progress</span>
                        <span className="text-[10px] text-indigo-400 font-semibold">58%</span>
                      </div>
                      <div className="w-full h-1.5 bg-white/[0.06] rounded-full overflow-hidden">
                        <div className="h-full bg-gradient-to-r from-indigo-500 to-violet-500 rounded-full transition-all" style={{ width: "58%" }} />
                      </div>
                    </div>

                    {/* Sections checklist */}
                    <div className="px-4 py-3 grid grid-cols-2 gap-y-2 gap-x-4">
                      {DOC_SECTIONS.map(sec => (
                        <div key={sec.label} className={`flex items-center gap-2 ${sec.active ? "opacity-100" : sec.done ? "opacity-70" : "opacity-35"}`}>
                          {sec.done
                            ? <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 flex-shrink-0" />
                            : sec.active
                            ? <Loader2 className="w-3.5 h-3.5 text-indigo-400 animate-spin flex-shrink-0" />
                            : <Circle className="w-3.5 h-3.5 text-white/20 flex-shrink-0" />}
                          <span className={`text-[11px] truncate ${sec.active ? "text-indigo-300 font-medium" : sec.done ? "text-white/60" : "text-white/30"}`}>{sec.label}</span>
                        </div>
                      ))}
                    </div>

                    {/* Text preview */}
                    <div className="mx-4 mb-3 rounded-lg bg-[#0f1117] border border-white/[0.05] px-3 py-2.5">
                      <p className="text-[10px] text-white/30 font-semibold uppercase tracking-wider mb-1.5">Preview — Experimental Setup</p>
                      <p className="text-[11px] text-white/55 leading-relaxed font-mono">
                        The experimental setup consisted of a DC servo motor connected to a rotary encoder providing position feedback at 1000 ppr. A dSPACE DS1104 controller board was used to implement the discrete-time PID algorithm at a sampling rate of Ts = 1 ms. The control gains were tuned using the Ziegler–Nichols step-response method, yielding…
                        <span className="inline-block w-2 h-3.5 bg-indigo-400 ml-0.5 animate-pulse align-text-bottom rounded-sm" />
                      </p>
                    </div>

                    {/* Actions */}
                    <div className="px-4 pb-4 flex items-center gap-2">
                      <button className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-indigo-600/80 hover:bg-indigo-600 text-white text-xs font-medium transition-colors">
                        <ExternalLink className="w-3 h-3" />Open in Word
                      </button>
                      <button className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-white/[0.05] hover:bg-white/[0.08] text-white/50 text-xs font-medium border border-white/[0.07] transition-colors">
                        <Download className="w-3 h-3" />Save PDF
                      </button>
                      <button className="ml-auto text-[10px] text-white/25 hover:text-white/50 transition-colors">Cancel</button>
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              /* Default: typing indicator */
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
            )}
          </div>
        )}

        {/* ══ INPUT AREA ══ */}
        <div className="px-6 py-4 border-t border-white/[0.06] bg-[#0f1117]">
          {/* Active tool badge */}
          {activeTool && (
            <div className="mb-3 flex items-center gap-2">
              <div className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-medium border ${activeTool === "Write Doc" ? "bg-indigo-500/10 border-indigo-500/25 text-indigo-300" : activeTool === "Calculator" ? "bg-emerald-500/10 border-emerald-500/25 text-emerald-300" : "bg-amber-500/10 border-amber-500/25 text-amber-300"}`}>
                {activeTool === "Write Doc" && <PenLine className="w-3 h-3" />}
                {activeTool === "Calculator" && <Calculator className="w-3 h-3" />}
                {activeTool === "Search Notes" && <Search className="w-3 h-3" />}
                {activeTool}
                <button onClick={() => setActiveTool(null)} className="ml-1 opacity-60 hover:opacity-100"><X className="w-3 h-3" /></button>
              </div>
              <span className="text-[10px] text-white/25">
                {activeTool === "Write Doc" && "Document editor active — results open as a live card"}
                {activeTool === "Calculator" && "Floating calculator open — drag to reposition"}
                {activeTool === "Search Notes" && "Searching across your saved memory"}
              </span>
            </div>
          )}

          {/* Attachment staging */}
          {attachments.length > 0 && (
            <div className="mb-3 flex items-center gap-2 flex-wrap">
              {attachments.map(att => (
                <div key={att.name} className="flex items-center gap-2 pl-2 pr-1.5 py-1.5 rounded-xl bg-white/[0.04] border border-white/[0.06]">
                  <div className={`w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0 ${att.kind === "image" ? "bg-violet-500/15" : att.kind === "pdf" ? "bg-rose-500/15" : "bg-blue-500/15"}`}>
                    {att.kind === "image" && <Image className="w-3.5 h-3.5 text-violet-400" />}
                    {att.kind === "pdf"   && <FileText className="w-3.5 h-3.5 text-rose-400" />}
                    {att.kind === "doc"   && <FileText className="w-3.5 h-3.5 text-blue-400" />}
                  </div>
                  <div className="min-w-0">
                    <p className="text-xs font-medium text-white/70 max-w-[140px] truncate">{att.name}</p>
                    <p className="text-[10px] text-white/30">{att.kind === "image" ? "Image · will be analysed" : att.kind === "pdf" ? "PDF · context for this message" : "Document"}</p>
                  </div>
                  <button onClick={() => setAttachments(a => a.filter(x => x.name !== att.name))} className="ml-0.5 w-5 h-5 flex items-center justify-center rounded-md text-white/25 hover:text-white/60 hover:bg-white/[0.08] transition-colors">
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
                { id:"Write Doc",    icon: PenLine,     label:"Write Doc",    desc:"Write & edit docs",        color:"text-indigo-400", bg:"bg-indigo-500/10 border-indigo-500/15" },
                { id:"Calculator",   icon: Calculator,  label:"Calculator",   desc:"School-specific calc",     color:"text-emerald-400", bg:"bg-emerald-500/10 border-emerald-500/15" },
                { id:"Search Notes", icon: Search,      label:"Search Notes", desc:"Search your memory",      color:"text-amber-400",  bg:"bg-amber-500/10 border-amber-500/15" },
              ].map(tool => (
                <button key={tool.id} onClick={() => pickTool(tool.id)}
                  className={`flex flex-col items-center gap-1.5 p-3 rounded-xl border transition-all hover:scale-[1.02] ${activeTool === tool.id ? tool.bg + " border-opacity-100" : "border-white/[0.06] hover:bg-white/[0.04]"}`}>
                  <tool.icon className={`w-5 h-5 ${tool.color}`} />
                  <span className="text-[11px] font-semibold text-white/80">{tool.label}</span>
                  <span className="text-[9px] text-white/30 text-center leading-tight">{tool.desc}</span>
                </button>
              ))}
            </div>
          )}

          <div className="flex items-end gap-3">
            <button onClick={() => setToolsOpen(o => !o)}
              className={`w-9 h-9 flex items-center justify-center rounded-xl border transition-all flex-shrink-0 mb-0.5 ${toolsOpen ? "bg-white/[0.1] border-white/20 text-white/70" : "bg-white/[0.04] border-white/[0.08] text-white/30 hover:text-white/60 hover:bg-white/[0.08]"}`}>
              {toolsOpen ? <ChevronUp className="w-4 h-4" /> : <Plus className="w-4 h-4" />}
            </button>
            <div className="flex-1 flex flex-col rounded-2xl bg-[#1a1d2e] border border-white/[0.08] focus-within:border-indigo-500/40 transition-colors overflow-hidden">
              <textarea rows={2} value={input} onChange={e => setInput(e.target.value)}
                placeholder={activeTool === "Write Doc" ? "Describe the document you want written..." : activeTool === "Calculator" ? "Type a calculation or use the floating calculator..." : activeTool === "Search Notes" ? "Type to search your notes and files..." : "Ask anything, attach images or PDFs..."}
                className="flex-1 bg-transparent text-sm text-white/80 placeholder-white/20 resize-none outline-none leading-relaxed px-4 pt-3 pb-1" />
              <div className="flex items-center gap-1 px-3 pb-2">
                <button className="w-7 h-7 flex items-center justify-center rounded-lg text-white/30 hover:text-white/60 hover:bg-white/[0.06] transition-colors"><Paperclip className="w-3.5 h-3.5" /></button>
                <button className="w-7 h-7 flex items-center justify-center rounded-lg text-white/30 hover:text-white/60 hover:bg-white/[0.06] transition-colors"><Image className="w-3.5 h-3.5" /></button>
                <button className="w-7 h-7 flex items-center justify-center rounded-lg text-white/30 hover:text-white/60 hover:bg-white/[0.06] transition-colors"><Mic className="w-3.5 h-3.5" /></button>
              </div>
            </div>
            <button className="w-10 h-10 flex items-center justify-center rounded-xl bg-indigo-600 hover:bg-indigo-500 transition-colors shadow-md shadow-indigo-500/20 flex-shrink-0 mb-0.5">
              <Send className="w-4 h-4 text-white" />
            </button>
          </div>
          <p className="text-[10px] text-white/20 mt-2.5 px-1">All processing is done locally · No internet needed</p>
        </div>
      </main>

      {/* ══ RIGHT PANEL ══ */}
      <aside className={`flex-shrink-0 bg-[#13151f] border-l border-white/[0.06] flex flex-col transition-all duration-300 ease-in-out overflow-hidden ${rightOpen ? "w-72" : "w-12"}`}>
        {rightOpen ? (
          <>
            <div className="px-4 py-4 border-b border-white/[0.06] flex items-center justify-between">
              <div>
                <h2 className="text-xs font-semibold text-white/70 uppercase tracking-wider">Context</h2>
                <p className="text-[11px] text-white/30 mt-0.5">Memory items feeding this chat</p>
              </div>
              <button onClick={() => setRightOpen(false)} className="w-7 h-7 flex items-center justify-center rounded-lg text-white/30 hover:text-white/70 hover:bg-white/[0.06] transition-colors">
                <PanelRightClose className="w-4 h-4" />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto p-4 space-y-3">
              {[
                { icon: FileText, label: "PID Control Notes", date: "Nov 12", color: "text-blue-400", bg: "bg-blue-500/10", desc: "12 pages · Lecture notes from ME301" },
                { icon: Image,    label: "Lab Diagram — Servo", date: "Nov 10", color: "text-violet-400", bg: "bg-violet-500/10", desc: "Whiteboard photo · Feedback loop diagram" },
              ].map(item => (
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
                    <button className="text-white/20 hover:text-white/50 transition-colors"><X className="w-3.5 h-3.5" /></button>
                  </div>
                </div>
              ))}
              <div className="mt-2">
                <p className="text-[10px] uppercase tracking-widest text-white/30 font-semibold mb-2">Generated Documents</p>
                {[
                  { label: "Lab Report — PID Control", format: "DOCX", date: "Now" },
                  { label: "Summary — Thermodynamics", format: "PDF",  date: "Yesterday" },
                ].map(doc => (
                  <div key={doc.label} className="flex items-center gap-2.5 py-2.5 border-b border-white/[0.04]">
                    <div className="w-7 h-7 rounded-lg bg-emerald-500/10 flex items-center justify-center">
                      <FileText className="w-3.5 h-3.5 text-emerald-400" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs text-white/70 truncate">{doc.label}</p>
                      <p className="text-[10px] text-white/30">{doc.format} · {doc.date}</p>
                    </div>
                    <button className="text-white/25 hover:text-white/60 transition-colors"><Download className="w-3.5 h-3.5" /></button>
                  </div>
                ))}
              </div>
              <button className="w-full mt-2 flex items-center justify-center gap-2 py-2.5 rounded-xl border border-dashed border-white/[0.1] text-xs text-white/30 hover:text-white/60 hover:border-white/20 transition-colors">
                <Plus className="w-3.5 h-3.5" />Add files to memory
              </button>
            </div>
            <div className="px-4 py-4 border-t border-white/[0.06] space-y-2.5">
              {[
                { label: "Model",  value: "Llama 3.1 8B",    color: "text-indigo-400" },
                { label: "Vision", value: "Moondream2",       color: "text-violet-400" },
                { label: "Memory", value: "ChromaDB · Local", color: "text-emerald-400" },
              ].map(row => (
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
          <div className="flex flex-col items-center py-3 gap-3 h-full cursor-pointer group" onClick={() => setRightOpen(true)}>
            <button className="w-8 h-8 flex items-center justify-center rounded-lg text-white/30 group-hover:text-white/70 group-hover:bg-white/[0.06] transition-colors" onClick={e => { e.stopPropagation(); setRightOpen(true); }}>
              <PanelRightOpen className="w-4 h-4" />
            </button>
            <div className="w-6 h-px bg-white/[0.08] rounded" />
            <div className="w-8 h-8 rounded-lg bg-white/[0.04] flex items-center justify-center">
              <Layers className="w-3.5 h-3.5 text-white/25 group-hover:text-white/50 transition-colors" />
            </div>
            <div className="w-6 h-px bg-white/[0.08] rounded" />
            <div className="flex flex-col items-center gap-2">
              <div className="w-7 h-7 flex items-center justify-center rounded-lg text-white/20 group-hover:text-white/40 transition-colors" title="PID Control Notes"><FileText className="w-3.5 h-3.5" /></div>
              <div className="w-7 h-7 flex items-center justify-center rounded-lg text-white/20 group-hover:text-white/40 transition-colors" title="Lab Diagram"><Image className="w-3.5 h-3.5" /></div>
              <div className="w-7 h-7 flex items-center justify-center rounded-lg text-white/20 group-hover:text-white/40 transition-colors" title="Documents"><BookOpen className="w-3.5 h-3.5" /></div>
            </div>
            <div className="mt-auto mb-2 flex flex-col items-center gap-1.5">
              <div className="w-1.5 h-1.5 rounded-full bg-emerald-400" title="Fully Offline" />
            </div>
          </div>
        )}
      </aside>

      {/* ══ FLOATING CALCULATOR ══ */}
      {activeTool === "Calculator" && (
        <div
          className="absolute z-50 rounded-2xl bg-[#13151f] border border-white/[0.10] shadow-2xl shadow-black/60 flex flex-col overflow-hidden select-none"
          style={{ left: calcPos.x, top: calcPos.y, width: calcSize.w, height: calcSize.h }}
        >
          {/* Drag handle / header */}
          <div
            className="flex items-center justify-between px-3 py-2.5 border-b border-white/[0.08] bg-[#1a1d2e] cursor-grab active:cursor-grabbing"
            onMouseDown={startDrag}
          >
            <div className="flex items-center gap-2">
              <GripHorizontal className="w-3.5 h-3.5 text-white/20" />
              <span className="text-xs font-semibold text-white/70">Calculator</span>
              <span className={`text-[10px] font-medium ${school.color} opacity-70`}>· {school.desc}</span>
            </div>
            <div className="flex items-center gap-1">
              <button onClick={() => setCalcDisplay("0")} className="w-6 h-6 flex items-center justify-center rounded-md text-white/25 hover:text-white/60 hover:bg-white/[0.06] transition-colors" title="Clear">
                <Minimize2 className="w-3 h-3" />
              </button>
              <button onClick={() => setActiveTool(null)} className="w-6 h-6 flex items-center justify-center rounded-md text-white/25 hover:text-white/60 hover:bg-white/[0.06] transition-colors">
                <X className="w-3 h-3" />
              </button>
            </div>
          </div>

          {/* School selector */}
          <div className="flex gap-1 px-2 py-2 border-b border-white/[0.06] overflow-x-auto scrollbar-none">
            {CALC_SCHOOLS.map(s => (
              <button key={s.id} onClick={() => { setCalcSchool(s.id); setCalcDisplay("0"); }}
                className={`flex items-center gap-1 px-2.5 py-1 rounded-lg text-[10px] font-semibold whitespace-nowrap transition-all flex-shrink-0 ${calcSchool === s.id ? `${s.color} bg-white/[0.08] border border-white/[0.1]` : "text-white/30 hover:text-white/55 hover:bg-white/[0.04]"}`}>
                <s.icon className="w-3 h-3" />
                {s.short}
              </button>
            ))}
          </div>

          {/* Display */}
          <div className="px-3 pt-3 pb-2">
            <div className="rounded-xl bg-[#0f1117] border border-white/[0.06] px-4 py-3 text-right">
              <p className="text-[10px] text-white/25 mb-1 uppercase tracking-wider font-semibold">{school.label}</p>
              <p className="text-2xl font-mono font-light text-white/90 truncate">{calcDisplay}</p>
            </div>
          </div>

          {/* Keypad */}
          <div className="flex-1 px-3 pb-3 overflow-y-auto">
            <div className="space-y-1.5 h-full flex flex-col justify-end">
              {school.rows.map((row, ri) => (
                <div key={ri} className="grid gap-1.5" style={{ gridTemplateColumns: `repeat(${row.length}, 1fr)` }}>
                  {row.map(key => (
                    <button key={key} onClick={() => onCalcKey(key)}
                      className={`h-9 flex items-center justify-center transition-all active:scale-95 ${keyClass(key)}`}>
                      {key}
                    </button>
                  ))}
                </div>
              ))}
            </div>
          </div>

          {/* Resize handle */}
          <div
            className="absolute bottom-0 right-0 w-5 h-5 cursor-se-resize flex items-end justify-end pb-1 pr-1"
            onMouseDown={startResize}
          >
            <svg width="8" height="8" viewBox="0 0 8 8" className="text-white/20">
              <path d="M8 0 L8 8 L0 8" stroke="currentColor" strokeWidth="1.5" fill="none" />
              <path d="M8 4 L8 8 L4 8" stroke="currentColor" strokeWidth="1.5" fill="none" />
            </svg>
          </div>
        </div>
      )}
    </div>
  );
}
