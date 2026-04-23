import { useState, useRef, useEffect, useCallback, useMemo } from "react";
import {
  api,
  API_BASE,
  type ApiSession,
  type ApiStorageInfo,
  type ApiModelStorageInfo,
  type ApiMemoryItem,
  type ApiSearchHit,
  type ApiDocument,
  type ApiLLMConfig,
  type ApiLLMStatus,
} from "./api";
import {
  GraduationCap, Send, FileText, Image, BookOpen, Settings,
  ChevronRight, Paperclip, MoreHorizontal, WifiOff, Download,
  MessageSquare, X, Plus, Mic, AudioLines, Layers,
  PanelLeftClose, PanelLeftOpen, PanelRightClose, PanelRightOpen,
  PenLine, Calculator, ChevronUp, Search,
  ExternalLink, CheckCircle2, Circle, Loader2,
  FlaskConical, TrendingUp, Scale, Stethoscope, BarChart2,
  GripHorizontal, Minimize2, Sun, Moon, ZoomIn, ZoomOut,
  User as UserIcon, Camera, Trash2, Pencil, Sparkles, Keyboard, Check,
  HardDrive, Usb, Phone, MessageCircle, Heart,
} from "lucide-react";

type UserProfile = { name: string; career: string; avatar: string | null };
const PROFILE_STORAGE_KEY = "student-ai-user-profile";
const DEFAULT_PROFILE: UserProfile = { name: "Student", career: "", avatar: null };
const CAREER_SUGGESTIONS = [
  "Engineering Student", "Medical Student", "Law Student", "Business Student",
  "Computer Science Student", "Humanities Student", "Statistics / Data Student",
  "High School Student", "PhD Researcher",
];

function getInitials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "S";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

/* ─────────────── Types ─────────────── */
type Message = { id: number; role: "user" | "assistant"; content: string; timestamp: string };
type Attachment = { name: string; kind: "image" | "pdf" | "doc"; id?: string };

const CALC_SCHOOLS = [
  { id: "engineering", label: "Engineering", short: "Sci", icon: FlaskConical, color: "text-indigo-500", rows: [["sin","cos","tan","π"],["log","ln","√","x²"],["(",")","%","÷"],["7","8","9","×"],["4","5","6","−"],["1","2","3","+"],["±","0",".","="]] },
  { id: "business",    label: "Business",    short: "Fin", icon: TrendingUp,   color: "text-emerald-600", rows: [["PV","FV","PMT","n"],["i%","NPV","IRR","%"],["(",")",  "CE","÷"],["7","8","9","×"],["4","5","6","−"],["1","2","3","+"],["±","0",".","="]] },
  { id: "humanities",  label: "Humanities",  short: "Std", icon: BookOpen,     color: "text-amber-600",  rows: [["Day↔","Yr↔","°C↔F","%"],["(",")",  "CE","÷"],["7","8","9","×"],["4","5","6","−"],["1","2","3","+"],["±","0",".","="]] },
  { id: "law",         label: "Law",         short: "Leg", icon: Scale,        color: "text-violet-600", rows: [["hr×$","days","VAT","%"],["(",")",  "CE","÷"],["7","8","9","×"],["4","5","6","−"],["1","2","3","+"],["±","0",".","="]] },
  { id: "medicine",    label: "Medicine",    short: "Med", icon: Stethoscope,  color: "text-rose-600",   rows: [["mg/kg","BSA","BMI","CrCl"],["(",")",  "CE","÷"],["7","8","9","×"],["4","5","6","−"],["1","2","3","+"],["±","0",".","="]] },
  { id: "statistics",  label: "Statistics",  short: "Stat",icon: BarChart2,    color: "text-cyan-600",   rows: [["σ","μ","r²","P(x)"],["∑","n!","Cₙᵣ","%"],["(",")",  "CE","÷"],["7","8","9","×"],["4","5","6","−"],["1","2","3","+"],["±","0",".","="]] },
];

type Session = { id: string; label: string; time: string };

const SUGGESTIONS = [
  { icon: "📘", title: "Explain a concept", subtitle: "Break down a topic step by step" },
  { icon: "📝", title: "Write a lab report", subtitle: "Drafted from your notes & uploads" },
  { icon: "🧮", title: "Solve a problem", subtitle: "Show your working with formulas" },
  { icon: "🎯", title: "Quiz me", subtitle: "Test what you've studied so far" },
];

const SHORTCUTS: { keys: string; label: string }[] = [
  { keys: "Ctrl + N", label: "Start a new chat" },
  { keys: "Ctrl + K", label: "Search your memory" },
  { keys: "Ctrl + ,", label: "Open settings" },
  { keys: "Ctrl + +", label: "Increase text & UI size" },
  { keys: "Ctrl + −", label: "Decrease text & UI size" },
  { keys: "Ctrl + 0", label: "Reset size to 100%" },
  { keys: "?",        label: "Show this shortcuts list" },
  { keys: "Esc",      label: "Close any open dialog" },
];

/* ─────────────── Theme palette ─────────────── */
function makeTheme(dark: boolean) {
  if (dark) return {
    root:         "bg-[#1b1815] text-white",
    sidebar:      "bg-[#221e1a]",
    panel:        "bg-[#221e1a]",
    card:         "bg-[#2b2622]",
    inputWrap:    "bg-[#2b2622]",
    calcBg:       "bg-[#221e1a]",
    calcHeader:   "bg-[#2b2622]",
    calcDisplay:  "bg-[#1b1815]",
    headerBg:     "bg-[#1b1815]",
    tabBg:        "bg-[#1b1815]",
    inputAreaBg:  "bg-[#1b1815]",

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
    assistMsg:       "bg-[#2b2622] text-white/85 border border-white/[0.06] rounded-tl-sm",
    tabActive:       "border-indigo-500 text-white",
    tabInactive:     "border-transparent text-white/40 hover:text-white/60",
    vramTrack:       "bg-white/[0.06]",
    searchResult:    "border-white/[0.06] hover:border-white/[0.12] bg-white/[0.015] hover:bg-white/[0.03]",
    searchBreadcrumb:"text-emerald-500/70",
    searchInput:     "bg-[#2b2622] border-white/[0.1]",
    searchTipBg:     "bg-amber-500/[0.06] border-amber-500/15",
    searchTipText:   "text-amber-300/60",
    searchTipStrong: "text-amber-300/80",
    docCard:         "border-indigo-500/25 bg-[#2b2622]",
    docHeader:       "bg-indigo-500/[0.07] border-b border-indigo-500/15",
    docPreview:      "bg-[#1b1815] border-white/[0.05]",
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
  const [sidebarOpen, setSidebarOpen] = useState<boolean>(() => {
    if (typeof window === "undefined") return true;
    const v = window.localStorage.getItem("student-ai-sidebar-open");
    return v === null ? true : v === "1";
  });
  useEffect(() => {
    try { window.localStorage.setItem("student-ai-sidebar-open", sidebarOpen ? "1" : "0"); } catch {}
  }, [sidebarOpen]);
  const [activeChat, setActiveChat] = useState("New Chat");
  const [toolsOpen, setToolsOpen] = useState(false);
  const [activeTool, setActiveTool] = useState<string | null>(null);
  const [rightOpen, setRightOpen] = useState<boolean>(() => {
    if (typeof window === "undefined") return true;
    const v = window.localStorage.getItem("student-ai-right-open");
    return v === null ? true : v === "1";
  });
  useEffect(() => {
    try { window.localStorage.setItem("student-ai-right-open", rightOpen ? "1" : "0"); } catch {}
  }, [rightOpen]);
  const [attachments, setAttachments] = useState<Attachment[]>([]);
  const [searchQuery, setSearchQuery] = useState("");

  /* Calculator */
  const [calcSchool, setCalcSchool] = useState("engineering");
  const [calcDisplay, setCalcDisplay] = useState("0");
  const [calcPos, setCalcPos] = useState({ x: 320, y: 80 });
  const [calcSize, setCalcSize] = useState({ w: 310, h: 490 });
  const [uiScale, setUiScale] = useState(0.9);

  /* User profile */
  const [profile, setProfile] = useState<UserProfile>(() => {
    if (typeof window === "undefined") return DEFAULT_PROFILE;
    try {
      const raw = window.localStorage.getItem(PROFILE_STORAGE_KEY);
      if (!raw) return DEFAULT_PROFILE;
      const parsed = JSON.parse(raw);
      return {
        name: typeof parsed.name === "string" ? parsed.name : DEFAULT_PROFILE.name,
        career: typeof parsed.career === "string" ? parsed.career : DEFAULT_PROFILE.career,
        avatar: typeof parsed.avatar === "string" ? parsed.avatar : null,
      };
    } catch { return DEFAULT_PROFILE; }
  });
  const [profileOpen, setProfileOpen] = useState(false);
  const [profileDraft, setProfileDraft] = useState<UserProfile>(profile);
  const avatarFileRef = useRef<HTMLInputElement>(null);
  useEffect(() => {
    try { window.localStorage.setItem(PROFILE_STORAGE_KEY, JSON.stringify(profile)); } catch {}
  }, [profile]);
  const openProfile = () => { setProfileDraft(profile); setProfileOpen(true); };
  const closeProfile = () => setProfileOpen(false);
  const saveProfile = async () => {
    const next: UserProfile = {
      name: profileDraft.name.trim() || DEFAULT_PROFILE.name,
      career: profileDraft.career.trim(),
      avatar: profileDraft.avatar,
    };
    setProfile(next);
    setProfileOpen(false);
    try { await api.putProfile(next); } catch { /* offline — localStorage already cached it */ }
  };
  const handleAvatarFile = (file: File | null) => {
    if (!file) return;
    if (!file.type.startsWith("image/")) return;
    const reader = new FileReader();
    reader.onload = () => setProfileDraft(d => ({ ...d, avatar: typeof reader.result === "string" ? reader.result : d.avatar }));
    reader.readAsDataURL(file);
  };
  const userInitials = getInitials(profile.name);

  /* Sessions (backend-backed) */
  const [sessions, setSessions] = useState<Session[]>([]);
  const [editingSessionId, setEditingSessionId] = useState<string | null>(null);
  const [editingSessionDraft, setEditingSessionDraft] = useState("");
  const [pendingDeleteId, setPendingDeleteId] = useState<string | null>(null);
  const startRenameSession = (s: Session) => { setEditingSessionId(s.id); setEditingSessionDraft(s.label); };
  const commitRenameSession = async () => {
    if (!editingSessionId) return;
    const next = editingSessionDraft.trim();
    const id = editingSessionId;
    setEditingSessionId(null);
    if (!next) return;
    setSessions(prev => prev.map(s => s.id === id ? { ...s, label: next } : s));
    if (currentSessionId === id) setActiveChat(next);
    try { await api.renameSession(id, next); } catch (err) { reportError(err); }
  };
  const deleteSession = async (id: string) => {
    const wasActive = id === currentSessionId;
    setSessions(prev => prev.filter(s => s.id !== id));
    setPendingDeleteId(null);
    try { await api.deleteSession(id); } catch (err) { reportError(err); }
    const fresh = await refreshSessions();
    if (wasActive) {
      if (fresh.length > 0) {
        await selectRemoteSession(fresh[0] as Session);
      } else {
        setCurrentSessionId(null);
        setActiveChat("New Chat");
        setMessages([]);
        setIsEmptyChat(true);
      }
    }
  };
  const startNewChat = async () => {
    setActiveTool(null);
    setActiveTab("chat");
    setSearchResults(null);
    setCurrentDoc(null);
    setMessages([]);
    setIsEmptyChat(true);
    try {
      const created = await api.createSession("New Chat");
      setSessions(prev => [created as Session, ...prev.filter(s => s.id !== created.id)]);
      setCurrentSessionId(created.id);
      setActiveChat(created.label);
    } catch (err) {
      reportError(err);
      setActiveChat("New Chat");
    }
  };

  /* Empty / first-run chat & thinking state */
  const [isEmptyChat, setIsEmptyChat] = useState(true);
  const [isThinking, setIsThinking] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement | null>(null);
  const chatScrollRef = useRef<HTMLDivElement | null>(null);
  const consecutiveFailuresRef = useRef(0);


  /* ─── Backend wiring (local Python FastAPI on http://localhost:8000) ─── */
  const [messages, setMessages] = useState<Message[]>([]);
  useEffect(() => {
    const el = chatScrollRef.current;
    if (!el) return;
    el.scrollTo({ top: el.scrollHeight, behavior: "smooth" });
  }, [messages, isThinking, /* re-scroll on doc gen too */]);
  const [backendError, setBackendError] = useState<string | null>(null);
  const [backendOnline, setBackendOnline] = useState<boolean>(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [currentSessionId, setCurrentSessionId] = useState<string | null>(null);

  const [memoryItems, setMemoryItems] = useState<ApiMemoryItem[]>([]);
  const [documents, setDocuments] = useState<ApiDocument[]>([]);

  const [searchResults, setSearchResults] = useState<ApiSearchHit[] | null>(null);
  const [searchLoading, setSearchLoading] = useState(false);

  const [currentDoc, setCurrentDoc] = useState<ApiDocument | null>(null);
  const [docGenerating, setDocGenerating] = useState(false);

  const nowStamp = () =>
    new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });

  const reportError = (err: unknown) => {
    const msg = err instanceof Error ? err.message : String(err);
    setBackendError(msg);
    setBackendOnline(false);
  };

  /* ── Load sessions / memory / documents on mount ── */
  const refreshSessions = useCallback(async () => {
    try {
      const list = await api.listSessions();
      setSessions(list as Session[]);
      setBackendOnline(true);
      setBackendError(null);
      return list;
    } catch (err) {
      reportError(err);
      return [] as ApiSession[];
    }
  }, []);

  const refreshMemory = useCallback(async () => {
    try {
      setMemoryItems(await api.listMemory());
    } catch (err) { reportError(err); }
  }, []);

  const refreshDocuments = useCallback(async () => {
    try {
      setDocuments(await api.listDocuments());
    } catch (err) { reportError(err); }
  }, []);

  useEffect(() => {
    (async () => {
      const list = await refreshSessions();
      await refreshMemory();
      await refreshDocuments();
      try {
        const p = await api.getProfile();
        const isDefault = (!p.name || p.name === DEFAULT_PROFILE.name) && !p.career && !p.avatar;
        if (!isDefault) setProfile({ name: p.name, career: p.career, avatar: p.avatar });
      } catch { /* offline — keep localStorage profile */ }
      if (list.length > 0) {
        const first = list[0];
        setCurrentSessionId(first.id);
        setActiveChat(first.label);
        try {
          const msgs = await api.getMessages(first.id);
          if (msgs.length > 0) {
            setMessages(msgs.map((m, i) => ({
              id: i + 1, role: m.role, content: m.content, timestamp: nowStamp(),
            })));
            setIsEmptyChat(false);
          } else {
            setIsEmptyChat(true);
          }
        } catch (err) { reportError(err); }
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  /* ── Load messages when active session changes ── */
  async function selectRemoteSession(s: Session) {
    setCurrentSessionId(s.id);
    setActiveChat(s.label);
    setActiveTool(null);
    setSearchResults(null);
    setCurrentDoc(null);
    try {
      const msgs = await api.getMessages(s.id);
      if (msgs.length === 0) {
        setMessages([]);
        setIsEmptyChat(true);
      } else {
        setMessages(msgs.map((m, i) => ({
          id: i + 1, role: m.role, content: m.content, timestamp: nowStamp(),
        })));
        setIsEmptyChat(false);
      }
    } catch (err) { reportError(err); }
  }

  /* ── Send a chat message (or generate a doc when Write Doc is active) ── */
  async function sendToBackend(text: string) {
    const trimmed = text.trim();
    if (!trimmed) return;

    if (activeTool === "Write Doc") {
      await generateDoc(trimmed);
      return;
    }

    const userMsg: Message = {
      id: Date.now(), role: "user", content: trimmed, timestamp: nowStamp(),
    };
    const wasFirstMessage = isEmptyChat;
    setMessages(prev => [...prev, userMsg]);
    setInput("");
    setIsEmptyChat(false);
    setIsThinking(true);
    setBackendError(null);
    if (wasFirstMessage) {
      setSidebarOpen(false);
      setRightOpen(false);
    }

    const imageIds = attachments
      .filter(a => a.kind === "image" && !!a.id)
      .map(a => a.id as string);

    try {
      const data = await api.chat(trimmed, currentSessionId, imageIds);
      setBackendOnline(true);
      consecutiveFailuresRef.current = 0;
      setMessages(prev => [
        ...prev,
        { id: Date.now() + 1, role: "assistant", content: data.reply, timestamp: data.timestamp ?? nowStamp() },
      ]);
      setAttachments([]); // clear after a successful send so they're not reused
      if (!currentSessionId) setCurrentSessionId(data.session_id);
      refreshSessions();
    } catch (err) {
      reportError(err);
      consecutiveFailuresRef.current += 1;
      const fails = consecutiveFailuresRef.current;
      const message =
        fails === 1
          ? "Something went wrong on my end. Please try again in a moment."
          : fails === 2
          ? "Still having trouble responding. Give it one more try in a few seconds."
          : "I'm not able to respond right now. The app is trying to recover in the background — please try again shortly.";
      setMessages(prev => [
        ...prev,
        {
          id: Date.now() + 1, role: "assistant",
          content: message,
          timestamp: nowStamp(),
        },
      ]);
    } finally {
      setIsThinking(false);
    }
  }

  /* ── Document generation via Write Doc tool ── */
  async function generateDoc(prompt: string, format: "docx" | "pdf" = "docx") {
    setInput("");
    setIsEmptyChat(false);
    setDocGenerating(true);
    setCurrentDoc(null);
    setBackendError(null);

    setMessages(prev => [
      ...prev,
      { id: Date.now(), role: "user", content: `[Write Doc] ${prompt}`, timestamp: nowStamp() },
    ]);

    try {
      const doc = await api.generateDocument(prompt, {
        format, session_id: currentSessionId,
      });
      setBackendOnline(true);
      setCurrentDoc(doc);
      setMessages(prev => [
        ...prev,
        {
          id: Date.now() + 1, role: "assistant",
          content: `Generated **${doc.title}** — ${doc.format.toUpperCase()} · ${Math.round(doc.size_bytes / 1024)} KB.\nClick **Open in Word** or **Save PDF** below to download.`,
          timestamp: nowStamp(),
        },
      ]);
      refreshDocuments();
    } catch (err) {
      reportError(err);
      setMessages(prev => [
        ...prev,
        {
          id: Date.now() + 1, role: "assistant",
          content:
            "I couldn't put your document together right now. " +
            "Please try again in a moment — if it still doesn't work, close and reopen the app.",
          timestamp: nowStamp(),
        },
      ]);
    } finally {
      setDocGenerating(false);
    }
  }

  /* ── Memory uploads ── */
  async function uploadPdfToBackend(file: File) {
    setBackendError(null);
    try {
      const item = await api.uploadFile(file);
      setBackendOnline(true);
      await refreshMemory();
      // Stage as an attachment for the next chat send so the router can
      // hand images to the vision specialist automatically.
      setAttachments(prev => [
        ...prev,
        { name: item.filename, kind: item.kind, id: item.id },
      ]);
      setMessages(prev => [
        ...prev,
        {
          id: Date.now(), role: "assistant",
          content:
            `Added **${item.filename}** to your local memory ` +
            `(${Math.round(item.size_bytes / 1024)} KB). I can now reference it in our chat.`,
          timestamp: nowStamp(),
        },
      ]);
    } catch (err) { reportError(err); }
  }

  async function removeMemoryItem(id: string) {
    try {
      await api.deleteMemory(id);
      await refreshMemory();
    } catch (err) { reportError(err); }
  }

  /* ── Search (debounced) ── */
  useEffect(() => {
    if (activeTool !== "Search Notes") { setSearchResults(null); return; }
    const q = searchQuery.trim();
    if (!q) { setSearchResults([]); return; }
    setSearchLoading(true);
    const t = window.setTimeout(async () => {
      try {
        const out = await api.search(q);
        setSearchResults(out.results);
        setBackendOnline(true);
      } catch (err) {
        reportError(err);
        setSearchResults([]);
      } finally {
        setSearchLoading(false);
      }
    }, 250);
    return () => window.clearTimeout(t);
  }, [searchQuery, activeTool]);

  const sendSuggestion = (text: string) => {
    setIsEmptyChat(false);
    setInput("");
    setIsThinking(true);
    window.setTimeout(() => setIsThinking(false), 2200);
  };

  /* Settings & shortcuts help */
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [contactOpen, setContactOpen] = useState(false);
  const [storage, setStorage] = useState<ApiStorageInfo | null>(null);
  const [storageLoading, setStorageLoading] = useState(false);
  const [modelStorage, setModelStorage] = useState<ApiModelStorageInfo | null>(null);
  const [modelStorageLoading, setModelStorageLoading] = useState(false);
  const [customModelPath, setCustomModelPath] = useState<string>(() => {
    try { return localStorage.getItem("custom-model-path") || ""; }
    catch { return ""; }
  });
  const [customModelPathInput, setCustomModelPathInput] = useState(customModelPath);
  const refreshStorage = useCallback(async () => {
    setStorageLoading(true);
    try { setStorage(await api.getStorage()); }
    catch { setStorage(null); }
    finally { setStorageLoading(false); }
  }, []);
  const refreshModelStorage = useCallback(async () => {
    setModelStorageLoading(true);
    try { setModelStorage(await api.getModelStorage()); }
    catch { setModelStorage(null); }
    finally { setModelStorageLoading(false); }
  }, []);

  const handleSaveCustomModelPath = useCallback(async () => {
    try {
      localStorage.setItem("custom-model-path", customModelPathInput);
      setCustomModelPath(customModelPathInput);
      if (customModelPathInput.trim()) {
        await api.setCustomModelPath(customModelPathInput.trim());
      }
      await refreshModelStorage();
    } catch (e) {
      console.error("Failed to save custom model path:", e);
    }
  }, [customModelPathInput]);

  /* LLM Configuration */
  const [llmConfig, setLlmConfig] = useState<ApiLLMConfig | null>(null);
  const [llmStatus, setLlmStatus] = useState<ApiLLMStatus | null>(null);
  const [llmLoading, setLlmLoading] = useState(false);
  const [llmTesting, setLlmTesting] = useState(false);
  const [llmTestMsg, setLlmTestMsg] = useState<string>("");
  const [showLLMAdvanced, setShowLLMAdvanced] = useState(false);

  const refreshLLMStatus = useCallback(async () => {
    setLlmLoading(true);
    try { setLlmStatus(await api.getLLMStatus()); }
    catch { setLlmStatus(null); }
    finally { setLlmLoading(false); }
  }, []);

  const refreshLLMConfig = useCallback(async () => {
    try { setLlmConfig(await api.getLLMConfig()); }
    catch { setLlmConfig(null); }
  }, []);

  const handleTestLLM = useCallback(async () => {
    if (!llmConfig) return;
    setLlmTesting(true);
    setLlmTestMsg("");
    try {
      const result = await api.testLLM(llmConfig);
      setLlmTestMsg(result.message);
      if (result.success) {
        await refreshLLMStatus();
      }
    } catch (e) {
      setLlmTestMsg(`Error: ${e instanceof Error ? e.message : "Unknown error"}`);
    } finally {
      setLlmTesting(false);
    }
  }, [llmConfig, refreshLLMStatus]);

  const handleSaveLLMConfig = useCallback(async () => {
    if (!llmConfig) return;
    try {
      await api.setLLMConfig(llmConfig);
      setLlmTestMsg("✓ Configuration saved!");
      await refreshLLMStatus();
    } catch (e) {
      setLlmTestMsg(`Error saving config: ${e instanceof Error ? e.message : "Unknown error"}`);
    }
  }, [llmConfig, refreshLLMStatus]);

  useEffect(() => { 
    if (settingsOpen) { 
      refreshStorage(); 
      refreshModelStorage(); 
      refreshLLMConfig();
      refreshLLMStatus();
    } 
  }, [settingsOpen, refreshStorage, refreshModelStorage, refreshLLMConfig, refreshLLMStatus]);
  const [shortcutsOpen, setShortcutsOpen] = useState(false);

  /* Onboarding banner */
  const [onboardDismissed, setOnboardDismissed] = useState<boolean>(() => {
    if (typeof window === "undefined") return false;
    return window.localStorage.getItem("student-ai-onboard-dismissed") === "1";
  });
  const dismissOnboarding = () => {
    setOnboardDismissed(true);
    try { window.localStorage.setItem("student-ai-onboard-dismissed", "1"); } catch {}
  };
  const showOnboarding = !onboardDismissed && (profile.name === DEFAULT_PROFILE.name || !profile.career);

  /* First-time welcome card (one-time, friendly) */
  const [welcomeOpen, setWelcomeOpen] = useState<boolean>(() => {
    if (typeof window === "undefined") return false;
    return window.localStorage.getItem("student-ai-welcomed") !== "1";
  });
  const closeWelcome = () => {
    setWelcomeOpen(false);
    try { window.localStorage.setItem("student-ai-welcomed", "1"); } catch {}
  };

  /* Rotating greetings — picked fresh on every app open. Some mention offline. */
  const greeting = useMemo(() => {
    const first = profile.name === DEFAULT_PROFILE.name ? "there" : profile.name.split(/\s+/)[0];
    const hour = new Date().getHours();
    const timeWord = hour < 5 ? "Burning the midnight oil"
      : hour < 12 ? "Good morning"
      : hour < 17 ? "Good afternoon"
      : hour < 22 ? "Good evening"
      : "Late-night study session";

    const pool: { title: string; subtitle: string }[] = [
      { title: `Hi ${first} — what are we studying today?`,
        subtitle: "Ask anything, drop in your notes, or pick a quick start below." },
      { title: `${timeWord}, ${first}! Ready to learn something?`,
        subtitle: "I'm right here on your computer — no internet needed." },
      { title: `Welcome back, ${first} 👋`,
        subtitle: "Pick up where you left off, or start something new." },
      { title: `Hey ${first} — what's on the syllabus?`,
        subtitle: "Drop in a PDF, ask a question, or generate a document." },
      { title: `Let's tackle it, ${first} 💪`,
        subtitle: "Tough subject? Easy one? Either way, I've got you." },
      { title: `Offline and ready, ${first} 🔒`,
        subtitle: "Your notes, your chats, your data — all stays on this computer." },
      { title: `Hi ${first} — no Wi-Fi? No problem.`,
        subtitle: "Everything I do works without an internet connection." },
      { title: `${timeWord}, ${first}!`,
        subtitle: "Ask, upload, or pick a quick start to get going." },
      { title: `Ready when you are, ${first}`,
        subtitle: "Try a question, or drop a PDF into our chat to get started." },
      { title: `Coffee in hand, ${first}? ☕`,
        subtitle: "Let's break down whatever you're studying — one step at a time." },
      { title: `Hi ${first} — your private study buddy is here`,
        subtitle: "Nothing leaves your computer. Ever. Promise." },
      { title: `Hey ${first} — what shall we figure out today?`,
        subtitle: "Big topics, tiny questions, or full essays — I'm up for it." },
      { title: `${first}, let's make today productive ✨`,
        subtitle: "Tip: drop your lecture notes into memory and I'll remember them." },
      { title: `Plane mode? Library Wi-Fi down? All good, ${first}.`,
        subtitle: "I run entirely on this computer — no internet required." },
    ];
    return pool[Math.floor(Math.random() * pool.length)];
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [profile.name]);

  const ZOOM_MIN = 0.75;
  const ZOOM_MAX = 1.5;
  const ZOOM_STEP = 0.1;
  const zoomIn = () => setUiScale(s => Math.min(ZOOM_MAX, Math.round((s + ZOOM_STEP) * 100) / 100));
  const zoomOut = () => setUiScale(s => Math.max(ZOOM_MIN, Math.round((s - ZOOM_STEP) * 100) / 100));
  const zoomReset = () => setUiScale(0.9);

  /* Global keyboard shortcuts */
  useEffect(() => {
    const isTypingIn = (el: EventTarget | null) => {
      if (!(el instanceof HTMLElement)) return false;
      const tag = el.tagName;
      return tag === "INPUT" || tag === "TEXTAREA" || el.isContentEditable;
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        if (profileOpen) { setProfileOpen(false); return; }
        if (settingsOpen) { setSettingsOpen(false); return; }
        if (shortcutsOpen) { setShortcutsOpen(false); return; }
        if (pendingDeleteId) { setPendingDeleteId(null); return; }
        if (editingSessionId) { setEditingSessionId(null); return; }
      }
      if ((e.ctrlKey || e.metaKey) && !e.shiftKey && !e.altKey) {
        const k = e.key.toLowerCase();
        if (k === "n") { e.preventDefault(); startNewChat(); return; }
        if (k === "k") { e.preventDefault(); setActiveTab("memory"); return; }
        if (k === ",") { e.preventDefault(); setSettingsOpen(true); return; }
        if (k === "=" || k === "+") { e.preventDefault(); zoomIn(); return; }
        if (k === "-" || k === "_") { e.preventDefault(); zoomOut(); return; }
        if (k === "0") { e.preventDefault(); zoomReset(); return; }
      }
      if (e.key === "?" && !isTypingIn(e.target)) { e.preventDefault(); setShortcutsOpen(o => !o); }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [profileOpen, settingsOpen, shortcutsOpen, pendingDeleteId, editingSessionId]);
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
  function pickIcon(kind: ApiMemoryItem["kind"]) {
    return kind === "image" ? Image : kind === "doc" ? BookOpen : FileText;
  }
  function memoryDate(iso: string) {
    try {
      return new Date(iso).toLocaleDateString(undefined, { month: "short", day: "numeric" });
    } catch { return ""; }
  }
  function pickTool(id: string) { setActiveTool(id); setToolsOpen(false); }

  const school = CALC_SCHOOLS.find(s => s.id === calcSchool) ?? CALC_SCHOOLS[0];

  return (
    <div
      className={`student-ai-root relative flex font-sans overflow-hidden transition-colors duration-300 ${c.root}`}
      style={{
        transform: `scale(${uiScale})`,
        transformOrigin: "top left",
        width: `${100 / uiScale}vw`,
        height: `${100 / uiScale}vh`,
      }}
    >

      {/* ══ LEFT SIDEBAR ══ */}
      <aside className={`flex-shrink-0 ${c.sidebar} border-r ${c.border} flex flex-col transition-all duration-300 ease-in-out overflow-hidden ${sidebarOpen ? "w-64" : "w-12"}`}>
        {sidebarOpen ? (
          <>
            <div className={`px-4 py-4 border-b ${c.border} flex items-center justify-between`}>
              <div className="flex items-center gap-2.5">
                <img src="/logo.png" alt="MyGPT" className="w-8 h-8 rounded-lg flex-shrink-0 shadow-lg shadow-indigo-500/20" />
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
              <button
                onClick={startNewChat}
                title="Start a new chat (Ctrl + N)"
                className="w-full flex items-center gap-2 px-3 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-500 transition-colors text-sm font-medium text-white shadow-md shadow-indigo-500/20"
              >
                <Plus className="w-4 h-4" />New Chat
              </button>
            </div>

            <div className="flex-1 overflow-y-auto px-3 pb-4">
              <p className={`text-[10px] uppercase tracking-widest font-semibold px-2 mb-2 ${c.textFaint}`}>Chats</p>
              <div className="space-y-0.5">
                {sessions.map(s => {
                  const isActive = activeChat === s.label;
                  const isEditing = editingSessionId === s.id;
                  const isDeleting = pendingDeleteId === s.id;
                  return (
                    <div key={s.id}
                      className={`group relative flex items-center gap-2 px-3 py-2 rounded-lg transition-all ${isActive ? c.chatActive : c.chatInactive}`}>
                      <MessageSquare className={`w-3.5 h-3.5 flex-shrink-0 ${isActive ? "text-indigo-500" : ""}`} />
                      {isEditing ? (
                        <input
                          autoFocus
                          value={editingSessionDraft}
                          onChange={e => setEditingSessionDraft(e.target.value)}
                          onBlur={commitRenameSession}
                          onKeyDown={e => {
                            if (e.key === "Enter") commitRenameSession();
                            if (e.key === "Escape") setEditingSessionId(null);
                          }}
                          className={`flex-1 bg-transparent outline-none text-xs font-medium ${c.text} border-b ${c.borderBrt}`}
                          aria-label="Rename chat"
                        />
                      ) : (
                        <button
                          onClick={() => selectRemoteSession(s)}
                          className="flex-1 flex items-center gap-2 text-left min-w-0"
                          title={s.label}
                        >
                          <span className="text-xs flex-1 truncate font-medium">{s.label}</span>
                          <span className={`text-[10px] ${c.textXs} group-hover:opacity-0 transition-opacity`}>{s.time}</span>
                        </button>
                      )}
                      {!isEditing && (
                        <div className="absolute right-2 flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                          <button
                            onClick={(e) => { e.stopPropagation(); startRenameSession(s); }}
                            className={`w-6 h-6 flex items-center justify-center rounded-md ${c.textMuted} ${c.hoverMed}`}
                            title="Rename chat"
                            aria-label={`Rename ${s.label}`}
                          >
                            <Pencil className="w-3 h-3" />
                          </button>
                          <button
                            onClick={(e) => { e.stopPropagation(); setPendingDeleteId(s.id); }}
                            className={`w-6 h-6 flex items-center justify-center rounded-md ${c.textMuted} hover:bg-rose-500/15 hover:text-rose-400`}
                            title="Delete chat"
                            aria-label={`Delete ${s.label}`}
                          >
                            <Trash2 className="w-3 h-3" />
                          </button>
                        </div>
                      )}
                      {isDeleting && (
                        <div className={`absolute left-0 right-0 top-full mt-1 z-10 rounded-lg border ${c.borderMd} ${c.card} p-2.5 shadow-xl`}>
                          <p className={`text-[11px] mb-2 ${c.textBody}`}>Delete this chat? This can't be undone.</p>
                          <div className="flex items-center justify-end gap-1.5">
                            <button
                              onClick={() => setPendingDeleteId(null)}
                              className={`px-2 py-1 rounded-md text-[11px] ${c.textMuted} ${c.hoverMuted}`}
                            >Cancel</button>
                            <button
                              onClick={() => deleteSession(s.id)}
                              className="px-2 py-1 rounded-md text-[11px] font-medium bg-rose-500 hover:bg-rose-400 text-white"
                            >Delete</button>
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
                {sessions.length === 0 && (
                  <p className={`text-[11px] px-3 py-4 text-center ${c.textFaint}`}>No chats yet — tap <span className="font-medium">New Chat</span> to start one.</p>
                )}
              </div>

              <p className={`text-[10px] uppercase tracking-widest font-semibold px-2 mt-5 mb-2 ${c.textFaint}`}>Memory</p>
              <div className="space-y-0.5">
                {memoryItems.length === 0 && (
                  <p className={`text-[11px] px-3 py-2 ${c.textFaint}`}>
                    No files yet — drop a PDF or image to start.
                  </p>
                )}
                {memoryItems.map(m => {
                  const Icon = pickIcon(m.kind);
                  return (
                    <a key={m.id}
                       href={api.url(`/memory/${m.id}/file`)}
                       target="_blank" rel="noreferrer"
                       title={m.filename}
                       className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-left transition-all ${c.textMuted} ${c.hoverSub}`}>
                      <Icon className="w-3.5 h-3.5 flex-shrink-0 text-violet-500" />
                      <span className={`text-xs flex-1 truncate ${c.textBody}`}>{m.filename}</span>
                      <span className={`text-[10px] ${c.textXs}`}>{memoryDate(m.created_at)}</span>
                    </a>
                  );
                })}
              </div>

              <p className={`text-[10px] uppercase tracking-widest font-semibold px-2 mt-5 mb-2 ${c.textFaint}`}>Documents</p>
              <div className="space-y-0.5">
                {documents.length === 0 && (
                  <p className={`text-[11px] px-3 py-2 ${c.textFaint}`}>
                    None yet — use <span className="font-medium">Write Doc</span> to create one.
                  </p>
                )}
                {documents.map(doc => (
                  <a key={doc.id}
                     href={api.url(doc.download_url)}
                     download
                     title={`Download ${doc.title}`}
                     className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-left transition-all ${c.textMuted} ${c.hoverSub}`}>
                    <FileText className="w-3.5 h-3.5 flex-shrink-0 text-emerald-500" />
                    <span className={`text-xs flex-1 truncate ${c.textBody}`}>{doc.title}</span>
                    <span className={`text-[10px] ${c.textXs} uppercase`}>{doc.format}</span>
                  </a>
                ))}
              </div>
            </div>

            <div className={`px-4 py-3 border-t ${c.border}`}>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1.5">
                  <div className={`w-1.5 h-1.5 rounded-full ${backendOnline ? "bg-emerald-500 animate-pulse" : "bg-amber-500"}`} />
                  <span className={`text-[10px] font-medium ${c.textMuted}`}>{backendOnline ? "Local backend online" : "Backend not reachable"}</span>
                </div>
                <WifiOff className={`w-3 h-3 ${c.textGhost}`} />
              </div>
            </div>

            <div className={`flex items-center justify-between gap-2 px-5 py-3 border-t ${c.border}`}>
              <span className={`text-[10px] ${c.textGhost} truncate`}>© {new Date().getFullYear()} Bluegold.ltd</span>
              <button
                onClick={() => setContactOpen(true)}
                className={`text-[10px] font-medium text-indigo-500 hover:text-indigo-400 transition-colors`}
              >
                Contact us
              </button>
            </div>
          </>
        ) : (
          <div className="flex flex-col items-center py-3 gap-3 h-full cursor-pointer group" onClick={() => setSidebarOpen(true)}>
            <button className={`w-8 h-8 flex items-center justify-center rounded-lg ${c.textGhost} ${c.hoverMuted} transition-colors`} onClick={e => { e.stopPropagation(); setSidebarOpen(true); }}>
              <PanelLeftOpen className="w-4 h-4" />
            </button>
            <div className={`w-6 h-px ${c.dot} rounded`} />
            <img src="/logo.png" alt="MyGPT" className="w-8 h-8 rounded-lg shadow-md shadow-indigo-500/20" />
            <div className={`w-6 h-px ${c.dot} rounded`} />
            <div className="flex flex-col items-center gap-2">
              {sessions.slice(0, 3).map(s => (
                <div key={s.id} className={`w-7 h-7 flex items-center justify-center rounded-lg ${c.textGhost} transition-colors`} title={s.label}>
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
            {/* Logo */}
            <img src="/logo.png" alt="My_GPT 4 Students" className="w-7 h-7 rounded-md" />
            {!sidebarOpen && (
              <button onClick={() => setSidebarOpen(true)} className={`w-8 h-8 flex items-center justify-center rounded-lg ${c.textMuted} ${c.hoverMuted} transition-colors`}>
                <PanelLeftOpen className="w-4 h-4" />
              </button>
            )}
            <div>
              <h1 className={`text-sm font-semibold ${c.text}`}>{activeChat}</h1>
              <p className={`text-[11px] ${c.textFaint}`}>
                {messages.length === 0
                  ? "No messages yet"
                  : `${messages.length} message${messages.length === 1 ? "" : "s"}${memoryItems.length > 0 ? ` · ${memoryItems.length} memory item${memoryItems.length === 1 ? "" : "s"} available` : ""}`}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {/* Theme toggle */}
            <button
              onClick={() => setDarkMode(d => !d)}
              className={`w-8 h-8 flex items-center justify-center rounded-lg ${c.bgMuted} border ${c.border} ${c.textMuted} ${c.hoverMuted} transition-colors`}
              title={darkMode ? "Switch to light theme" : "Switch to dark theme"}
              aria-label={darkMode ? "Switch to light theme" : "Switch to dark theme"}
            >
              {darkMode ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
            </button>
            {/* Keyboard shortcuts */}
            <button
              onClick={() => setShortcutsOpen(true)}
              className={`w-8 h-8 flex items-center justify-center rounded-lg ${c.bgMuted} border ${c.border} ${c.textMuted} ${c.hoverMuted} transition-colors`}
              title="Keyboard shortcuts (?)"
              aria-label="Show keyboard shortcuts"
            >
              <Keyboard className="w-4 h-4" />
            </button>
            {/* Settings */}
            <button
              onClick={() => setSettingsOpen(true)}
              className={`w-8 h-8 flex items-center justify-center rounded-lg ${c.bgMuted} border ${c.border} ${c.textMuted} ${c.hoverMuted} transition-colors`}
              title="Settings (Ctrl + ,)"
              aria-label="Open settings"
            >
              <Settings className="w-4 h-4" />
            </button>
            {/* Friendly status dot */}
            <span
              title={backendOnline
                ? "Ready · everything's running on your computer"
                : "Reconnecting… if this stays, please reopen the app"}
              className={`w-2 h-2 rounded-full ${backendOnline ? "bg-emerald-500" : "bg-amber-500 animate-pulse"}`}
              aria-label={backendOnline ? "Ready" : "Reconnecting"}
            />
            {/* User profile button */}
            <button
              onClick={openProfile}
              className={`flex items-center gap-2 pl-1 pr-2.5 py-1 rounded-full ${c.bgMuted} border ${c.border} ${c.hoverMuted} transition-colors`}
              title="Edit your profile"
              aria-label="Open user profile"
            >
              {profile.avatar ? (
                <img src={profile.avatar} alt="" className="w-6 h-6 rounded-full object-cover" />
              ) : (
                <span className="w-6 h-6 rounded-full bg-gradient-to-br from-indigo-500 to-violet-600 text-white text-[10px] font-semibold flex items-center justify-center">
                  {userInitials}
                </span>
              )}
              <span className={`text-[11px] font-medium max-w-[110px] truncate ${c.textMd}`}>{profile.name}</span>
            </button>
            {!rightOpen && (
              <button onClick={() => setRightOpen(true)} className={`w-8 h-8 flex items-center justify-center rounded-lg ${c.textGhost} ${c.hoverMuted} transition-colors`}>
                <PanelRightOpen className="w-4 h-4" />
              </button>
            )}
          </div>
        </header>

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
              {searchLoading
                ? <>Searching your memory…</>
                : searchResults === null || !searchQuery.trim()
                  ? <>Type a query to search your local memory.</>
                  : <>About <span className={`font-semibold ${c.textBody}`}>{searchResults.length} result{searchResults.length === 1 ? "" : "s"}</span> for "{searchQuery}" in your memory</>}
            </p>

            <div className="space-y-3">
              {(searchResults ?? []).map(r => (
                <div key={r.id} className={`group rounded-xl border ${c.searchResult} transition-all p-4`}>
                  <div className="flex items-start gap-3 mb-2">
                    <div className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 mt-0.5 ${r.type === "image" ? "bg-violet-100" : r.type === "pdf" ? "bg-rose-100" : "bg-blue-100"}`}>
                      {r.type === "image"
                        ? <Image className="w-4 h-4 text-violet-500" />
                        : <FileText className={`w-4 h-4 ${r.type === "pdf" ? "text-rose-500" : "text-blue-500"}`} />}
                    </div>
                    <div className="flex-1 min-w-0">
                      <a
                        href={api.url(`/memory/${r.id}/file`)}
                        target="_blank" rel="noreferrer"
                        className="text-left text-indigo-600 hover:text-indigo-500 hover:underline text-sm font-medium leading-snug transition-colors"
                      >{r.title}</a>
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
                    <a
                      href={api.url(`/memory/${r.id}/file`)}
                      target="_blank" rel="noreferrer"
                      className="flex items-center gap-1 text-[11px] text-indigo-600 hover:text-indigo-500 font-medium transition-colors"
                    >
                      <ExternalLink className="w-3 h-3" />Open file
                    </a>
                    <button
                      onClick={() => {
                        setActiveTool(null);
                        setInput(prev => `${prev ? prev + " " : ""}[${r.title}] `);
                      }}
                      className={`text-[11px] font-medium transition-colors ${c.textFaint} ${c.hoverMuted}`}
                    >Reference in chat</button>
                  </div>
                </div>
              ))}
              {searchResults !== null && searchResults.length === 0 && searchQuery.trim() && !searchLoading && (
                <p className={`text-[11px] ${c.textFaint}`}>No matches yet — upload PDFs or images to your memory first.</p>
              )}
            </div>

            <div className={`mt-5 flex items-center gap-2 px-4 py-2.5 rounded-xl ${c.searchTipBg} border`}>
              <Layers className="w-3.5 h-3.5 text-amber-500 flex-shrink-0" />
              <p className={`text-[11px] ${c.searchTipText}`}>Click any result to open it in its original app, or use <span className={`font-semibold ${c.searchTipStrong}`}>Reference in chat</span> to pull it into your current message.</p>
            </div>
          </div>

        ) : (
          /* ── CHAT VIEW ── */
          <div ref={chatScrollRef} className="flex-1 overflow-y-auto px-6 py-6 space-y-6">
            {/* Onboarding nudge */}
            {showOnboarding && (
              <div className={`flex items-center gap-3 px-4 py-3 rounded-xl border ${c.memBannerBg}`} role="region" aria-label="Profile setup">
                <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-indigo-500 to-violet-600 flex items-center justify-center flex-shrink-0">
                  <Sparkles className="w-4 h-4 text-white" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className={`text-xs font-semibold ${c.text}`}>Make this yours</p>
                  <p className={`text-[11px] mt-0.5 ${c.memBannerText}`}>Add your name and field of study so explanations match your subject.</p>
                </div>
                <button
                  onClick={openProfile}
                  className="px-3 py-1.5 rounded-lg text-[11px] font-medium bg-indigo-600 hover:bg-indigo-500 text-white transition-colors flex-shrink-0"
                >Set up profile</button>
                <button
                  onClick={dismissOnboarding}
                  className={`w-7 h-7 flex items-center justify-center rounded-lg ${c.textMuted} ${c.hoverMuted} flex-shrink-0`}
                  title="Dismiss"
                  aria-label="Dismiss onboarding"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
            )}

            {isEmptyChat ? (
              /* ── WELCOME / FIRST-RUN SCREEN ── */
              <div className="flex flex-col items-center justify-center text-center py-16 px-4">
                <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-indigo-500 to-violet-600 flex items-center justify-center shadow-lg shadow-indigo-500/30 mb-5">
                  <GraduationCap className="w-8 h-8 text-white" />
                </div>
                <h2 className={`text-xl font-semibold ${c.text}`}>
                  {greeting.title}
                </h2>
                <p className={`text-sm mt-2 max-w-md ${c.textBody}`}>
                  {greeting.subtitle}
                </p>
                <div className="grid grid-cols-2 gap-3 mt-8 w-full max-w-2xl">
                  {SUGGESTIONS.map(s => (
                    <button
                      key={s.title}
                      onClick={() => sendSuggestion(s.title)}
                      className={`text-left p-4 rounded-xl border ${c.border} ${c.card} hover:border-indigo-500/40 hover:shadow-md transition-all`}
                    >
                      <div className="flex items-start gap-3">
                        <span className="text-2xl leading-none mt-0.5" aria-hidden="true">{s.icon}</span>
                        <div className="min-w-0">
                          <p className={`text-sm font-medium ${c.text}`}>{s.title}</p>
                          <p className={`text-[11px] mt-0.5 ${c.textFaint}`}>{s.subtitle}</p>
                        </div>
                      </div>
                    </button>
                  ))}
                </div>
                <p className={`text-[11px] mt-6 ${c.textFaint}`}>
                  Tip: press <kbd className={`px-1.5 py-0.5 rounded border ${c.border} ${c.bgMuted} font-mono text-[10px] ${c.textMd}`}>?</kbd> to see all keyboard shortcuts.
                </p>
              </div>
            ) : (
            <>
            {/* Memory banner — only when memory has been loaded into this chat */}
            {memoryItems.length > 0 && (
              <div className={`flex items-center gap-2.5 px-4 py-2.5 rounded-xl ${c.memBannerBg} border`}>
                <Layers className="w-3.5 h-3.5 text-indigo-500 flex-shrink-0" />
                <p className={`text-xs ${c.memBannerText}`}>
                  <span className={`font-semibold ${c.memBannerStrong}`}>{memoryItems.length} memory item{memoryItems.length === 1 ? "" : "s"}</span> available for context
                </p>
                <ChevronRight className={`w-3.5 h-3.5 ${c.memBannerArrow} ml-auto`} />
              </div>
            )}

            {/* Messages */}
            {messages.map(msg => (
              <div key={msg.id} className={`flex gap-3 ${msg.role === "user" ? "justify-end" : "justify-start"}`}>
                {msg.role === "assistant" && (
                  <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-indigo-500 to-violet-600 flex items-center justify-center flex-shrink-0 mt-0.5 shadow-md shadow-indigo-500/20">
                    <GraduationCap className="w-3.5 h-3.5 text-white" />
                  </div>
                )}
                <div className={`max-w-[75%] ${msg.role === "user" ? "order-first" : ""}`}>
                  {msg.role === "user" && (
                    <p className={`text-[11px] font-semibold mb-1 text-right ${c.textMd}`}>
                      {profile.name}{profile.career ? <span className={`font-normal ${c.textFaint}`}> · {profile.career}</span> : null}
                    </p>
                  )}
                  <div className={`rounded-2xl px-4 py-3 text-sm leading-relaxed ${msg.role === "user" ? c.userMsg : c.assistMsg}`}>
                    {msg.content.split("\n").map((line, i) => {
                      const html = line.replace(/\*\*(.*?)\*\*/g,"<strong>$1</strong>").replace(/\*(.*?)\*/g,"<em>$1</em>");
                      return <p key={i} className={line.startsWith("---") ? `border-t ${c.border} my-2` : line === "" ? "mb-1" : ""} dangerouslySetInnerHTML={{ __html: html }} />;
                    })}
                  </div>
                  <p className={`text-[10px] mt-1 ${c.textXs} ${msg.role === "user" ? "text-right" : "text-left"}`}>{msg.timestamp}</p>
                </div>
                {msg.role === "user" && (
                  profile.avatar ? (
                    <img src={profile.avatar} alt="" className="w-7 h-7 rounded-lg object-cover flex-shrink-0 mt-0.5" />
                  ) : (
                    <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-indigo-500 to-violet-600 flex items-center justify-center flex-shrink-0 mt-0.5 text-[11px] font-semibold text-white shadow-md shadow-indigo-500/20">{userInitials}</div>
                  )
                )}
              </div>
            ))}

            {/* Document generation card (real generation via Python backend) */}
            {(docGenerating || currentDoc) && (
              <div className="flex gap-3 justify-start">
                <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-indigo-500 to-violet-600 flex items-center justify-center flex-shrink-0 mt-0.5 shadow-md shadow-indigo-500/20">
                  <GraduationCap className="w-3.5 h-3.5 text-white" />
                </div>
                <div className="flex-1 max-w-[85%]">
                  <div className={`rounded-2xl px-4 py-3 text-sm mb-3 leading-relaxed ${c.assistMsg}`}>
                    {docGenerating
                      ? "Writing your document locally — using your prompt and any context I have…"
                      : `Done — your ${currentDoc?.format.toUpperCase()} is ready. Use the buttons below to save it.`}
                  </div>
                  <div className={`rounded-2xl border ${c.docCard} overflow-hidden`}>
                    <div className={`px-4 py-3 ${c.docHeader} flex items-center gap-3`}>
                      <div className="w-9 h-9 rounded-xl bg-indigo-100 flex items-center justify-center flex-shrink-0">
                        <FileText className="w-4 h-4 text-indigo-600" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className={`text-sm font-semibold truncate ${c.text}`}>
                          {currentDoc?.title ?? "Generating document…"}
                        </p>
                        <p className={`text-[10px] ${c.textFaint}`}>
                          {currentDoc
                            ? `${currentDoc.format.toUpperCase()} · ${Math.max(1, Math.round(currentDoc.size_bytes / 1024))} KB · saved locally`
                            : "Building structure from your prompt"}
                        </p>
                      </div>
                      <div className="flex items-center gap-1.5 flex-shrink-0">
                        {docGenerating ? (
                          <>
                            <Loader2 className="w-3.5 h-3.5 text-indigo-500 animate-spin" />
                            <span className="text-[10px] text-indigo-600 font-medium">Writing…</span>
                          </>
                        ) : (
                          <>
                            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
                            <span className="text-[10px] text-emerald-600 font-medium">Ready</span>
                          </>
                        )}
                      </div>
                    </div>
                    <div className="px-4 pt-3 pb-1">
                      <div className="flex items-center justify-between mb-1.5">
                        <span className={`text-[10px] ${c.textFaint}`}>Overall progress</span>
                        <span className="text-[10px] text-indigo-600 font-semibold">{docGenerating ? "Working…" : "100%"}</span>
                      </div>
                      <div className={`w-full h-1.5 ${c.vramTrack} rounded-full overflow-hidden`}>
                        <div className="h-full bg-gradient-to-r from-indigo-500 to-violet-500 rounded-full transition-all"
                          style={{ width: docGenerating ? "60%" : "100%" }} />
                      </div>
                    </div>
                    <div className="px-4 py-3 grid grid-cols-2 gap-y-2 gap-x-4">
                      {(currentDoc?.sections ?? []).map((label, i) => {
                        const done = !docGenerating;
                        return (
                          <div key={label} className={`flex items-center gap-2 ${done ? "opacity-100" : i === 0 ? "opacity-100" : "opacity-40"}`}>
                            {done ? <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 flex-shrink-0" />
                              : i === 0 ? <Loader2 className="w-3.5 h-3.5 text-indigo-500 animate-spin flex-shrink-0" />
                              : <Circle className={`w-3.5 h-3.5 flex-shrink-0 ${c.textGhost}`} />}
                            <span className={`text-[11px] truncate ${done ? c.textBody : i === 0 ? "text-indigo-600 font-medium" : c.textFaint}`}>{label}</span>
                          </div>
                        );
                      })}
                    </div>
                    <div className="px-4 pb-4 flex items-center gap-2">
                      {currentDoc ? (
                        <>
                          <a
                            href={api.url(currentDoc.download_url)}
                            download
                            className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-medium transition-colors"
                          >
                            <Download className="w-3 h-3" />
                            {currentDoc.format === "docx" ? "Open in Word" : "Save PDF"}
                          </a>
                          <button
                            onClick={() => generateDoc(
                              currentDoc.title,
                              currentDoc.format === "docx" ? "pdf" : "docx",
                            )}
                            className={`flex items-center gap-1.5 px-3 py-2 rounded-xl ${c.bgMuted} ${c.hoverMed} ${c.textBody} text-xs font-medium border ${c.border} transition-colors`}
                          >
                            <FileText className="w-3 h-3" />
                            Also as {currentDoc.format === "docx" ? "PDF" : "DOCX"}
                          </button>
                        </>
                      ) : (
                        <span className={`text-[11px] ${c.textFaint}`}>Hang tight…</span>
                      )}
                      <button
                        onClick={() => { setCurrentDoc(null); setActiveTool(null); }}
                        className={`ml-auto text-[10px] ${c.textXs} transition-colors`}
                      >Close</button>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Typing indicator (assistant is thinking) */}
            {isThinking && (
              <div className="flex gap-3 justify-start" role="status" aria-live="polite" aria-label="Assistant is thinking">
                <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-indigo-500 to-violet-600 flex items-center justify-center flex-shrink-0 shadow-md shadow-indigo-500/20">
                  <GraduationCap className="w-3.5 h-3.5 text-white" />
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
            <div ref={messagesEndRef} />
            </>
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
                onKeyDown={e => {
                  if (e.key === "Enter" && !e.shiftKey) {
                    e.preventDefault();
                    sendToBackend(input);
                  }
                }}
                placeholder={activeTool === "Write Doc" ? "Describe the document you want written..." : activeTool === "Calculator" ? "Type a calculation or use the floating calculator..." : activeTool === "Search Notes" ? "Type to search your notes and files..." : "Ask anything, attach images or PDFs..."}
                className={`flex-1 bg-transparent text-sm resize-none outline-none leading-relaxed px-4 pt-3 pb-1 ${c.textMd} placeholder:${c.textGhost}`} />
              <div className="flex items-center gap-1 px-3 pb-2">
                <button
                  onClick={() => fileInputRef.current?.click()}
                  title="Attach PDF or image"
                  aria-label="Attach a PDF or image"
                  className={`flex items-center justify-center ${c.textGhost} hover:${c.textMuted} transition-colors`}>
                  <Plus style={{ width: 8, height: 8 }} strokeWidth={1.25} />
                </button>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".pdf,image/*"
                  className="hidden"
                  onChange={e => {
                    const f = e.target.files?.[0];
                    if (f) uploadPdfToBackend(f);
                    if (e.target) e.target.value = "";
                  }} />
                <button
                  onClick={() => fileInputRef.current?.click()}
                  title="Take or upload a photo"
                  aria-label="Take or upload a photo"
                  className={`flex items-center justify-center ${c.textGhost} hover:${c.textMuted} transition-colors`}>
                  <Camera style={{ width: 8, height: 8 }} strokeWidth={1.25} />
                </button>
                <button
                  title="Voice input (coming soon)"
                  aria-label="Voice input"
                  className={`flex items-center justify-center ${c.textGhost} hover:${c.textMuted} transition-colors`}>
                  <AudioLines style={{ width: 8, height: 8 }} strokeWidth={1.25} />
                </button>
              </div>
            </div>
            <button
              onClick={() => sendToBackend(input)}
              disabled={isThinking || !input.trim()}
              className="w-10 h-10 flex items-center justify-center rounded-xl bg-indigo-600 hover:bg-indigo-500 transition-colors shadow-md shadow-indigo-500/20 flex-shrink-0 mb-0.5 disabled:opacity-50 disabled:cursor-not-allowed">
              <Send className="w-4 h-4 text-white" />
            </button>
          </div>
          <p className={`text-[10px] mt-2.5 px-1 ${c.textGhost}`}>
            All processing is done locally · No internet needed
            {backendError && !backendOnline && (
              <span className="text-amber-400"> · reconnecting…</span>
            )}
          </p>
        </div>
      </main>

      {/* ══ RIGHT PANEL ══ */}
      <aside className={`flex-shrink-0 ${c.panel} border-l ${c.border} flex flex-col transition-all duration-300 ease-in-out overflow-hidden ${rightOpen ? "w-56" : "w-12"}`}>
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
              {memoryItems.length === 0 && (
                <p className={`text-[11px] ${c.textFaint}`}>
                  No items yet. Use the button below or the paperclip in the chat input
                  to drop in a PDF or image.
                </p>
              )}
              {memoryItems.map(item => {
                const Icon = pickIcon(item.kind);
                const tone =
                  item.kind === "image"
                    ? { bg: "bg-violet-100", color: "text-violet-500" }
                    : item.kind === "pdf"
                      ? { bg: "bg-rose-100",   color: "text-rose-500" }
                      : { bg: "bg-blue-100",   color: "text-blue-500" };
                const kb = Math.max(1, Math.round(item.size_bytes / 1024));
                return (
                  <div key={item.id} className={`rounded-xl ${c.bgSub} border ${c.border} p-3`}>
                    <div className="flex items-start gap-2.5">
                      <div className={`w-7 h-7 rounded-lg ${tone.bg} flex items-center justify-center flex-shrink-0`}>
                        <Icon className={`w-3.5 h-3.5 ${tone.color}`} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <a href={api.url(`/memory/${item.id}/file`)} target="_blank" rel="noreferrer"
                           className={`text-xs font-medium truncate block hover:underline ${c.textMd}`}>{item.filename}</a>
                        <p className={`text-[10px] mt-0.5 ${c.textFaint}`}>{item.kind.toUpperCase()} · {kb} KB</p>
                        <p className={`text-[10px] mt-1 ${c.textXs}`}>{memoryDate(item.created_at)}</p>
                      </div>
                      <button
                        onClick={() => removeMemoryItem(item.id)}
                        title="Remove from memory"
                        className={`${c.textGhost} hover:text-rose-400 transition-colors`}>
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                );
              })}
              <div className="mt-2">
                <p className={`text-[10px] uppercase tracking-widest font-semibold mb-2 ${c.textFaint}`}>Generated Documents</p>
                {documents.length === 0 && (
                  <p className={`text-[11px] ${c.textFaint} pb-2`}>
                    None yet — use the <span className="font-semibold">Write Doc</span> tool to create one.
                  </p>
                )}
                {documents.map(doc => (
                  <div key={doc.id} className={`flex items-center gap-2.5 py-2.5 border-b ${c.border}`}>
                    <div className="w-7 h-7 rounded-lg bg-emerald-100 flex items-center justify-center">
                      <FileText className="w-3.5 h-3.5 text-emerald-600" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className={`text-xs truncate ${c.textBody}`}>{doc.title}</p>
                      <p className={`text-[10px] ${c.textXs}`}>{doc.format.toUpperCase()} · {memoryDate(doc.created_at)}</p>
                    </div>
                    <a href={api.url(doc.download_url)} download
                       title="Download"
                       className={`${c.textGhost} hover:text-indigo-500 transition-colors`}>
                      <Download className="w-3.5 h-3.5" />
                    </a>
                  </div>
                ))}
              </div>
              <button
                onClick={() => fileInputRef.current?.click()}
                className={`w-full mt-2 flex items-center justify-center gap-2 py-2.5 rounded-xl border border-dashed ${c.borderBrt} text-xs ${c.textFaint} ${c.hoverSub} transition-colors`}>
                <Plus className="w-3.5 h-3.5" />Add files to memory
              </button>
            </div>
            <div className={`px-4 py-4 border-t ${c.border} space-y-2.5`}>
              <div className="flex items-center justify-between">
                <span className={`text-[10px] font-medium ${c.textFaint}`}>Memory items</span>
                <span className={`text-[10px] font-semibold ${darkMode ? "text-indigo-400" : "text-indigo-600"}`}>{memoryItems.length}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className={`text-[10px] font-medium ${c.textFaint}`}>Documents</span>
                <span className={`text-[10px] font-semibold ${darkMode ? "text-violet-400" : "text-violet-600"}`}>{documents.length}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className={`text-[10px] font-medium ${c.textFaint}`}>Status</span>
                <div className="flex items-center gap-1.5">
                  <div className={`w-1.5 h-1.5 rounded-full ${backendOnline ? "bg-emerald-500" : "bg-amber-500"}`} />
                  <span className={`text-[10px] font-semibold ${backendOnline ? (darkMode ? "text-emerald-400" : "text-emerald-600") : (darkMode ? "text-amber-400" : "text-amber-600")}`}>
                    {backendOnline ? "Backend online" : "Backend offline"}
                  </span>
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

      {/* ══ A11Y FOCUS RING ══ */}
      <style>{`
        .student-ai-root :focus-visible {
          outline: 2px solid #818cf8;
          outline-offset: 2px;
          border-radius: 6px;
        }
      `}</style>

      {/* ══ CONTACT US MODAL ══ */}
      {contactOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4"
          onClick={() => setContactOpen(false)}
          role="dialog"
          aria-modal="true"
          aria-label="Contact us"
        >
          <div
            className={`w-full max-w-md rounded-2xl border ${c.borderMd} ${c.card} shadow-2xl overflow-hidden`}
            onClick={e => e.stopPropagation()}
          >
            <div className={`px-6 pt-6 pb-4 text-center border-b ${c.border}`}>
              <div className="w-12 h-12 mx-auto mb-3 rounded-2xl bg-gradient-to-br from-indigo-500 to-violet-600 flex items-center justify-center shadow-lg shadow-indigo-500/30">
                <Heart className="w-5 h-5 text-white" />
              </div>
              <h2 className={`text-base font-semibold ${c.text}`}>Thank you for trusting us</h2>
              <p className={`text-xs mt-1.5 ${c.textMuted} leading-relaxed`}>
                We're truly grateful you chose My_GPT 4 Students. If you ever need help, have feedback, or just want to say hello — we'd love to hear from you.
              </p>
            </div>

            <div className="px-6 py-5 space-y-3">
              <a
                href="https://wa.me/260965335385"
                target="_blank"
                rel="noopener noreferrer"
                className={`flex items-center gap-3 px-4 py-3 rounded-xl border ${c.border} ${c.hoverMuted} transition-colors group`}
              >
                <div className="w-9 h-9 rounded-xl bg-emerald-500/15 flex items-center justify-center flex-shrink-0">
                  <MessageCircle className="w-4 h-4 text-emerald-500" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className={`text-[10px] font-medium uppercase tracking-wide ${c.textFaint}`}>WhatsApp</p>
                  <p className={`text-sm font-semibold ${c.text}`}>+260 965 335 385</p>
                </div>
                <ExternalLink className={`w-3.5 h-3.5 ${c.textGhost} group-hover:text-indigo-500 transition-colors`} />
              </a>

              <a
                href="tel:+260771523503"
                className={`flex items-center gap-3 px-4 py-3 rounded-xl border ${c.border} ${c.hoverMuted} transition-colors`}
              >
                <div className="w-9 h-9 rounded-xl bg-indigo-500/15 flex items-center justify-center flex-shrink-0">
                  <Phone className="w-4 h-4 text-indigo-500" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className={`text-[10px] font-medium uppercase tracking-wide ${c.textFaint}`}>Phone</p>
                  <p className={`text-sm font-semibold ${c.text}`}>+260 771 523 503</p>
                </div>
              </a>

              <a
                href="tel:+260965335385"
                className={`flex items-center gap-3 px-4 py-3 rounded-xl border ${c.border} ${c.hoverMuted} transition-colors`}
              >
                <div className="w-9 h-9 rounded-xl bg-indigo-500/15 flex items-center justify-center flex-shrink-0">
                  <Phone className="w-4 h-4 text-indigo-500" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className={`text-[10px] font-medium uppercase tracking-wide ${c.textFaint}`}>Phone</p>
                  <p className={`text-sm font-semibold ${c.text}`}>+260 965 335 385</p>
                </div>
              </a>
            </div>

            <div className={`px-6 py-3 border-t ${c.border} flex items-center justify-between`}>
              <span className={`text-[10px] ${c.textGhost}`}>© {new Date().getFullYear()} Bluegold.ltd</span>
              <button
                onClick={() => setContactOpen(false)}
                className="px-4 py-1.5 rounded-lg text-xs font-medium bg-indigo-600 hover:bg-indigo-500 text-white"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ══ SETTINGS MODAL ══ */}
      {settingsOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4"
          onClick={() => setSettingsOpen(false)}
          role="dialog"
          aria-modal="true"
          aria-label="Settings"
        >
          <div
            className={`w-full max-w-lg rounded-2xl border ${c.borderMd} ${c.card} shadow-2xl overflow-hidden`}
            onClick={e => e.stopPropagation()}
          >
            <div className={`flex items-center justify-between px-5 py-4 border-b ${c.border}`}>
              <div className="flex items-center gap-2">
                <Settings className={`w-4 h-4 ${c.textMd}`} />
                <h2 className={`text-sm font-semibold ${c.text}`}>Settings</h2>
              </div>
              <button onClick={() => setSettingsOpen(false)} className={`w-7 h-7 flex items-center justify-center rounded-lg ${c.textMuted} ${c.hoverMuted}`} aria-label="Close settings">
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="px-5 py-5 space-y-5 max-h-[70vh] overflow-y-auto">
              {/* Appearance */}
              <section>
                <h3 className={`text-[11px] uppercase tracking-widest font-semibold mb-3 ${c.textFaint}`}>Appearance</h3>
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className={`text-xs font-medium ${c.text}`}>Theme</p>
                      <p className={`text-[11px] mt-0.5 ${c.textFaint}`}>Switch between light and dark.</p>
                    </div>
                    <div className={`flex items-center rounded-lg border ${c.border} ${c.bgMuted} p-0.5`}>
                      <button
                        onClick={() => setDarkMode(false)}
                        className={`px-3 py-1.5 rounded-md text-[11px] font-medium flex items-center gap-1.5 ${!darkMode ? "bg-indigo-600 text-white" : `${c.textMuted} ${c.hoverMuted}`}`}
                      ><Sun className="w-3 h-3" />Light</button>
                      <button
                        onClick={() => setDarkMode(true)}
                        className={`px-3 py-1.5 rounded-md text-[11px] font-medium flex items-center gap-1.5 ${darkMode ? "bg-indigo-600 text-white" : `${c.textMuted} ${c.hoverMuted}`}`}
                      ><Moon className="w-3 h-3" />Dark</button>
                    </div>
                  </div>

                  <div className="flex items-center justify-between">
                    <div>
                      <p className={`text-xs font-medium ${c.text}`}>Text & UI size</p>
                      <p className={`text-[11px] mt-0.5 ${c.textFaint}`}>Make everything bigger or smaller.</p>
                    </div>
                    <div className={`flex items-center gap-0.5 rounded-lg ${c.bgMuted} border ${c.border} p-0.5`}>
                      <button onClick={zoomOut} disabled={uiScale <= ZOOM_MIN + 0.001} className={`w-7 h-7 flex items-center justify-center rounded-md ${c.textMuted} ${c.hoverMuted} disabled:opacity-30`} aria-label="Decrease size"><ZoomOut className="w-3.5 h-3.5" /></button>
                      <button onClick={zoomReset} className={`min-w-[44px] h-7 px-2 text-[11px] font-medium tabular-nums ${c.textMuted} ${c.hoverMuted} rounded-md`}>{Math.round(uiScale * 100)}%</button>
                      <button onClick={zoomIn} disabled={uiScale >= ZOOM_MAX - 0.001} className={`w-7 h-7 flex items-center justify-center rounded-md ${c.textMuted} ${c.hoverMuted} disabled:opacity-30`} aria-label="Increase size"><ZoomIn className="w-3.5 h-3.5" /></button>
                    </div>
                  </div>
                </div>
              </section>

              {/* AI model */}
              <section>
                <h3 className={`text-[11px] uppercase tracking-widest font-semibold mb-3 ${c.textFaint}`}>Local AI model</h3>
                <div className={`rounded-xl border ${c.border} ${c.bgMuted} p-3 flex items-center gap-3`}>
                  <div className="w-9 h-9 rounded-lg bg-emerald-500/15 flex items-center justify-center">
                    <Sparkles className="w-4 h-4 text-emerald-500" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className={`text-xs font-medium ${c.text}`}>{modelStorage?.has_models ? "Model installed" : "No model installed yet"}</p>
                    <p className={`text-[11px] mt-0.5 ${c.textFaint}`}>{backendOnline ? "Backend running locally" : "Backend not reachable"}</p>
                  </div>
                  <button
                    onClick={refreshModelStorage}
                    className={`px-3 py-1.5 rounded-lg text-[11px] font-medium border ${c.border} ${c.textBody} ${c.hoverMuted}`}
                  >
                    Check
                  </button>
                </div>
              </section>

              {/* Model storage */}
              <section>
                <h3 className={`text-[11px] uppercase tracking-widest font-semibold mb-3 ${c.textFaint}`}>Model folder</h3>
                {!modelStorage && modelStorageLoading && (
                  <div className={`rounded-xl border ${c.border} ${c.bgMuted} p-3 flex items-center gap-3`}>
                    <Loader2 className="w-4 h-4 text-indigo-500 animate-spin" />
                    <p className={`text-[11px] ${c.textFaint}`}>Checking where the model lives…</p>
                  </div>
                )}
                {modelStorage && (
                  <div className={`rounded-xl border ${c.border} ${c.bgMuted} p-3.5`}>
                    <div className="flex items-start gap-3">
                      <div className={`w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0 ${modelStorage.on_external ? "bg-amber-500/15" : "bg-indigo-500/15"}`}>
                        {modelStorage.on_external
                          ? <Usb className="w-4 h-4 text-amber-500" />
                          : <HardDrive className="w-4 h-4 text-indigo-500" />}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <p className={`text-xs font-medium ${c.text}`}>
                            {modelStorage.on_external ? "Model on external drive" : "Model on this computer"}
                          </p>
                          <span className={`text-[10px] px-1.5 py-0.5 rounded-full ${modelStorage.on_external ? "bg-amber-500/15 text-amber-600" : "bg-emerald-500/15 text-emerald-600"}`}>
                            {modelStorage.has_models ? "Ready" : "No model found"}
                          </span>
                        </div>
                        <p className={`text-[11px] mt-0.5 font-mono break-all ${c.textFaint}`} title={modelStorage.model_dir}>{modelStorage.model_dir}</p>
                      </div>
                    </div>
                    <div className="mt-3.5 grid grid-cols-2 gap-2 text-[11px]">
                      <div className={`rounded-lg ${c.bgSub} border ${c.border} px-2.5 py-2`}>
                        <p className={`text-[10px] ${c.textFaint}`}>Model files</p>
                        <p className={`font-semibold ${c.text}`}>{modelStorage.model_count}</p>
                      </div>
                      <div className={`rounded-lg ${c.bgSub} border ${c.border} px-2.5 py-2`}>
                        <p className={`text-[10px] ${c.textFaint}`}>Used space</p>
                        <p className={`font-semibold ${c.text}`}>{modelStorage.used_human}</p>
                      </div>
                    </div>
                    <div className="mt-3">
                      <p className={`text-[11px] ${c.textFaint}`}>
                        Put your model folder on a drive you carry with you, then point the app at it once.
                      </p>
                    </div>
                  </div>
                )}
              </section>

              {/* Custom model path */}
              <section>
                <h3 className={`text-[11px] uppercase tracking-widest font-semibold mb-3 ${c.textFaint}`}>Custom model location</h3>
                <div className={`rounded-xl border ${c.border} ${c.bgMuted} p-3.5 space-y-3`}>
                  <div>
                    <label className={`text-xs font-medium ${c.text} block mb-2`}>Model folder path</label>
                    <input
                      type="text"
                      placeholder="e.g., C:\Models or /Volumes/ExternalDrive/models"
                      value={customModelPathInput}
                      onChange={(e) => setCustomModelPathInput(e.target.value)}
                      className={`w-full px-3 py-2 rounded-lg border ${c.border} ${c.card} text-xs font-mono ${c.text} placeholder:${c.textFaint} focus:outline-none focus:ring-1 focus:ring-indigo-500`}
                    />
                    <p className={`text-[11px] mt-2 ${c.textFaint}`}>
                      Point to the folder containing your model files. Leave empty to use the default location.
                    </p>
                  </div>
                  <button
                    onClick={handleSaveCustomModelPath}
                    className={`w-full px-3 py-2 rounded-lg text-[11px] font-medium border ${c.border} bg-indigo-600 text-white hover:bg-indigo-700 transition-colors`}
                  >
                    Apply Custom Path
                  </button>
                  {customModelPath && customModelPath !== customModelPathInput && (
                    <p className={`text-[11px] ${c.textFaint} italic`}>Changes pending. Click "Apply Custom Path" to save.</p>
                  )}
                  {customModelPath && customModelPath === customModelPathInput && customModelPath !== "" && (
                    <p className={`text-[11px] text-emerald-600`}>✓ Custom path applied: {customModelPath}</p>
                  )}
                </div>
              </section>

              {/* Storage location */}
              <section>
                <h3 className={`text-[11px] uppercase tracking-widest font-semibold mb-3 ${c.textFaint}`}>Storage</h3>
                {!storage && storageLoading && (
                  <div className={`rounded-xl border ${c.border} ${c.bgMuted} p-3 flex items-center gap-3`}>
                    <Loader2 className="w-4 h-4 text-indigo-500 animate-spin" />
                    <p className={`text-[11px] ${c.textFaint}`}>Checking where your data lives…</p>
                  </div>
                )}
                {!storage && !storageLoading && (
                  <div className={`rounded-xl border ${c.border} ${c.bgMuted} p-3`}>
                    <p className={`text-[11px] ${c.textFaint}`}>
                      Couldn't read storage info right now. Try again in a moment.
                    </p>
                  </div>
                )}
                {storage && (() => {
                  const usedPct = storage.total_bytes > 0
                    ? Math.min(100, Math.max(2, (storage.used_bytes / storage.total_bytes) * 100))
                    : 0;
                  const lowSpace = storage.free_bytes > 0 && storage.free_bytes < 500 * 1024 * 1024; // < 500 MB
                  return (
                    <div className={`rounded-xl border ${c.border} ${c.bgMuted} p-3.5`}>
                      <div className="flex items-start gap-3">
                        <div className={`w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0 ${storage.on_external ? "bg-amber-500/15" : "bg-indigo-500/15"}`}>
                          {storage.on_external
                            ? <Usb className="w-4 h-4 text-amber-500" />
                            : <HardDrive className="w-4 h-4 text-indigo-500" />}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <p className={`text-xs font-medium ${c.text}`}>
                              {storage.on_external ? "External drive" : "This computer"}
                            </p>
                            <span className={`text-[10px] px-1.5 py-0.5 rounded-full ${storage.on_external ? "bg-amber-500/15 text-amber-600" : "bg-emerald-500/15 text-emerald-600"}`}>
                              {storage.on_external ? "Body on external" : "All on PC"}
                            </span>
                          </div>
                          <p className={`text-[11px] mt-0.5 font-mono break-all ${c.textFaint}`} title={storage.data_dir}>{storage.data_dir}</p>
                        </div>
                        <button
                          onClick={refreshStorage}
                          className={`px-2 py-1 rounded-md text-[10px] font-medium border ${c.border} ${c.textBody} ${c.hoverMuted}`}
                          title="Refresh"
                        >Refresh</button>
                      </div>

                      <div className="mt-3.5">
                        <div className="flex items-center justify-between mb-1">
                          <span className={`text-[10px] ${c.textFaint}`}>Used by My_GPT</span>
                          <span className={`text-[10px] font-semibold ${c.textBody}`}>
                            {storage.used_human}
                            {storage.total_bytes > 0 && (
                              <span className={`font-normal ${c.textFaint}`}> · {storage.free_human} free of {storage.total_human}</span>
                            )}
                          </span>
                        </div>
                        <div className={`w-full h-1.5 ${c.vramTrack} rounded-full overflow-hidden`}>
                          <div
                            className={`h-full rounded-full ${lowSpace ? "bg-gradient-to-r from-amber-500 to-rose-500" : "bg-gradient-to-r from-indigo-500 to-violet-500"}`}
                            style={{ width: `${usedPct}%` }}
                          />
                        </div>
                      </div>

                      <div className={`mt-3 grid grid-cols-2 gap-2 text-[11px] ${c.textBody}`}>
                        <div className={`rounded-lg ${c.bgSub} border ${c.border} px-2.5 py-2`}>
                          <p className={`text-[10px] ${c.textFaint}`}>Memory items</p>
                          <p className={`font-semibold ${c.text}`}>{storage.memory_count}</p>
                        </div>
                        <div className={`rounded-lg ${c.bgSub} border ${c.border} px-2.5 py-2`}>
                          <p className={`text-[10px] ${c.textFaint}`}>Generated docs</p>
                          <p className={`font-semibold ${c.text}`}>{storage.document_count}</p>
                        </div>
                      </div>

                      {lowSpace && (
                        <p className="mt-3 text-[11px] text-amber-600">
                          Running low on space. Plug in an external drive and move your data — see how below.
                        </p>
                      )}

                      <details className={`mt-3 group/det`}>
                        <summary className={`cursor-pointer text-[11px] font-medium ${c.textBody} ${c.hoverMuted} list-none flex items-center gap-1.5 select-none`}>
                          <ChevronRight className="w-3 h-3 transition-transform group-open/det:rotate-90" />
                          {storage.on_external ? "Move data back to this computer" : "Move data to an external drive"}
                        </summary>
                        <div className={`mt-2 rounded-lg border ${c.border} ${c.bgSub} p-3 text-[11px] leading-relaxed ${c.textBody} space-y-2`}>
                          <p>
                            Your data lives in this folder:
                            <br />
                            <code className={`font-mono text-[10.5px] ${c.text}`}>{storage.data_dir}</code>
                          </p>
                          <ol className={`list-decimal list-inside space-y-1 ${c.textBody}`}>
                            <li>Close My_GPT.</li>
                            <li>Move (cut &amp; paste) the folder above to wherever you'd like — e.g. <code className="font-mono text-[10.5px]">E:\MyGPTData</code> on a USB drive.</li>
                            <li>Open <code className="font-mono text-[10.5px]">data_location.txt</code> in Notepad
                              ({" "}<span className={`${c.textFaint} font-mono break-all`}>{storage.location_file}</span>{" "})
                              and put the new folder path on its own line.</li>
                            <li>Start My_GPT again. Done!</li>
                          </ol>
                          <p className={c.textFaint}>
                            Tip: if the drive isn't plugged in next time you launch, the app will create a fresh empty folder — so always plug in your drive first.
                          </p>
                        </div>
                      </details>
                    </div>
                  );
                })()}
              </section>

              {/* LLM Configuration */}
              <section>
                <h3 className={`text-[11px] uppercase tracking-widest font-semibold mb-3 ${c.textFaint}`}>LLM Configuration</h3>
                
                {/* Status Card */}
                {llmStatus && (
                  <div className={`rounded-xl border ${llmStatus.online ? "border-emerald-500/30 bg-emerald-500/5" : `${c.border} ${c.bgMuted}`} p-3.5 mb-3`}>
                    <div className="flex items-center gap-3">
                      <div className={`w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0 ${llmStatus.online ? "bg-emerald-500/15" : "bg-amber-500/15"}`}>
                        {llmStatus.online ? (
                          <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                        ) : (
                          <WifiOff className="w-4 h-4 text-amber-500" />
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className={`text-xs font-medium ${c.text}`}>
                          {llmStatus.online ? "Ollama Connected" : "Ollama Offline"}
                        </p>
                        <p className={`text-[11px] mt-0.5 ${c.textFaint}`}>
                          {llmStatus.online
                            ? `${llmStatus.available_models.length} model(s) available`
                            : "No connection to Ollama"}
                        </p>
                      </div>
                      <button
                        onClick={refreshLLMStatus}
                        disabled={llmLoading}
                        className={`px-2 py-1 rounded-md text-[10px] font-medium border ${c.border} ${c.textBody} ${c.hoverMuted} disabled:opacity-50`}
                        title="Refresh status"
                      >
                        {llmLoading ? "..." : "Refresh"}
                      </button>
                    </div>
                  </div>
                )}

                {/* Configuration Inputs */}
                <div className={`space-y-3 rounded-xl border ${c.border} ${c.bgMuted} p-3.5`}>
                  <div>
                    <label className={`block text-[11px] font-medium ${c.text} mb-1.5`}>Ollama Host URL</label>
                    <input
                      type="text"
                      value={llmConfig?.ollama_host || ""}
                      onChange={(e) => llmConfig && setLlmConfig({ ...llmConfig, ollama_host: e.target.value })}
                      placeholder="http://localhost:11434"
                      className={`w-full px-2 py-1.5 text-[11px] rounded-lg border ${c.border} ${c.card} ${c.text} focus:outline-none focus:ring-2 focus:ring-indigo-500`}
                    />
                    <p className={`text-[10px] mt-0.5 ${c.textFaint}`}>URL where Ollama is running (usually localhost:11434)</p>
                  </div>

                  {/* Model Selection */}
                  {llmStatus?.online && llmStatus.available_models.length > 0 && (
                    <div className={`rounded-lg border ${c.border} ${c.bgSub} p-2.5 space-y-2`}>
                      <p className={`text-[11px] font-medium ${c.textBody}`}>Available models to assign:</p>
                      <div className="flex flex-wrap gap-1.5">
                        {llmStatus.available_models.map((model) => (
                          <button
                            key={model}
                            onClick={() => {
                              if (llmConfig) {
                                // Cycle through roles: vision → reasoning → writer
                                const current = 
                                  llmConfig.vision_model === model ? llmConfig.reasoning_model === model ? "writer" : "reasoning"
                                  : llmConfig.reasoning_model === model ? "writer"
                                  : llmConfig.writer_model === model ? "vision"
                                  : "vision";
                                const updated = { ...llmConfig };
                                updated[`${current}_model` as keyof typeof updated] = model;
                                setLlmConfig(updated);
                              }
                            }}
                            className={`px-2 py-1 rounded-md text-[10px] font-medium border transition-all ${
                              llmConfig?.vision_model === model || llmConfig?.reasoning_model === model || llmConfig?.writer_model === model
                                ? "bg-indigo-600 text-white border-indigo-600"
                                : `border ${c.border} ${c.textBody} ${c.hoverMuted}`
                            }`}
                            title={`Click to assign to roles. Currently: ${
                              llmConfig?.vision_model === model ? "Vision" : llmConfig?.reasoning_model === model ? "Reasoning" : llmConfig?.writer_model === model ? "Writer" : "Unassigned"
                            }`}
                          >
                            {model}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Advanced Configuration */}
                  <details className={`group/adv`}>
                    <summary className={`cursor-pointer text-[11px] font-medium ${c.textBody} ${c.hoverMuted} list-none flex items-center gap-1.5 select-none`}>
                      <ChevronRight className="w-3 h-3 transition-transform group-open/adv:rotate-90" />
                      Model assignments (advanced)
                    </summary>
                    <div className={`mt-2 space-y-2`}>
                      <div>
                        <label className={`block text-[10px] font-medium ${c.textMuted} mb-0.5`}>Vision (for images)</label>
                        <input
                          type="text"
                          value={llmConfig?.vision_model || ""}
                          onChange={(e) => llmConfig && setLlmConfig({ ...llmConfig, vision_model: e.target.value })}
                          className={`w-full px-2 py-1 text-[10px] rounded-lg border ${c.border} ${c.card} ${c.text} focus:outline-none focus:ring-1 focus:ring-indigo-500`}
                        />
                      </div>
                      <div>
                        <label className={`block text-[10px] font-medium ${c.textMuted} mb-0.5`}>Reasoning (for problem-solving)</label>
                        <input
                          type="text"
                          value={llmConfig?.reasoning_model || ""}
                          onChange={(e) => llmConfig && setLlmConfig({ ...llmConfig, reasoning_model: e.target.value })}
                          className={`w-full px-2 py-1 text-[10px] rounded-lg border ${c.border} ${c.card} ${c.text} focus:outline-none focus:ring-1 focus:ring-indigo-500`}
                        />
                      </div>
                      <div>
                        <label className={`block text-[10px] font-medium ${c.textMuted} mb-0.5`}>Writer (for explanations)</label>
                        <input
                          type="text"
                          value={llmConfig?.writer_model || ""}
                          onChange={(e) => llmConfig && setLlmConfig({ ...llmConfig, writer_model: e.target.value })}
                          className={`w-full px-2 py-1 text-[10px] rounded-lg border ${c.border} ${c.card} ${c.text} focus:outline-none focus:ring-1 focus:ring-indigo-500`}
                        />
                      </div>
                    </div>
                  </details>

                  {/* Test & Save Buttons */}
                  <div className="flex gap-2 pt-1">
                    <button
                      onClick={handleTestLLM}
                      disabled={llmTesting || !llmConfig}
                      className={`flex-1 px-3 py-1.5 rounded-lg text-[11px] font-medium border ${c.border} ${c.textBody} ${c.hoverMuted} disabled:opacity-50 transition-all flex items-center justify-center gap-1.5`}
                    >
                      {llmTesting ? (
                        <><Loader2 className="w-3 h-3 animate-spin" /> Testing...</>
                      ) : (
                        <>Test Connection</>
                      )}
                    </button>
                    <button
                      onClick={handleSaveLLMConfig}
                      disabled={!llmConfig}
                      className={`flex-1 px-3 py-1.5 rounded-lg text-[11px] font-medium border border-indigo-600 bg-indigo-600 text-white ${c.hoverMuted} disabled:opacity-50 transition-all`}
                    >
                      Save Configuration
                    </button>
                  </div>

                  {/* Test Result Message */}
                  {llmTestMsg && (
                    <div className={`rounded-lg border ${llmTestMsg.includes("✓") || llmTestMsg.includes("Found") ? "border-emerald-500/30 bg-emerald-500/5" : "border-amber-500/30 bg-amber-500/5"} p-2.5`}>
                      <p className={`text-[10px] ${llmTestMsg.includes("✓") || llmTestMsg.includes("Found") ? "text-emerald-600" : "text-amber-600"}`}>
                        {llmTestMsg}
                      </p>
                    </div>
                  )}
                </div>

                <p className={`text-[10px] mt-2 ${c.textFaint}`}>
                  Only one model loads at a time to save RAM. The app automatically manages which model is in memory based on your requests.
                </p>
              </section>

              {/* Profile */}
              <section>
                <h3 className={`text-[11px] uppercase tracking-widest font-semibold mb-3 ${c.textFaint}`}>Profile</h3>
                <div className={`rounded-xl border ${c.border} ${c.bgMuted} p-3 flex items-center gap-3`}>
                  {profile.avatar ? (
                    <img src={profile.avatar} alt="" className="w-10 h-10 rounded-lg object-cover" />
                  ) : (
                    <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-indigo-500 to-violet-600 text-white text-xs font-semibold flex items-center justify-center">{userInitials}</div>
                  )}
                  <div className="flex-1 min-w-0">
                    <p className={`text-xs font-medium truncate ${c.text}`}>{profile.name}</p>
                    <p className={`text-[11px] mt-0.5 truncate ${c.textFaint}`}>{profile.career || "No field of study set"}</p>
                  </div>
                  <button onClick={() => { setSettingsOpen(false); openProfile(); }} className={`px-3 py-1.5 rounded-lg text-[11px] font-medium border ${c.border} ${c.textBody} ${c.hoverMuted}`}>Edit</button>
                </div>
              </section>

              {/* Shortcuts shortcut */}
              <section>
                <button
                  onClick={() => { setSettingsOpen(false); setShortcutsOpen(true); }}
                  className={`w-full flex items-center gap-3 rounded-xl border ${c.border} ${c.bgMuted} p-3 text-left ${c.hoverMuted}`}
                >
                  <div className="w-9 h-9 rounded-lg bg-indigo-500/15 flex items-center justify-center">
                    <Keyboard className="w-4 h-4 text-indigo-500" />
                  </div>
                  <div className="flex-1">
                    <p className={`text-xs font-medium ${c.text}`}>Keyboard shortcuts</p>
                    <p className={`text-[11px] mt-0.5 ${c.textFaint}`}>See every shortcut in one place.</p>
                  </div>
                  <ChevronRight className={`w-4 h-4 ${c.textFaint}`} />
                </button>
              </section>
            </div>

            <div className={`flex items-center justify-end gap-2 px-5 py-3 border-t ${c.border} ${c.bgSub}`}>
              <button onClick={() => setSettingsOpen(false)} className="px-4 py-1.5 rounded-lg text-xs font-medium bg-indigo-600 hover:bg-indigo-500 text-white">Done</button>
            </div>
          </div>
        </div>
      )}

      {/* ══ SHORTCUTS MODAL ══ */}
      {shortcutsOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4"
          onClick={() => setShortcutsOpen(false)}
          role="dialog"
          aria-modal="true"
          aria-label="Keyboard shortcuts"
        >
          <div className={`w-full max-w-md rounded-2xl border ${c.borderMd} ${c.card} shadow-2xl overflow-hidden`} onClick={e => e.stopPropagation()}>
            <div className={`flex items-center justify-between px-5 py-4 border-b ${c.border}`}>
              <div className="flex items-center gap-2">
                <Keyboard className={`w-4 h-4 ${c.textMd}`} />
                <h2 className={`text-sm font-semibold ${c.text}`}>Keyboard shortcuts</h2>
              </div>
              <button onClick={() => setShortcutsOpen(false)} className={`w-7 h-7 flex items-center justify-center rounded-lg ${c.textMuted} ${c.hoverMuted}`} aria-label="Close shortcuts">
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="px-5 py-4">
              <ul className="space-y-2">
                {SHORTCUTS.map(s => (
                  <li key={s.keys} className="flex items-center justify-between gap-3">
                    <span className={`text-xs ${c.textBody}`}>{s.label}</span>
                    <kbd className={`px-2 py-1 rounded-md border ${c.border} ${c.bgMuted} font-mono text-[11px] ${c.textMd}`}>{s.keys}</kbd>
                  </li>
                ))}
              </ul>
              <p className={`text-[11px] mt-4 ${c.textFaint}`}>On macOS, use ⌘ instead of Ctrl.</p>
            </div>
          </div>
        </div>
      )}

      {/* ══ ONE-TIME WELCOME CARD ══ */}
      {welcomeOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4"
          onClick={closeWelcome}
          role="dialog"
          aria-modal="true"
          aria-label="Welcome"
        >
          <div
            className={`w-full max-w-md rounded-2xl border ${c.borderMd} ${c.card} shadow-2xl overflow-hidden`}
            onClick={e => e.stopPropagation()}
          >
            <div className="px-6 pt-7 pb-5 text-center">
              <div className="w-16 h-16 mx-auto rounded-2xl bg-gradient-to-br from-indigo-500 to-violet-600 flex items-center justify-center shadow-lg shadow-indigo-500/30 mb-4">
                <GraduationCap className="w-8 h-8 text-white" />
              </div>
              <h2 className={`text-lg font-semibold ${c.text}`}>Welcome 👋</h2>
              <p className={`text-sm mt-2 ${c.textBody}`}>
                I'm your personal study buddy — and the best part?
                <br />
                <span className="font-semibold text-indigo-500">I work without internet.</span>
              </p>
              <div className={`mt-5 rounded-xl ${c.bgSub} border ${c.border} p-4 text-left space-y-2.5`}>
                <div className="flex items-start gap-2.5">
                  <span className="text-base leading-none mt-0.5">💬</span>
                  <p className={`text-[12px] ${c.textBody}`}>Ask me anything — explanations, summaries, even step-by-step problems.</p>
                </div>
                <div className="flex items-start gap-2.5">
                  <span className="text-base leading-none mt-0.5">📎</span>
                  <p className={`text-[12px] ${c.textBody}`}>Drop in your notes or PDFs and I'll remember them.</p>
                </div>
                <div className="flex items-start gap-2.5">
                  <span className="text-base leading-none mt-0.5">📝</span>
                  <p className={`text-[12px] ${c.textBody}`}>I can write reports, summaries, or essays for you.</p>
                </div>
                <div className="flex items-start gap-2.5">
                  <span className="text-base leading-none mt-0.5">🔒</span>
                  <p className={`text-[12px] ${c.textBody}`}>Everything stays on this computer. Always.</p>
                </div>
              </div>
            </div>
            <div className={`px-6 pb-6 pt-2 flex flex-col gap-2`}>
              <button
                onClick={() => { closeWelcome(); openProfile(); }}
                className="w-full py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-medium transition-colors"
              >
                Let's get started
              </button>
              <button
                onClick={closeWelcome}
                className={`w-full py-2 rounded-xl text-[12px] ${c.textFaint} ${c.hoverSub} transition-colors`}
              >
                Skip for now
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ══ PROFILE MODAL ══ */}
      {profileOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4"
          onClick={closeProfile}
          role="dialog"
          aria-modal="true"
        >
          <div
            className={`w-full max-w-md rounded-2xl border ${c.borderMd} ${c.card} shadow-2xl overflow-hidden`}
            onClick={e => e.stopPropagation()}
          >
            <div className={`flex items-center justify-between px-5 py-4 border-b ${c.border}`}>
              <div className="flex items-center gap-2">
                <UserIcon className={`w-4 h-4 ${c.textMd}`} />
                <h2 className={`text-sm font-semibold ${c.text}`}>Your profile</h2>
              </div>
              <button
                onClick={closeProfile}
                className={`w-7 h-7 flex items-center justify-center rounded-lg ${c.textMuted} ${c.hoverMuted} transition-colors`}
                aria-label="Close"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="px-5 py-5 space-y-5">
              {/* Avatar editor */}
              <div className="flex items-center gap-4">
                <div className="relative">
                  {profileDraft.avatar ? (
                    <img src={profileDraft.avatar} alt="" className="w-20 h-20 rounded-2xl object-cover" />
                  ) : (
                    <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-indigo-500 to-violet-600 text-white text-2xl font-semibold flex items-center justify-center shadow-md shadow-indigo-500/20">
                      {getInitials(profileDraft.name || "S")}
                    </div>
                  )}
                  <button
                    onClick={() => avatarFileRef.current?.click()}
                    className="absolute -bottom-1 -right-1 w-7 h-7 rounded-full bg-indigo-600 hover:bg-indigo-500 text-white flex items-center justify-center shadow-md"
                    title="Upload a photo"
                    aria-label="Upload profile photo"
                  >
                    <Camera className="w-3.5 h-3.5" />
                  </button>
                </div>
                <div className="flex-1">
                  <p className={`text-xs font-medium ${c.textMd}`}>Profile photo</p>
                  <p className={`text-[11px] mt-0.5 ${c.textFaint}`}>Any image works. Optional — your initials show otherwise.</p>
                  {profileDraft.avatar && (
                    <button
                      onClick={() => setProfileDraft(d => ({ ...d, avatar: null }))}
                      className={`mt-2 inline-flex items-center gap-1 text-[11px] ${c.textMuted} hover:text-rose-400 transition-colors`}
                    >
                      <Trash2 className="w-3 h-3" /> Remove photo
                    </button>
                  )}
                  <input
                    ref={avatarFileRef}
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={e => { handleAvatarFile(e.target.files?.[0] ?? null); e.target.value = ""; }}
                  />
                </div>
              </div>

              {/* Name */}
              <div>
                <label className={`block text-[11px] font-medium mb-1.5 ${c.textMd}`}>Your name</label>
                <input
                  type="text"
                  value={profileDraft.name}
                  onChange={e => setProfileDraft(d => ({ ...d, name: e.target.value }))}
                  placeholder="e.g. Alex Johnson"
                  className={`w-full px-3 py-2 rounded-lg text-sm outline-none ${c.inputWrap} border ${c.borderMd} ${c.inputFocus} ${c.text}`}
                />
              </div>

              {/* Career */}
              <div>
                <label className={`block text-[11px] font-medium mb-1.5 ${c.textMd}`}>Field of study or career</label>
                <input
                  type="text"
                  list="career-suggestions"
                  value={profileDraft.career}
                  onChange={e => setProfileDraft(d => ({ ...d, career: e.target.value }))}
                  placeholder="e.g. Engineering Student"
                  className={`w-full px-3 py-2 rounded-lg text-sm outline-none ${c.inputWrap} border ${c.borderMd} ${c.inputFocus} ${c.text}`}
                />
                <datalist id="career-suggestions">
                  {CAREER_SUGGESTIONS.map(s => <option key={s} value={s} />)}
                </datalist>
                <p className={`text-[11px] mt-1.5 ${c.textFaint}`}>Helps tailor explanations, calculators and templates to your subject.</p>
              </div>
            </div>

            <div className={`flex items-center justify-end gap-2 px-5 py-3 border-t ${c.border} ${c.bgSub}`}>
              <button
                onClick={closeProfile}
                className={`px-3 py-1.5 rounded-lg text-xs ${c.textMuted} ${c.hoverMuted} transition-colors`}
              >
                Cancel
              </button>
              <button
                onClick={saveProfile}
                className="px-4 py-1.5 rounded-lg text-xs font-medium bg-indigo-600 hover:bg-indigo-500 text-white transition-colors"
              >
                Save profile
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
