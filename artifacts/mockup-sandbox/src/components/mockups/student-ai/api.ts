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
  chat: (message: string, session_id?: string | null) =>
    fetch(`${API_BASE}/chat`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ message, session_id: session_id ?? null }),
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
};
