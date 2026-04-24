/* Tiny client for the local Python backend (FastAPI on http://localhost:8000). */

export const API_BASE: string =
  (import.meta as unknown as { env?: { VITE_API_BASE?: string } }).env
    ?.VITE_API_BASE ?? "http://localhost:8000";

export type ApiSession = { id: string; label: string; time: string };
export type ApiMessage = { role: "user" | "assistant"; content: string };
export type ApiMemoryItem = {
  id: string;
  filename: string;
  kind: "pdf" | "image" | "doc";
  size_bytes: number;
  created_at: string;
};
export type ApiSearchHit = {
  id: string;
  type: "pdf" | "image" | "doc";
  title: string;
  path: string;
  snippet: string;
  meta: string;
  relevance: number;
};
export type ApiDocument = {
  id: string;
  title: string;
  format: "docx" | "pdf";
  size_bytes: number;
  created_at: string;
  download_url: string;
  sections: string[];
};
export type ApiChatResponse = {
  reply: string;
  timestamp: string;
  model: string;
  session_id: string;
  stages?: string[];
  model_used?: string | null;
};

export type ApiSetupStatus = {
  is_setup_complete: boolean;
  model_path: string | null;
  ollama_running: boolean;
};

export type ApiDetectModelsResult = {
  status: "success" | "error";
  model_path?: string;
  models_found?: number;
  model_files?: string[];
  ollama_found?: boolean;
  ollama_path?: string | null;
  message?: string;
};

export type ApiOllamaStartResult = {
  status: "success" | "error";
  message: string;
  ollama_path?: string;
  model_path?: string;
};

async function j<T>(r: Response): Promise<T> {
  if (!r.ok) {
    const text = await r.text().catch(() => "");
    throw new Error(`${r.status} ${r.statusText}${text ? ` — ${text}` : ""}`);
  }
  return (await r.json()) as T;
}

export const api = {
  url: (path: string) => `${API_BASE}${path}`,

  health: () => fetch(`${API_BASE}/health`).then(j<{ status: string }>),

  // ── Sessions ────────────────────────────────────────────────
  listSessions: () => fetch(`${API_BASE}/sessions`).then(j<ApiSession[]>),
  createSession: (label?: string) =>
    fetch(`${API_BASE}/sessions`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ label: label ?? "New Chat" }),
    }).then(j<ApiSession>),
  renameSession: (id: string, label: string) =>
    fetch(`${API_BASE}/sessions/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ label }),
    }).then(j<ApiSession>),
  deleteSession: (id: string) =>
    fetch(`${API_BASE}/sessions/${id}`, { method: "DELETE" }).then(j<{ ok: true }>),
  getMessages: (id: string) =>
    fetch(`${API_BASE}/sessions/${id}/messages`).then(j<ApiMessage[]>),

  // ── Chat ───────────────────────────────────────────────────
  chat: (
    message: string,
    session_id?: string | null,
    attachment_ids?: string[] | null,
  ) =>
    fetch(`${API_BASE}/chat`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        message,
        session_id: session_id ?? null,
        attachment_ids: attachment_ids ?? null,
      }),
    }).then(j<ApiChatResponse>),

  // ── Memory / uploads ───────────────────────────────────────
  listMemory: () => fetch(`${API_BASE}/memory`).then(j<ApiMemoryItem[]>),
  uploadFile: (file: File) => {
    const fd = new FormData();
    fd.append("file", file);
    return fetch(`${API_BASE}/upload-pdf`, { method: "POST", body: fd }).then(
      j<ApiMemoryItem>
    );
  },
  deleteMemory: (id: string) =>
    fetch(`${API_BASE}/memory/${id}`, { method: "DELETE" }).then(j<{ ok: true }>),

  // ── Search ────────────────────────────────────────────────
  search: (query: string) =>
    fetch(`${API_BASE}/search`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ query }),
    }).then(j<{ query: string; results: ApiSearchHit[] }>),

  // ── Documents ─────────────────────────────────────────────
  listDocuments: () => fetch(`${API_BASE}/documents`).then(j<ApiDocument[]>),
  generateDocument: (
    prompt: string,
    opts?: { title?: string; format?: "docx" | "pdf"; session_id?: string | null }
  ) =>
    fetch(`${API_BASE}/documents/generate`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        prompt,
        title: opts?.title,
        format: opts?.format ?? "docx",
        session_id: opts?.session_id ?? null,
      }),
    }).then(j<ApiDocument>),
  deleteDocument: (id: string) =>
    fetch(`${API_BASE}/documents/${id}`, { method: "DELETE" }).then(j<{ ok: true }>),

  // ── Storage ───────────────────────────────────────────────
  getStorage: () => fetch(`${API_BASE}/storage`).then(j<ApiStorageInfo>),
  getModelStorage: () => fetch(`${API_BASE}/model-storage`).then(j<ApiModelStorageInfo>),
  setCustomModelPath: (path: string) =>
    fetch(`${API_BASE}/model-storage/custom-path`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ path }),
    }).then(j<ApiModelStorageInfo>),

  // ── LLM Configuration ──────────────────────────────────────
  getLLMConfig: () => fetch(`${API_BASE}/llm-config`).then(j<ApiLLMConfig>),
  setLLMConfig: (cfg: ApiLLMConfig) =>
    fetch(`${API_BASE}/llm-config`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(cfg),
    }).then(j<ApiLLMConfig>),
  testLLM: (cfg: ApiLLMConfig) =>
    fetch(`${API_BASE}/llm-test`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(cfg),
    }).then(j<ApiLLMTestResult>),
  getLLMStatus: () => fetch(`${API_BASE}/llm-status`).then(j<ApiLLMStatus>),

  // ── Profile ───────────────────────────────────────────────
  getProfile: () => fetch(`${API_BASE}/profile`).then(j<ApiProfile>),
  putProfile: (p: ApiProfile) =>
    fetch(`${API_BASE}/profile`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(p),
    }).then(j<ApiProfile>),

  // ── Setup (First-Time Model & Ollama Configuration) ────────
  getSetupStatus: () => fetch(`${API_BASE}/setup/status`).then(j<ApiSetupStatus>),
  setModelPath: (path: string) =>
    fetch(`${API_BASE}/setup/model-path`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ path }),
    }).then(j<{ status: string; model_path: string }>),
  detectModels: (path?: string) => {
    const query = path ? `?path=${encodeURIComponent(path)}` : "";
    return fetch(`${API_BASE}/setup/detect-models${query}`).then(j<ApiDetectModelsResult>);
  },
  startOllama: (path?: string) =>
    fetch(`${API_BASE}/setup/start-ollama`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: path ? JSON.stringify({ path }) : undefined,
    }).then(j<ApiOllamaStartResult>),
};

export type ApiProfile = { name: string; career: string; avatar: string | null };

export type ApiStorageInfo = {
  data_dir: string;
  on_external: boolean;
  used_bytes: number;
  used_human: string;
  free_bytes: number;
  free_human: string;
  total_bytes: number;
  total_human: string;
  location_file: string;
  memory_count: number;
  document_count: number;
};

export type ApiModelStorageInfo = {
  model_dir: string;
  on_external: boolean;
  location_file: string;
  has_models: boolean;
  model_count: number;
  used_bytes: number;
  used_human: string;
  free_bytes: number;
  free_human: string;
  total_bytes: number;
  total_human: string;
};

export type ApiLLMConfig = {
  ollama_host: string;
  vision_model: string;
  reasoning_model: string;
  writer_model: string;
};

export type ApiLLMTestResult = {
  success: boolean;
  message: string;
  available_models: string[];
};

export type ApiLLMStatus = {
  ollama_host: string;
  vision_model: string;
  reasoning_model: string;
  writer_model: string;
  online: boolean;
  available_models: string[];
};