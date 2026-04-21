import { useState, useRef } from "react";
import {
  Sparkles, Send, FileText, Image, BookOpen, Settings,
  ChevronRight, Paperclip, MoreHorizontal, WifiOff, Download,
  MessageSquare, X, Plus, Mic, Layers,
  PanelLeftClose, PanelLeftOpen, PanelRightClose, PanelRightOpen,
  PenLine, Calculator, ChevronUp, Search,
  ExternalLink, CheckCircle2, Circle, Loader2,
  FlaskConical, TrendingUp, Scale, Stethoscope, BarChart2,
  GripHorizontal, Minimize2, Sun, Moon
} from "lucide-react";

/* ─────────────── Types ─────────────── */
type Message = { id: number; role: "user" | "assistant"; content: string; timestamp: string };
type Attachment = { name: string; kind: "image" | "pdf" | "doc" };

/* ─────────────── Demo data ─────────────── */
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
  { type: "pdf" as const, title: "PID Control Notes — Lecture Notes ME301", path: "Memory › Uploads › Nov 12, 2024", snippet: "…the feedback loop in a **PID control** system compares the setpoint to the measured output to compute error *e(t)*. The controller then applies proportional, integral and derivative corrections…", meta: "12 pages · PDF", relevance: 98 },
  { type: "image" as const, title: "Lab Diagram — Servo Motor Feedback Loop", path: "Memory › Images › Nov 10, 2024", snippet: "Whiteboard photo showing a servo motor **PID feedback** loop block diagram. Labels: Setpoint, Error, Controller, Plant, Sensor. Handwritten gain values Kp=1.2, Ki=0.4…", meta: "1 image · JPG", relevance: 91 },
  { type: "pdf" as const, title: "Thermodynamics Ch.5 — Feedback Control Applications", path: "Memory › PDFs › Nov 8, 2024", snippet: "Chapter 5 covers thermal **feedback** systems and control loops applied to heat exchangers. Section 5.3 references **PID** tuning for thermal regulation using Ziegler–Nichols…", meta: "28 pages · PDF", relevance: 74 },
  { type: "doc" as const, title: "Assignment 3 Draft — Control Systems", path: "Memory › Documents › Nov 7, 2024", snippet: "We implement a digital **PID controller** using MATLAB Simulink. The **feedback** topology follows the block diagram from lecture 8, with discretisation step Ts=0.01s…", meta: "6 pages · DOCX", relevance: 67 },
];

const CALC_SCHOOLS = [
  { id: "engineering", label: "Engineering", short: "Sci", icon: FlaskConical, color: "text-indigo-500", rows: [["sin","cos","tan","π"],["log","ln","√","x²"],["(",")","%","÷"],["7","8","9","×"],["4","5","6","−"],["1","2","3","+"],["±","0",".","="]] },
  { id: "business",    label: "Business",    short: "Fin", icon: TrendingUp,   color: "text-emerald-600", rows: [["PV","FV","PMT","n"],["i%","NPV","IRR","%"],["(",")",  "CE","÷"],["7","8","9","×"],["4","5","6","−"],["1","2","3","+"],["±","0",".","="]] },
  { id: "humanities",  label: "Humanities",  short: "Std", icon: BookOpen,     color: "text-amber-600",  rows: [["Day↔","Yr↔","°C↔F","%"],["(",")",  "CE","÷"],["7","8","9","×"],["4","5","6","−"],["1","2","3","+"],["±","0",".","="]] },
  { id: "law",         label: "Law",         short: "Leg", icon: Scale,        color: "text-violet-600", rows: [["hr×$","days","VAT","%"],["(",")",  "CE","÷"],["7","8","9","×"],["4","5","6","−"],["1","2","3","+"],["±","0",".","="]] },
  { id: "medicine",    label: "Medicine",    short: "Med", icon: Stethoscope,  color: "text-rose-600",   rows: [["mg/kg","BSA","BMI","CrCl"],["(",")",  "CE","÷"],["7","8","9","×"],["4","5","6","−"],["1","2","3","+"],["±","0",".","="]] },
  { id: "statistics",  label: "Statistics",  short: "Stat",icon: BarChart2,    color: "text-cyan-600",   rows: [["σ","μ","r²","P(x)"],["∑","n!","Cₙᵣ","%"],["(",")",  "CE","÷"],["7","8","9","×"],["4","5","6","−"],["1","2","3","+"],["±","0",".","="]] },
];

const SESSIONS = [
  { label: "PID Control Study", time: "Today" },
  { label: "Thermodynamics Laws", time: "Yesterday" },
  { label: "Circuit Analysis", time: "Mon" },
  { label: "Mechanics of Materials", time: "Last week" },
];

const MEMORY_ITEMS = [
  { icon: FileText, label: "PID Control Notes", date: "Nov 12" },
  { icon: Image,    label: "Lab Diagram — Servo Motor", date: "Nov 10" },
  { icon: BookOpen, label: "Thermodynamics Ch. 5 PDF", date: "Nov 8" },
  { icon: FileText, label: "Assignment 3 Draft", date: "Nov 7" },
];

/* ─────────────── Theme palette ─────────────── */
function makeTheme(dark: boolean) {
  if (dark) return {
    root:         "bg-[#0f1117] text-white",
    sidebar:      "bg-[#13151f]",
    panel:        "bg-[#13151f]",
    card:         "bg-[#1a1d2e]",
    inputWrap:    "bg-[#1a1d2e]",
    calcBg:       "bg-[#13151f]",
    calcHeader:   "bg-[#1a1d2e]",
    calcDisplay:  "bg-[#0f1117]",
    headerBg:     "bg-[#0f1117]",
    tabBg:        "bg-[#0f1117]",
    inputAreaBg:  "bg-[#0f1117]",

    border:    "border-white/[0.06]",
    borderMd:  "border-white/[0.08]",
    borderBrt: "border-white/[0.1]",

    text:      "text-white",
    textHi:    "text-white/90",
    textMd:    "text-white/80",
    textBody:  "text-white/70",
    textSm:    "text-white/60",
    textMuted: "text-white/50",
    textFaint: "text-white/35",
    textXs:    "text-white/25",
    textGhost: "text-white/20",

    bgSub:    "bg-white/[0.03]",
    bgMuted:  "bg-white/[0.04]",
    bgSubtle: "bg-white/[0.06]",
    bgMed:    "bg-white/[0.08]",
    bgBrt:    "bg-white/[0.1]",

    hoverSub:    "hover:bg-white/[0.04]",
    hoverMuted:  "hover:bg-white/[0.06]",
    hoverMed:    "hover:bg-white/[0.08]",

    chatInactive:    "text-white/50 hover:text-white/80 hover:bg-white/[0.04]",
    chatActive:      "bg-indigo-600/20 text-white border border-indigo-500/20",
    memBannerBg:     "bg-indigo-500/[0.08] border-indigo-500/15",
    memBannerText:   "text-indigo-300/80",
    memBannerStrong: "text-indigo-300",
    memBannerArrow:  "text-indigo-400/50",
    userMsg:         "bg-indigo-600 text-white rounded-tr-sm",
    assistMsg:       "bg-[#1a1d2e] text-white/85 border border-white/[0.06] rounded-tl-sm",
    tabActive:       "border-indigo-500 text-white",
    tabInactive:     "border-transparent text-white/40 hover:text-white/60",
    vramTrack:       "bg-white/[0.06]",
    searchResult:    "border-white/[0.06] hover:border-white/[0.12] bg-white/[0.015] hover:bg-white/[0.03]",
    searchBreadcrumb:"text-emerald-500/70",
    searchInput:     "bg-[#1a1d2e] border-white/[0.1]",
    searchTipBg:     "bg-amber-500/[0.06] border-amber-500/15",
    searchTipText:   "text-amber-300/60",
    searchTipStrong: "text-amber-300/80",
    docCard:         "border-indigo-500/25 bg-[#1a1d2e]",
    docHeader:       "bg-indigo-500/[0.07] border-b border-indigo-500/15",
    docPreview:      "bg-[#0f1117] border-white/[0.05]",
    docPreviewLabel: "text-white/30",
    docPreviewText:  "text-white/55",
    inputFocus:      "focus-within:border-indigo-500/40",
    gripColor:       "text-white/20",
    resizeColor:     "text-white/20",
    keyEq:  "bg-indigo-600 hover:bg-indigo-500 text-white",
    keyOp:  "bg-white/[0.08] hover:bg-white/[0.14] text-indigo-300",
    keySp:  "bg-white/[0.06] hover:bg-white/[0.1] text-white/60",
    keyFn:  "bg-white/[0.04] hover:bg-white/[0.08] text-white/50",
    keyNum: "bg-white/[0.04] hover:bg-white/[0.1] text-white/80",
    dot:    "bg-white/[0.08]",
  } as const;

  /* ── LIGHT MODE — warm cream palette ── */
  return {
    root:         "bg-[#f7f4ef] text-[#2c2418]",
    sidebar:      "bg-[#ede8df]",
    panel:        "bg-[#ede8df]",
    card:         "bg-white",
    inputWrap:    "bg-white",
    calcBg:       "bg-white",
    calcHeader:   "bg-[#f7f4ef]",
    calcDisplay:  "bg-[#ede8df]",
    headerBg:     "bg-[#f7f4ef]",
    tabBg:        "bg-[#f7f4ef]",
    inputAreaBg:  "bg-[#f7f4ef]",

    border:    "border-[#ddd4c4]",
    borderMd:  "border-[#d4c9b6]",
    borderBrt: "border-[#c8baaa]",

    text:      "text-[#2c2418]",
    textHi:    "text-[#2c2418]",
    textMd:    "text-[#4a3f34]",
    textBody:  "text-[#5c5044]",
    textSm:    "text-[#6e6256]",
    textMuted: "text-[#8c7d70]",
    textFaint: "text-[#a89888]",
    textXs:    "text-[#b8a898]",
    textGhost: "text-[#cebeb0]",

    bgSub:    "bg-[#faf8f4]",
    bgMuted:  "bg-[#f4f0e8]",
    bgSubtle: "bg-[#ede8df]",
    bgMed:    "bg-[#e5ddd0]",
    bgBrt:    "bg-[#dcd4c4]",

    hoverSub:    "hover:bg-[#f4f0e8]",
    hoverMuted:  "hover:bg-[#ede8df]",
    hoverMed:    "hover:bg-[#e5ddd0]",

    chatInactive:    "text-[#8c7d70] hover:text-[#2c2418] hover:bg-[#f4f0e8]",
    chatActive:      "bg-indigo-50 text-indigo-900 border border-indigo-200/80",
    memBannerBg:     "bg-indigo-50/80 border-indigo-200/60",
    memBannerText:   "text-indigo-700/80",
    memBannerStrong: "text-indigo-700",
    memBannerArrow:  "text-indigo-400",
    userMsg:         "bg-indigo-600 text-white rounded-tr-sm",
    assistMsg:       "bg-white text-[#2c2418] border border-[#ddd4c4] rounded-tl-sm",
    tabActive:       "border-indigo-500 text-indigo-700",
    tabInactive:     "border-transparent text-[#8c7d70] hover:text-[#5c5044]",
    vramTrack:       "bg-[#ddd4c4]",
    searchResult:    "border-[#ddd4c4] hover:border-[#c8baaa] bg-white hover:bg-[#faf8f4]",
    searchBreadcrumb:"text-emerald-700/70",
    searchInput:     "bg-white border-[#d4c9b6]",
    searchTipBg:     "bg-amber-50 border-amber-200/70",
    searchTipText:   "text-amber-700/70",
    searchTipStrong: "text-amber-800/80",
    docCard:         "border-indigo-200/80 bg-white shadow-sm shadow-indigo-100",
    docHeader:       "bg-indigo-50/60 border-b border-indigo-100",
    docPreview:      "bg-[#f7f4ef] border-[#e5ddd0]",
    docPreviewLabel: "text-[#a89888]",
    docPreviewText:  "text-[#5c5044]",
    inputFocus:      "focus-within:border-indigo-400/60",
    gripColor:       "text-[#c8baaa]",
    resizeColor:     "text-[#c8baaa]",
    keyEq:  "bg-indigo-600 hover:bg-indigo-500 text-white",
    keyOp:  "bg-[#e8e1d8] hover:bg-[#ddd4c4] text-indigo-700",
    keySp:  "bg-[#ede8df] hover:bg-[#e5ddd0] text-[#6e6256]",
    keyFn:  "bg-[#f4f0e8] hover:bg-[#ede8df] text-[#8c7d70]",
    keyNum: "bg-[#f4f0e8] hover:bg-[#e8e1d8] text-[#2c2418]",
    dot:    "bg-[#ddd4c4]",
  } as const;
}

/* ─────────────── Component ─────────────── */
export function MainApp() {
  const [darkMode, setDarkMode] = useState(true);
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

  /* Calculator */
  const [calcSchool, setCalcSchool] = useState("engineering");
  const [calcDisplay, setCalcDisplay] = useState("0");
  const [calcPos, setCalcPos] = useState({ x: 320, y: 80 });
  const [calcSize, setCalcSize] = useState({ w: 310, h: 490 });
  const dragRef  = useRef<{ ox: number; oy: number; px: number; py: number } | null>(null);
  const resizeRef = useRef<{ ox: number; oy: number; w: number; h: number } | null>(null);

  const c = makeTheme(darkMode);

  function startDrag(e: React.MouseEvent) {
    e.preventDefault();
    dragRef.current = { ox: e.clientX, oy: e.clientY, px: calcPos.x, py: calcPos.y };
    const onMove = (ev: MouseEvent) => { if (dragRef.current) setCalcPos({ x: dragRef.current.px + ev.clientX - dragRef.current.ox, y: dragRef.current.py + ev.clientY - dragRef.current.oy }); };
    const onUp   = () => { dragRef.current = null; document.removeEventListener("mousemove", onMove); document.removeEventListener("mouseup", onUp); };
    document.addEventListener("mousemove", onMove); document.addEventListener("mouseup", onUp);
  }

  function startResize(e: React.MouseEvent) {
    e.preventDefault(); e.stopPropagation();
    resizeRef.current = { ox: e.clientX, oy: e.clientY, w: calcSize.w, h: calcSize.h };
    const onMove = (ev: MouseEvent) => { if (resizeRef.current) setCalcSize({ w: Math.max(280, resizeRef.current.w + ev.clientX - resizeRef.current.ox), h: Math.max(400, resizeRef.current.h + ev.clientY - resizeRef.current.oy) }); };
    const onUp   = () => { resizeRef.current = null; document.removeEventListener("mousemove", onMove); document.removeEventListener("mouseup", onUp); };
    document.addEventListener("mousemove", onMove); document.addEventListener("mouseup", onUp);
  }

  function onCalcKey(key: string) {
    const specials = ["sin","cos","tan","π","log","ln","√","x²","PV","FV","PMT","n","i%","NPV","IRR","σ","μ","r²","P(x)","∑","n!","Cₙᵣ","mg/kg","BSA","BMI","CrCl","hr×$","days","VAT","Day↔","Yr↔","°C↔F"];
    if (key === "=") {
      try {
        const r = Function('"use strict";return(' + calcDisplay.replace(/×/g,"*").replace(/÷/g,"/").replace(/−/g,"-") + ")")();
        setCalcDisplay(String(parseFloat(r.toFixed(10))));
      } catch { setCalcDisplay("Error"); }
    } else if (key === "CE") { setCalcDisplay("0");
    } else if (key === "±") { setCalcDisplay(d => d.startsWith("-") ? d.slice(1) : "-" + d);
    } else if (specials.includes(key)) { setCalcDisplay(key + "(");
    } else { setCalcDisplay(d => d === "0" || d === "Error" ? key : d + key); }
  }

  function keyClass(key: string) {
    if (key === "=") return `col-span-1 ${c.keyEq} font-bold rounded-xl text-sm transition-colors`;
    if (["+","−","×","÷"].includes(key)) return `${c.keyOp} font-semibold rounded-xl text-sm transition-colors`;
    if (["CE","±","%"].includes(key)) return `${c.keySp} rounded-xl text-xs transition-colors`;
    const sp = ["sin","cos","tan","π","log","ln","√","x²","PV","FV","PMT","n","i%","NPV","IRR","σ","μ","r²","P(x)","∑","n!","Cₙᵣ","mg/kg","BSA","BMI","CrCl","hr×$","days","VAT","Day↔","Yr↔","°C↔F"];
    if (sp.includes(key)) return `${c.keyFn} rounded-xl text-[10px] font-medium transition-colors`;
    return `${c.keyNum} rounded-xl text-sm transition-colors`;
  }

  function selectChat(label: string) { setActiveChat(label); setSidebarOpen(false); }
  function pickTool(id: string) { setActiveTool(id); setToolsOpen(false); }

  const school = CALC_SCHOOLS.find(s => s.id === calcSchool) ?? CALC_SCHOOLS[0];

  return (
    <div className={`relative flex h-screen font-sans overflow-hidden transition-colors duration-300 ${c.root}`}>

      {/* ══ LEFT SIDEBAR ══ */}
      <aside className={`flex-shrink-0 ${c.sidebar} border-r ${c.border} flex flex-col transition-all duration-300 ease-in-out overflow-hidden ${sidebarOpen ? "w-64" : "w-12"}`}>
        {sidebarOpen ? (
          <>
            <div className={`px-4 py-4 border-b ${c.border} flex items-center justify-between`}>
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-indigo-500 to-violet-600 flex items-center justify-center shadow-lg shadow-indigo-500/20 flex-shrink-0">
                  <Sparkles className="w-4 h-4 text-white" />
                </div>
                <div>
                  <p className={`text-sm tracking-tight whitespace-nowrap ${c.text}`}>
                    <span className="font-bold">MyGPT</span>
                    <span className={`font-light ml-1 ${c.textBody}`}>for Students</span>
                  </p>
                  <p className={`text-[10px] font-medium ${c.textMuted}`}>Your offline study companion</p>
                </div>
              </div>
              <button onClick={() => setSidebarOpen(false)} className={`w-7 h-7 flex items-center justify-center rounded-lg ${c.textMuted} ${c.hoverMuted} transition-colors`}>
                <PanelLeftClose className="w-4 h-4" />
              </button>
            </div>

            <div className="px-4 py-3">
              <button className="w-full flex items-center gap-2 px-3 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-500 transition-colors text-sm font-medium text-white shadow-md shadow-indigo-500/20">
                <Plus className="w-4 h-4" />New Chat
              </button>
            </div>

            <div className="flex-1 overflow-y-auto px-3 pb-4">
              <p className={`text-[10px] uppercase tracking-widest font-semibold px-2 mb-2 ${c.textFaint}`}>Chats</p>
              <div className="space-y-0.5">
                {SESSIONS.map(s => (
                  <button key={s.label} onClick={() => selectChat(s.label)}
                    className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-left transition-all ${activeChat === s.label ? c.chatActive : c.chatInactive}`}>
                    <MessageSquare className={`w-3.5 h-3.5 flex-shrink-0 ${activeChat === s.label ? "text-indigo-500" : ""}`} />
                    <span className="text-xs flex-1 truncate font-medium">{s.label}</span>
                    <span className={`text-[10px] ${c.textXs}`}>{s.time}</span>
                  </button>
                ))}
              </div>

              <p className={`text-[10px] uppercase tracking-widest font-semibold px-2 mt-5 mb-2 ${c.textFaint}`}>Memory</p>
              <div className="space-y-0.5">
                {MEMORY_ITEMS.map(m => (
                  <button key={m.label} className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-left transition-all ${c.textMuted} ${c.hoverSub}`}>
                    <m.icon className="w-3.5 h-3.5 flex-shrink-0 text-violet-500" />
                    <span className={`text-xs flex-1 truncate ${c.textBody}`}>{m.label}</span>
                    <span className={`text-[10px] ${c.textXs}`}>{m.date}</span>
                  </button>
                ))}
              </div>
            </div>

            <div className={`px-4 py-3 border-t ${c.border}`}>
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-1.5">
                  <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                  <span className={`text-[10px] font-medium ${c.textMuted}`}>Llama 3.1 · 8B Q4</span>
                </div>
                <WifiOff className={`w-3 h-3 ${c.textGhost}`} />
              </div>
              <div className={`w-full ${c.vramTrack} rounded-full h-1`}>
                <div className="bg-indigo-500/70 h-1 rounded-full" style={{ width: "62%" }} />
              </div>
              <p className={`text-[10px] mt-1 ${c.textXs}`}>3.2 GB / 5.1 GB VRAM</p>
            </div>

            <button className={`flex items-center gap-2.5 px-5 py-3 border-t ${c.border} ${c.textMuted} ${c.hoverMuted} transition-colors text-xs`}>
              <Settings className="w-3.5 h-3.5" />Settings
            </button>
          </>
        ) : (
          <div className="flex flex-col items-center py-3 gap-3 h-full cursor-pointer group" onClick={() => setSidebarOpen(true)}>
            <button className={`w-8 h-8 flex items-center justify-center rounded-lg ${c.textGhost} ${c.hoverMuted} transition-colors`} onClick={e => { e.stopPropagation(); setSidebarOpen(true); }}>
              <PanelLeftOpen className="w-4 h-4" />
            </button>
            <div className={`w-6 h-px ${c.dot} rounded`} />
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-indigo-500 to-violet-600 flex items-center justify-center shadow-md shadow-indigo-500/20">
              <Sparkles className="w-3.5 h-3.5 text-white" />
            </div>
            <div className={`w-6 h-px ${c.dot} rounded`} />
            <div className="flex flex-col items-center gap-2">
              {SESSIONS.slice(0, 3).map(s => (
                <div key={s.label} className={`w-7 h-7 flex items-center justify-center rounded-lg ${c.textGhost} transition-colors`} title={s.label}>
                  <MessageSquare className="w-3.5 h-3.5" />
                </div>
              ))}
            </div>
            <div className="mt-auto mb-1">
              <div className={`w-7 h-7 flex items-center justify-center rounded-lg ${c.textGhost} transition-colors`}>
                <Settings className="w-3.5 h-3.5" />
              </div>
            </div>
          </div>
        )}
      </aside>

      {/* ══ MAIN CONTENT ══ */}
      <main className="flex-1 flex flex-col min-w-0">
        {/* Header */}
        <header className={`flex items-center justify-between px-4 py-3 border-b ${c.border} ${c.headerBg}`}>
          <div className="flex items-center gap-3">
            {!sidebarOpen && (
              <button onClick={() => setSidebarOpen(true)} className={`w-8 h-8 flex items-center justify-center rounded-lg ${c.textMuted} ${c.hoverMuted} transition-colors`}>
                <PanelLeftOpen className="w-4 h-4" />
              </button>
            )}
            <div>
              <h1 className={`text-sm font-semibold ${c.text}`}>{activeChat}</h1>
              <p className={`text-[11px] ${c.textFaint}`}>4 messages · 2 memory items referenced</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {/* Theme toggle */}
            <button
              onClick={() => setDarkMode(d => !d)}
              className={`w-8 h-8 flex items-center justify-center rounded-lg ${c.bgMuted} border ${c.border} ${c.textMuted} ${c.hoverMuted} transition-colors`}
              title={darkMode ? "Switch to light mode" : "Switch to dark mode"}
            >
              {darkMode ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
            </button>
            <button className={`w-8 h-8 flex items-center justify-center rounded-lg ${c.bgMuted} ${c.hoverMed} ${c.textMuted} transition-colors`}>
              <MoreHorizontal className="w-4 h-4" />
            </button>
            {!rightOpen && (
              <button onClick={() => setRightOpen(true)} className={`w-8 h-8 flex items-center justify-center rounded-lg ${c.textGhost} ${c.hoverMuted} transition-colors`}>
                <PanelRightOpen className="w-4 h-4" />
              </button>
            )}
          </div>
        </header>

        {/* Tabs */}
        <div className={`flex border-b ${c.border} ${c.tabBg} px-6`}>
          {[{ id:"chat", icon: MessageSquare, label:"Chat" }, { id:"memory", icon: BookOpen, label:"Memory" }, { id:"docs", icon: FileText, label:"Documents" }].map(t => (
            <button key={t.id} onClick={() => setActiveTab(t.id as typeof activeTab)}
              className={`flex items-center gap-1.5 px-4 py-2.5 text-xs font-medium border-b-2 transition-all ${activeTab === t.id ? c.tabActive : c.tabInactive}`}>
              <t.icon className="w-3.5 h-3.5" />{t.label}
            </button>
          ))}
        </div>

        {/* ── SEARCH NOTES RESULTS ── */}
        {activeTool === "Search Notes" ? (
          <div className="flex-1 overflow-y-auto px-6 py-5">
            <div className="flex items-center gap-3 mb-5">
              <div className={`flex-1 flex items-center gap-2.5 px-3.5 py-2.5 rounded-xl ${c.searchInput} border ${c.inputFocus} transition-colors`}>
                <Search className="w-4 h-4 text-amber-500 flex-shrink-0" />
                <input value={searchQuery} onChange={e => setSearchQuery(e.target.value)}
                  className={`flex-1 bg-transparent text-sm outline-none ${c.textMd} placeholder-opacity-40`}
                  placeholder="Search your notes and files..." />
                {searchQuery && <button onClick={() => setSearchQuery("")} className={`${c.textGhost} hover:${c.textMuted}`}><X className="w-3.5 h-3.5" /></button>}
              </div>
              <button className="px-3 py-2.5 rounded-xl bg-amber-500/10 border border-amber-400/30 text-amber-600 text-xs font-medium hover:bg-amber-500/20 transition-colors">Search</button>
            </div>

            <p className={`text-[11px] mb-4 ${c.textFaint}`}>
              About <span className={`font-semibold ${c.textBody}`}>4 results</span> for "{searchQuery}" in your memory
            </p>

            <div className="space-y-3">
              {SEARCH_RESULTS.map((r, i) => (
                <div key={i} className={`group rounded-xl border ${c.searchResult} transition-all p-4`}>
                  <div className="flex items-start gap-3 mb-2">
                    <div className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 mt-0.5 ${r.type === "image" ? "bg-violet-100" : r.type === "pdf" ? "bg-rose-100" : "bg-blue-100"}`}>
                      {r.type === "image"
                        ? <Image className="w-4 h-4 text-violet-500" />
                        : <FileText className={`w-4 h-4 ${r.type === "pdf" ? "text-rose-500" : "text-blue-500"}`} />}
                    </div>
                    <div className="flex-1 min-w-0">
                      <button className="text-left text-indigo-600 hover:text-indigo-500 hover:underline text-sm font-medium leading-snug transition-colors">{r.title}</button>
                      <p className={`text-[10px] mt-0.5 font-mono ${c.searchBreadcrumb}`}>{r.path}</p>
                    </div>
                    <div className={`flex-shrink-0 flex items-center gap-1.5 px-2 py-0.5 rounded-full ${c.bgMuted} border ${c.border}`}>
                      <div className={`w-1.5 h-1.5 rounded-full ${r.relevance >= 90 ? "bg-emerald-500" : r.relevance >= 70 ? "bg-amber-500" : "bg-slate-300"}`} />
                      <span className={`text-[10px] ${c.textFaint}`}>{r.relevance}%</span>
                    </div>
                  </div>
                  <p className={`text-[12px] leading-relaxed ml-11 mb-3 ${c.textBody}`}
                    dangerouslySetInnerHTML={{ __html: r.snippet.replace(/\*\*(.*?)\*\*/g, `<strong class="${c.textMd}">$1</strong>`).replace(/\*(.*?)\*/g, '<em>$1</em>') }} />
                  <div className="flex items-center gap-2 ml-11">
                    <span className={`text-[10px] ${c.textXs}`}>{r.meta}</span>
                    <div className={`w-px h-3 ${c.bgBrt} rounded`} />
                    <button className="flex items-center gap-1 text-[11px] text-indigo-600 hover:text-indigo-500 font-medium transition-colors">
                      <ExternalLink className="w-3 h-3" />Open file
                    </button>
                    <button className={`text-[11px] font-medium transition-colors ${c.textFaint} ${c.hoverMuted}`}>Reference in chat</button>
                  </div>
                </div>
              ))}
            </div>

            <div className={`mt-5 flex items-center gap-2 px-4 py-2.5 rounded-xl ${c.searchTipBg} border`}>
              <Layers className="w-3.5 h-3.5 text-amber-500 flex-shrink-0" />
              <p className={`text-[11px] ${c.searchTipText}`}>Click any result to open it in its original app, or use <span className={`font-semibold ${c.searchTipStrong}`}>Reference in chat</span> to pull it into your current message.</p>
            </div>
          </div>

        ) : (
          /* ── CHAT VIEW ── */
          <div className="flex-1 overflow-y-auto px-6 py-6 space-y-6">
            {/* Memory banner */}
            <div className={`flex items-center gap-2.5 px-4 py-2.5 rounded-xl ${c.memBannerBg} border`}>
              <Layers className="w-3.5 h-3.5 text-indigo-500 flex-shrink-0" />
              <p className={`text-xs ${c.memBannerText}`}>
                <span className={`font-semibold ${c.memBannerStrong}`}>2 memory items</span> loaded — PID Notes (Nov 12) and Lab Diagram (Nov 10)
              </p>
              <ChevronRight className={`w-3.5 h-3.5 ${c.memBannerArrow} ml-auto`} />
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
                  <div className={`rounded-2xl px-4 py-3 text-sm leading-relaxed ${msg.role === "user" ? c.userMsg : c.assistMsg}`}>
                    {msg.content.split("\n").map((line, i) => {
                      const html = line.replace(/\*\*(.*?)\*\*/g,"<strong>$1</strong>").replace(/\*(.*?)\*/g,"<em>$1</em>");
                      return <p key={i} className={line.startsWith("---") ? `border-t ${c.border} my-2` : line === "" ? "mb-1" : ""} dangerouslySetInnerHTML={{ __html: html }} />;
                    })}
                  </div>
                  <p className={`text-[10px] mt-1 ${c.textXs} ${msg.role === "user" ? "text-right" : "text-left"}`}>{msg.timestamp}</p>
                </div>
                {msg.role === "user" && (
                  <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-slate-500 to-slate-600 flex items-center justify-center flex-shrink-0 mt-0.5 text-xs font-semibold text-white">S</div>
                )}
              </div>
            ))}

            {/* Document generation card */}
            {activeTool === "Write Doc" ? (
              <div className="flex gap-3 justify-start">
                <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-indigo-500 to-violet-600 flex items-center justify-center flex-shrink-0 mt-0.5 shadow-md shadow-indigo-500/20">
                  <Sparkles className="w-3.5 h-3.5 text-white" />
                </div>
                <div className="flex-1 max-w-[85%]">
                  <div className={`rounded-2xl px-4 py-3 text-sm mb-3 leading-relaxed ${c.assistMsg}`}>
                    Sure — I'm writing your lab report now. I'll structure it across 6 sections based on your notes and uploaded diagram.
                  </div>
                  <div className={`rounded-2xl border ${c.docCard} overflow-hidden`}>
                    <div className={`px-4 py-3 ${c.docHeader} flex items-center gap-3`}>
                      <div className="w-9 h-9 rounded-xl bg-indigo-100 flex items-center justify-center flex-shrink-0">
                        <FileText className="w-4 h-4 text-indigo-600" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className={`text-sm font-semibold truncate ${c.text}`}>Lab Report — PID Control Systems</p>
                        <p className={`text-[10px] ${c.textFaint}`}>Engineering · DOCX · Writing section 4 of 6</p>
                      </div>
                      <div className="flex items-center gap-1.5 flex-shrink-0">
                        <Loader2 className="w-3.5 h-3.5 text-indigo-500 animate-spin" />
                        <span className="text-[10px] text-indigo-600 font-medium">Writing…</span>
                      </div>
                    </div>
                    <div className="px-4 pt-3 pb-1">
                      <div className="flex items-center justify-between mb-1.5">
                        <span className={`text-[10px] ${c.textFaint}`}>Overall progress</span>
                        <span className="text-[10px] text-indigo-600 font-semibold">58%</span>
                      </div>
                      <div className={`w-full h-1.5 ${c.vramTrack} rounded-full overflow-hidden`}>
                        <div className="h-full bg-gradient-to-r from-indigo-500 to-violet-500 rounded-full" style={{ width: "58%" }} />
                      </div>
                    </div>
                    <div className="px-4 py-3 grid grid-cols-2 gap-y-2 gap-x-4">
                      {DOC_SECTIONS.map(sec => (
                        <div key={sec.label} className={`flex items-center gap-2 ${sec.active ? "opacity-100" : sec.done ? "opacity-70" : "opacity-40"}`}>
                          {sec.done ? <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 flex-shrink-0" />
                            : sec.active ? <Loader2 className="w-3.5 h-3.5 text-indigo-500 animate-spin flex-shrink-0" />
                            : <Circle className={`w-3.5 h-3.5 flex-shrink-0 ${c.textGhost}`} />}
                          <span className={`text-[11px] truncate ${sec.active ? "text-indigo-600 font-medium" : sec.done ? c.textBody : c.textFaint}`}>{sec.label}</span>
                        </div>
                      ))}
                    </div>
                    <div className={`mx-4 mb-3 rounded-lg ${c.docPreview} border px-3 py-2.5`}>
                      <p className={`text-[10px] font-semibold uppercase tracking-wider mb-1.5 ${c.docPreviewLabel}`}>Preview — Experimental Setup</p>
                      <p className={`text-[11px] leading-relaxed font-mono ${c.docPreviewText}`}>
                        The experimental setup consisted of a DC servo motor connected to a rotary encoder providing position feedback at 1000 ppr. A dSPACE DS1104 controller board was used to implement the discrete-time PID algorithm at Ts = 1 ms. Gains were tuned using Ziegler–Nichols, yielding…
                        <span className="inline-block w-2 h-3.5 bg-indigo-500 ml-0.5 animate-pulse align-text-bottom rounded-sm" />
                      </p>
                    </div>
                    <div className="px-4 pb-4 flex items-center gap-2">
                      <button className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-medium transition-colors">
                        <ExternalLink className="w-3 h-3" />Open in Word
                      </button>
                      <button className={`flex items-center gap-1.5 px-3 py-2 rounded-xl ${c.bgMuted} ${c.hoverMed} ${c.textBody} text-xs font-medium border ${c.border} transition-colors`}>
                        <Download className="w-3 h-3" />Save PDF
                      </button>
                      <button className={`ml-auto text-[10px] ${c.textXs} transition-colors`}>Cancel</button>
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              /* Typing indicator */
              <div className="flex gap-3 justify-start">
                <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-indigo-500 to-violet-600 flex items-center justify-center flex-shrink-0 shadow-md shadow-indigo-500/20">
                  <Sparkles className="w-3.5 h-3.5 text-white" />
                </div>
                <div className={`${c.card} border ${c.border} rounded-2xl rounded-tl-sm px-4 py-3`}>
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
        <div className={`px-6 py-4 border-t ${c.border} ${c.inputAreaBg}`}>
          {/* Active tool badge */}
          {activeTool && (
            <div className="mb-3 flex items-center gap-2">
              <div className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-medium border ${activeTool === "Write Doc" ? "bg-indigo-50 border-indigo-200 text-indigo-700" : activeTool === "Calculator" ? "bg-emerald-50 border-emerald-200 text-emerald-700" : "bg-amber-50 border-amber-200 text-amber-700"}`}
                style={darkMode ? { background: activeTool === "Write Doc" ? "rgba(99,102,241,0.1)" : activeTool === "Calculator" ? "rgba(52,211,153,0.1)" : "rgba(251,191,36,0.1)", borderColor: activeTool === "Write Doc" ? "rgba(99,102,241,0.25)" : activeTool === "Calculator" ? "rgba(52,211,153,0.25)" : "rgba(251,191,36,0.25)", color: activeTool === "Write Doc" ? "#a5b4fc" : activeTool === "Calculator" ? "#6ee7b7" : "#fcd34d" } : {}}>
                {activeTool === "Write Doc" && <PenLine className="w-3 h-3" />}
                {activeTool === "Calculator" && <Calculator className="w-3 h-3" />}
                {activeTool === "Search Notes" && <Search className="w-3 h-3" />}
                {activeTool}
                <button onClick={() => setActiveTool(null)} className="ml-1 opacity-60 hover:opacity-100"><X className="w-3 h-3" /></button>
              </div>
              <span className={`text-[10px] ${c.textXs}`}>
                {activeTool === "Write Doc" && "Document editor active — result opens as a live card"}
                {activeTool === "Calculator" && "Floating calculator open — drag to reposition"}
                {activeTool === "Search Notes" && "Searching across your saved memory"}
              </span>
            </div>
          )}

          {/* Attachments */}
          {attachments.length > 0 && (
            <div className="mb-3 flex items-center gap-2 flex-wrap">
              {attachments.map(att => (
                <div key={att.name} className={`flex items-center gap-2 pl-2 pr-1.5 py-1.5 rounded-xl ${c.bgMuted} border ${c.border}`}>
                  <div className={`w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0 ${att.kind === "image" ? "bg-violet-100" : att.kind === "pdf" ? "bg-rose-100" : "bg-blue-100"}`}>
                    {att.kind === "image" && <Image className="w-3.5 h-3.5 text-violet-500" />}
                    {att.kind === "pdf"   && <FileText className="w-3.5 h-3.5 text-rose-500" />}
                    {att.kind === "doc"   && <FileText className="w-3.5 h-3.5 text-blue-500" />}
                  </div>
                  <div className="min-w-0">
                    <p className={`text-xs font-medium max-w-[140px] truncate ${c.textMd}`}>{att.name}</p>
                    <p className={`text-[10px] ${c.textXs}`}>{att.kind === "image" ? "Image · will be analysed" : att.kind === "pdf" ? "PDF · context for this message" : "Document"}</p>
                  </div>
                  <button onClick={() => setAttachments(a => a.filter(x => x.name !== att.name))} className={`ml-0.5 w-5 h-5 flex items-center justify-center rounded-md ${c.textGhost} ${c.hoverMuted} transition-colors`}>
                    <X className="w-3 h-3" />
                  </button>
                </div>
              ))}
            </div>
          )}

          {/* Tools popover */}
          {toolsOpen && (
            <div className={`mb-3 p-2 rounded-2xl ${c.card} border ${c.borderMd} grid grid-cols-3 gap-1`}>
              {[
                { id:"Write Doc",    icon: PenLine,    label:"Write Doc",    desc:"Write & edit docs",     colorClass:"text-indigo-600", bgClass:"bg-indigo-50 border-indigo-200/80" },
                { id:"Calculator",   icon: Calculator, label:"Calculator",   desc:"School-specific calc",  colorClass:"text-emerald-600", bgClass:"bg-emerald-50 border-emerald-200/80" },
                { id:"Search Notes", icon: Search,     label:"Search Notes", desc:"Search your memory",   colorClass:"text-amber-600",   bgClass:"bg-amber-50 border-amber-200/80" },
              ].map(tool => (
                <button key={tool.id} onClick={() => pickTool(tool.id)}
                  className={`flex flex-col items-center gap-1.5 p-3 rounded-xl border transition-all hover:scale-[1.02] ${activeTool === tool.id ? `${tool.bgClass}` : `${c.border} ${c.hoverSub}`}`}>
                  <tool.icon className={`w-5 h-5 ${tool.colorClass}`} style={darkMode ? { color: tool.id === "Write Doc" ? "#a5b4fc" : tool.id === "Calculator" ? "#6ee7b7" : "#fcd34d" } : {}} />
                  <span className={`text-[11px] font-semibold ${c.textMd}`}>{tool.label}</span>
                  <span className={`text-[9px] ${c.textFaint} text-center leading-tight`}>{tool.desc}</span>
                </button>
              ))}
            </div>
          )}

          <div className="flex items-end gap-3">
            <button onClick={() => setToolsOpen(o => !o)}
              className={`w-9 h-9 flex items-center justify-center rounded-xl border transition-all flex-shrink-0 mb-0.5 ${toolsOpen ? `${c.bgMed} ${c.borderBrt} ${c.textBody}` : `${c.bgMuted} ${c.border} ${c.textMuted} ${c.hoverMuted}`}`}>
              {toolsOpen ? <ChevronUp className="w-4 h-4" /> : <Plus className="w-4 h-4" />}
            </button>
            <div className={`flex-1 flex flex-col rounded-2xl ${c.inputWrap} border ${c.borderMd} ${c.inputFocus} transition-colors overflow-hidden`}>
              <textarea rows={2} value={input} onChange={e => setInput(e.target.value)}
                placeholder={activeTool === "Write Doc" ? "Describe the document you want written..." : activeTool === "Calculator" ? "Type a calculation or use the floating calculator..." : activeTool === "Search Notes" ? "Type to search your notes and files..." : "Ask anything, attach images or PDFs..."}
                className={`flex-1 bg-transparent text-sm resize-none outline-none leading-relaxed px-4 pt-3 pb-1 ${c.textMd} placeholder:${c.textGhost}`} />
              <div className="flex items-center gap-1 px-3 pb-2">
                {[Paperclip, Image, Mic].map((Icon, i) => (
                  <button key={i} className={`w-7 h-7 flex items-center justify-center rounded-lg ${c.textGhost} ${c.hoverMuted} transition-colors`}><Icon className="w-3.5 h-3.5" /></button>
                ))}
              </div>
            </div>
            <button className="w-10 h-10 flex items-center justify-center rounded-xl bg-indigo-600 hover:bg-indigo-500 transition-colors shadow-md shadow-indigo-500/20 flex-shrink-0 mb-0.5">
              <Send className="w-4 h-4 text-white" />
            </button>
          </div>
          <p className={`text-[10px] mt-2.5 px-1 ${c.textGhost}`}>All processing is done locally · No internet needed</p>
        </div>
      </main>

      {/* ══ RIGHT PANEL ══ */}
      <aside className={`flex-shrink-0 ${c.panel} border-l ${c.border} flex flex-col transition-all duration-300 ease-in-out overflow-hidden ${rightOpen ? "w-72" : "w-12"}`}>
        {rightOpen ? (
          <>
            <div className={`px-4 py-4 border-b ${c.border} flex items-center justify-between`}>
              <div>
                <h2 className={`text-xs font-semibold uppercase tracking-wider ${c.textBody}`}>Context</h2>
                <p className={`text-[11px] mt-0.5 ${c.textFaint}`}>Memory items feeding this chat</p>
              </div>
              <button onClick={() => setRightOpen(false)} className={`w-7 h-7 flex items-center justify-center rounded-lg ${c.textGhost} ${c.hoverMuted} transition-colors`}>
                <PanelRightClose className="w-4 h-4" />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto p-4 space-y-3">
              {[
                { icon: FileText, label: "PID Control Notes", date: "Nov 12", colorIcon: "text-blue-500",   bg: "bg-blue-100",   desc: "12 pages · Lecture notes from ME301" },
                { icon: Image,    label: "Lab Diagram — Servo", date: "Nov 10", colorIcon: "text-violet-500", bg: "bg-violet-100", desc: "Whiteboard photo · Feedback loop diagram" },
              ].map(item => (
                <div key={item.label} className={`rounded-xl ${c.bgSub} border ${c.border} p-3`}>
                  <div className="flex items-start gap-2.5">
                    <div className={`w-7 h-7 rounded-lg ${item.bg} flex items-center justify-center flex-shrink-0`}>
                      <item.icon className={`w-3.5 h-3.5 ${item.colorIcon}`} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className={`text-xs font-medium truncate ${c.textMd}`}>{item.label}</p>
                      <p className={`text-[10px] mt-0.5 ${c.textFaint}`}>{item.desc}</p>
                      <p className={`text-[10px] mt-1 ${c.textXs}`}>{item.date}</p>
                    </div>
                    <button className={`${c.textGhost} transition-colors`}><X className="w-3.5 h-3.5" /></button>
                  </div>
                </div>
              ))}
              <div className="mt-2">
                <p className={`text-[10px] uppercase tracking-widest font-semibold mb-2 ${c.textFaint}`}>Generated Documents</p>
                {[{ label:"Lab Report — PID Control", format:"DOCX", date:"Now" }, { label:"Summary — Thermodynamics", format:"PDF", date:"Yesterday" }].map(doc => (
                  <div key={doc.label} className={`flex items-center gap-2.5 py-2.5 border-b ${c.border}`}>
                    <div className="w-7 h-7 rounded-lg bg-emerald-100 flex items-center justify-center">
                      <FileText className="w-3.5 h-3.5 text-emerald-600" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className={`text-xs truncate ${c.textBody}`}>{doc.label}</p>
                      <p className={`text-[10px] ${c.textXs}`}>{doc.format} · {doc.date}</p>
                    </div>
                    <button className={`${c.textGhost} transition-colors`}><Download className="w-3.5 h-3.5" /></button>
                  </div>
                ))}
              </div>
              <button className={`w-full mt-2 flex items-center justify-center gap-2 py-2.5 rounded-xl border border-dashed ${c.borderBrt} text-xs ${c.textFaint} ${c.hoverSub} transition-colors`}>
                <Plus className="w-3.5 h-3.5" />Add files to memory
              </button>
            </div>
            <div className={`px-4 py-4 border-t ${c.border} space-y-2.5`}>
              {[
                { label:"Model",  value:"Llama 3.1 8B",    color:"text-indigo-600" },
                { label:"Vision", value:"Moondream2",       color:"text-violet-600" },
                { label:"Memory", value:"ChromaDB · Local", color:"text-emerald-600" },
              ].map(row => (
                <div key={row.label} className="flex items-center justify-between">
                  <span className={`text-[10px] font-medium ${c.textFaint}`}>{row.label}</span>
                  <span className={`text-[10px] font-semibold ${darkMode ? row.color.replace("-600","-400") : row.color}`}>{row.value}</span>
                </div>
              ))}
              <div className="flex items-center justify-between">
                <span className={`text-[10px] font-medium ${c.textFaint}`}>Status</span>
                <div className="flex items-center gap-1.5">
                  <div className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                  <span className={`text-[10px] font-semibold ${darkMode ? "text-emerald-400" : "text-emerald-600"}`}>Fully Offline</span>
                </div>
              </div>
            </div>
          </>
        ) : (
          <div className="flex flex-col items-center py-3 gap-3 h-full cursor-pointer group" onClick={() => setRightOpen(true)}>
            <button className={`w-8 h-8 flex items-center justify-center rounded-lg ${c.textGhost} ${c.hoverMuted} transition-colors`} onClick={e => { e.stopPropagation(); setRightOpen(true); }}>
              <PanelRightOpen className="w-4 h-4" />
            </button>
            <div className={`w-6 h-px ${c.dot} rounded`} />
            <div className={`w-8 h-8 rounded-lg ${c.bgMuted} flex items-center justify-center`}>
              <Layers className={`w-3.5 h-3.5 ${c.textGhost}`} />
            </div>
            <div className={`w-6 h-px ${c.dot} rounded`} />
            <div className="flex flex-col items-center gap-2">
              {[FileText, Image, BookOpen].map((Icon, i) => (
                <div key={i} className={`w-7 h-7 flex items-center justify-center rounded-lg ${c.textGhost} transition-colors`}><Icon className="w-3.5 h-3.5" /></div>
              ))}
            </div>
            <div className="mt-auto mb-2">
              <div className="w-1.5 h-1.5 rounded-full bg-emerald-500" title="Fully Offline" />
            </div>
          </div>
        )}
      </aside>

      {/* ══ FLOATING CALCULATOR ══ */}
      {activeTool === "Calculator" && (
        <div
          className={`absolute z-50 rounded-2xl ${c.calcBg} border ${c.borderMd} shadow-2xl shadow-black/20 flex flex-col overflow-hidden select-none`}
          style={{ left: calcPos.x, top: calcPos.y, width: calcSize.w, height: calcSize.h }}
        >
          <div className={`flex items-center justify-between px-3 py-2.5 border-b ${c.border} ${c.calcHeader} cursor-grab active:cursor-grabbing`} onMouseDown={startDrag}>
            <div className="flex items-center gap-2">
              <GripHorizontal className={`w-3.5 h-3.5 ${c.gripColor}`} />
              <span className={`text-xs font-semibold ${c.textBody}`}>Calculator</span>
              <span className={`text-[10px] font-medium ${school.color} opacity-80`}>· {school.label}</span>
            </div>
            <div className="flex items-center gap-1">
              <button onClick={() => setCalcDisplay("0")} className={`w-6 h-6 flex items-center justify-center rounded-md ${c.textGhost} ${c.hoverMuted} transition-colors`}><Minimize2 className="w-3 h-3" /></button>
              <button onClick={() => setActiveTool(null)} className={`w-6 h-6 flex items-center justify-center rounded-md ${c.textGhost} ${c.hoverMuted} transition-colors`}><X className="w-3 h-3" /></button>
            </div>
          </div>

          {/* School tabs */}
          <div className={`flex gap-1 px-2 py-2 border-b ${c.border} overflow-x-auto`}>
            {CALC_SCHOOLS.map(s => (
              <button key={s.id} onClick={() => { setCalcSchool(s.id); setCalcDisplay("0"); }}
                className={`flex items-center gap-1 px-2.5 py-1 rounded-lg text-[10px] font-semibold whitespace-nowrap transition-all flex-shrink-0 ${calcSchool === s.id ? `${s.color} ${c.bgMuted} border ${c.border}` : `${c.textFaint} ${c.hoverSub}`}`}>
                <s.icon className="w-3 h-3" />{s.short}
              </button>
            ))}
          </div>

          {/* Display */}
          <div className="px-3 pt-3 pb-2">
            <div className={`rounded-xl ${c.calcDisplay} border ${c.border} px-4 py-3 text-right`}>
              <p className={`text-[10px] uppercase tracking-wider font-semibold mb-1 ${c.textFaint}`}>{school.label}</p>
              <p className={`text-2xl font-mono font-light truncate ${c.text}`}>{calcDisplay}</p>
            </div>
          </div>

          {/* Keys */}
          <div className="flex-1 px-3 pb-3 overflow-y-auto">
            <div className="space-y-1.5 h-full flex flex-col justify-end">
              {school.rows.map((row, ri) => (
                <div key={ri} className="grid gap-1.5" style={{ gridTemplateColumns: `repeat(${row.length}, 1fr)` }}>
                  {row.map(key => (
                    <button key={key} onClick={() => onCalcKey(key)} className={`h-9 flex items-center justify-center transition-all active:scale-95 ${keyClass(key)}`}>{key}</button>
                  ))}
                </div>
              ))}
            </div>
          </div>

          {/* Resize handle */}
          <div className="absolute bottom-0 right-0 w-5 h-5 cursor-se-resize flex items-end justify-end pb-1 pr-1" onMouseDown={startResize}>
            <svg width="8" height="8" viewBox="0 0 8 8" className={c.resizeColor}>
              <path d="M8 0 L8 8 L0 8" stroke="currentColor" strokeWidth="1.5" fill="none" />
              <path d="M8 4 L8 8 L4 8" stroke="currentColor" strokeWidth="1.5" fill="none" />
            </svg>
          </div>
        </div>
      )}
    </div>
  );
}
