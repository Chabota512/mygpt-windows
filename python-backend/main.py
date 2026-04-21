"""
My_GPT 4 Students — Local Python Backend
=========================================

A self-contained FastAPI server that the React frontend talks to on localhost.
Runs fully OFFLINE on a Windows PC. Stores data in a local SQLite file and
keeps uploaded files / generated documents on disk next to this script.

Quick start (Windows):

    python -m venv .venv
    .venv\\Scripts\\activate
    pip install -r requirements.txt
    python main.py

Then run the React frontend. It points at http://localhost:8000 by default.

Plugging in Ollama (real offline LLM) — see README.md.
"""

from __future__ import annotations

import os
import re
import sqlite3
import uuid
from datetime import datetime
from io import BytesIO
from pathlib import Path
from typing import List, Optional

from fastapi import FastAPI, File, HTTPException, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse
from pydantic import BaseModel
import uvicorn


# ──────────────────────────────────────────────────────────────────────
# Paths & DB
# ──────────────────────────────────────────────────────────────────────
ROOT = Path(__file__).parent
UPLOAD_DIR = ROOT / "uploads"
EXPORT_DIR = ROOT / "exports"
DB_PATH = ROOT / "studentai.db"
UPLOAD_DIR.mkdir(exist_ok=True)
EXPORT_DIR.mkdir(exist_ok=True)


def db() -> sqlite3.Connection:
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    conn.execute("PRAGMA foreign_keys = ON")
    return conn


def init_db() -> None:
    with db() as c:
        c.executescript(
            """
            CREATE TABLE IF NOT EXISTS sessions (
                id          TEXT PRIMARY KEY,
                label       TEXT NOT NULL,
                created_at  TEXT NOT NULL,
                updated_at  TEXT NOT NULL
            );

            CREATE TABLE IF NOT EXISTS messages (
                id          INTEGER PRIMARY KEY AUTOINCREMENT,
                session_id  TEXT NOT NULL REFERENCES sessions(id) ON DELETE CASCADE,
                role        TEXT NOT NULL,
                content     TEXT NOT NULL,
                created_at  TEXT NOT NULL
            );

            CREATE TABLE IF NOT EXISTS memory_items (
                id          TEXT PRIMARY KEY,
                filename    TEXT NOT NULL,
                kind        TEXT NOT NULL,             -- 'pdf' | 'image' | 'doc'
                size_bytes  INTEGER NOT NULL,
                path        TEXT NOT NULL,
                text        TEXT NOT NULL DEFAULT '',  -- extracted text for search
                created_at  TEXT NOT NULL
            );

            CREATE TABLE IF NOT EXISTS documents (
                id          TEXT PRIMARY KEY,
                title       TEXT NOT NULL,
                format      TEXT NOT NULL,             -- 'docx' | 'pdf'
                path        TEXT NOT NULL,
                size_bytes  INTEGER NOT NULL,
                prompt      TEXT NOT NULL DEFAULT '',
                created_at  TEXT NOT NULL
            );
            """
        )

        # Seed one welcome session if DB is fresh
        cur = c.execute("SELECT COUNT(*) AS n FROM sessions")
        if cur.fetchone()["n"] == 0:
            sid = uuid.uuid4().hex[:10]
            now = datetime.utcnow().isoformat()
            c.execute(
                "INSERT INTO sessions (id, label, created_at, updated_at) VALUES (?,?,?,?)",
                (sid, "Welcome", now, now),
            )


init_db()


# ──────────────────────────────────────────────────────────────────────
# App + CORS
# ──────────────────────────────────────────────────────────────────────
app = FastAPI(title="My_GPT 4 Students — Local Backend", version="0.2.0")
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# ──────────────────────────────────────────────────────────────────────
# Schemas
# ──────────────────────────────────────────────────────────────────────
class ChatMsg(BaseModel):
    role: str
    content: str


class ChatRequest(BaseModel):
    message: str
    session_id: Optional[str] = None


class ChatResponse(BaseModel):
    reply: str
    timestamp: str
    model: str
    session_id: str


class SessionOut(BaseModel):
    id: str
    label: str
    time: str  # "Now", "Today", date — friendly relative label


class SessionCreate(BaseModel):
    label: Optional[str] = "New Chat"


class SessionRename(BaseModel):
    label: str


class MemoryItemOut(BaseModel):
    id: str
    filename: str
    kind: str
    size_bytes: int
    created_at: str


class SearchRequest(BaseModel):
    query: str


class SearchHit(BaseModel):
    id: str
    type: str        # 'pdf' | 'image' | 'doc'
    title: str
    path: str
    snippet: str
    meta: str
    relevance: int


class SearchResponse(BaseModel):
    query: str
    results: List[SearchHit]


class GenerateDocRequest(BaseModel):
    prompt: str
    title: Optional[str] = None
    format: str = "docx"     # 'docx' | 'pdf'
    session_id: Optional[str] = None


class DocumentOut(BaseModel):
    id: str
    title: str
    format: str
    size_bytes: int
    created_at: str
    download_url: str
    sections: List[str]


# ──────────────────────────────────────────────────────────────────────
# Helpers
# ──────────────────────────────────────────────────────────────────────
def _kind_for(filename: str) -> str:
    ext = Path(filename).suffix.lower()
    if ext == ".pdf":
        return "pdf"
    if ext in {".png", ".jpg", ".jpeg", ".gif", ".webp", ".bmp"}:
        return "image"
    return "doc"


def _friendly_time(iso_ts: str) -> str:
    try:
        ts = datetime.fromisoformat(iso_ts.rstrip("Z"))
    except Exception:
        return ""
    delta = datetime.utcnow() - ts
    if delta.total_seconds() < 60:
        return "Now"
    if delta.total_seconds() < 3600:
        return f"{int(delta.total_seconds() // 60)}m ago"
    if delta.days == 0:
        return "Today"
    if delta.days == 1:
        return "Yesterday"
    if delta.days < 7:
        return ts.strftime("%a")
    return ts.strftime("%b %d")


def _extract_pdf_text(path: Path) -> str:
    try:
        from pypdf import PdfReader  # lazy import
        reader = PdfReader(str(path))
        chunks = []
        for page in reader.pages[:50]:  # cap for safety
            try:
                chunks.append(page.extract_text() or "")
            except Exception:
                continue
        return "\n".join(chunks).strip()
    except Exception as e:
        print(f"[pdf] extract failed for {path.name}: {e}")
        return ""


def _bump_session(session_id: str) -> None:
    with db() as c:
        c.execute(
            "UPDATE sessions SET updated_at = ? WHERE id = ?",
            (datetime.utcnow().isoformat(), session_id),
        )


def _llm_reply(message: str, history: List[ChatMsg]) -> str:
    """
    Local-LLM call. Returns a stub today; swap with Ollama on the user's PC.

    --- Replace this body with: ----------------------------------------
    import ollama
    msgs = [{"role": m.role, "content": m.content} for m in history]
    msgs.append({"role": "user", "content": message})
    out = ollama.chat(model="llama3", messages=msgs)
    return out["message"]["content"]
    --------------------------------------------------------------------
    """
    return (
        f"(local stub) I received: \"{message.strip()}\".\n\n"
        "Plug in Ollama in main.py to get real answers — see README.md."
    )


# ──────────────────────────────────────────────────────────────────────
# Root / health
# ──────────────────────────────────────────────────────────────────────
@app.get("/")
def root():
    return {"app": "My_GPT 4 Students backend", "status": "ok"}


@app.get("/health")
def health():
    return {"status": "ok", "time": datetime.utcnow().isoformat() + "Z"}


# ──────────────────────────────────────────────────────────────────────
# Sessions
# ──────────────────────────────────────────────────────────────────────
@app.get("/sessions", response_model=List[SessionOut])
def list_sessions():
    with db() as c:
        rows = c.execute(
            "SELECT id, label, updated_at FROM sessions ORDER BY updated_at DESC"
        ).fetchall()
    return [
        SessionOut(id=r["id"], label=r["label"], time=_friendly_time(r["updated_at"]))
        for r in rows
    ]


@app.post("/sessions", response_model=SessionOut)
def create_session(body: SessionCreate):
    sid = uuid.uuid4().hex[:10]
    now = datetime.utcnow().isoformat()
    label = (body.label or "New Chat").strip() or "New Chat"
    with db() as c:
        c.execute(
            "INSERT INTO sessions (id, label, created_at, updated_at) VALUES (?,?,?,?)",
            (sid, label, now, now),
        )
    return SessionOut(id=sid, label=label, time="Now")


@app.patch("/sessions/{session_id}", response_model=SessionOut)
def rename_session(session_id: str, body: SessionRename):
    label = body.label.strip()
    if not label:
        raise HTTPException(400, "Label cannot be empty.")
    with db() as c:
        c.execute("UPDATE sessions SET label = ? WHERE id = ?", (label, session_id))
        row = c.execute(
            "SELECT id, label, updated_at FROM sessions WHERE id = ?", (session_id,)
        ).fetchone()
    if not row:
        raise HTTPException(404, "Session not found.")
    return SessionOut(id=row["id"], label=row["label"], time=_friendly_time(row["updated_at"]))


@app.delete("/sessions/{session_id}")
def delete_session(session_id: str):
    with db() as c:
        c.execute("DELETE FROM sessions WHERE id = ?", (session_id,))
    return {"ok": True}


@app.get("/sessions/{session_id}/messages", response_model=List[ChatMsg])
def session_messages(session_id: str):
    with db() as c:
        rows = c.execute(
            "SELECT role, content FROM messages WHERE session_id = ? ORDER BY id ASC",
            (session_id,),
        ).fetchall()
    return [ChatMsg(role=r["role"], content=r["content"]) for r in rows]


# ──────────────────────────────────────────────────────────────────────
# Chat
# ──────────────────────────────────────────────────────────────────────
@app.post("/chat", response_model=ChatResponse)
def chat(req: ChatRequest):
    msg = (req.message or "").strip()
    if not msg:
        raise HTTPException(400, "Message cannot be empty.")

    # Ensure session exists (create on the fly if needed)
    sid = req.session_id
    with db() as c:
        if not sid or not c.execute(
            "SELECT 1 FROM sessions WHERE id = ?", (sid,)
        ).fetchone():
            sid = uuid.uuid4().hex[:10]
            now = datetime.utcnow().isoformat()
            label = (msg[:40] + ("…" if len(msg) > 40 else "")) or "New Chat"
            c.execute(
                "INSERT INTO sessions (id, label, created_at, updated_at) VALUES (?,?,?,?)",
                (sid, label, now, now),
            )

        # Pull last 20 messages as history for the LLM
        rows = c.execute(
            "SELECT role, content FROM messages WHERE session_id = ? "
            "ORDER BY id DESC LIMIT 20",
            (sid,),
        ).fetchall()
    history = [ChatMsg(role=r["role"], content=r["content"]) for r in reversed(rows)]

    reply = _llm_reply(msg, history)

    now_iso = datetime.utcnow().isoformat()
    with db() as c:
        c.execute(
            "INSERT INTO messages (session_id, role, content, created_at) VALUES (?,?,?,?)",
            (sid, "user", msg, now_iso),
        )
        c.execute(
            "INSERT INTO messages (session_id, role, content, created_at) VALUES (?,?,?,?)",
            (sid, "assistant", reply, now_iso),
        )
    _bump_session(sid)

    return ChatResponse(
        reply=reply,
        timestamp=datetime.now().strftime("%H:%M"),
        model="stub-dev",
        session_id=sid,
    )


# ──────────────────────────────────────────────────────────────────────
# Memory (uploads)
# ──────────────────────────────────────────────────────────────────────
@app.get("/memory", response_model=List[MemoryItemOut])
def list_memory():
    with db() as c:
        rows = c.execute(
            "SELECT id, filename, kind, size_bytes, created_at "
            "FROM memory_items ORDER BY created_at DESC"
        ).fetchall()
    return [MemoryItemOut(**dict(r)) for r in rows]


@app.post("/upload-pdf", response_model=MemoryItemOut)
async def upload_pdf(file: UploadFile = File(...)):
    if not file.filename:
        raise HTTPException(400, "No filename provided.")

    file_id = uuid.uuid4().hex[:12]
    safe = Path(file.filename).name
    target = UPLOAD_DIR / f"{file_id}__{safe}"
    contents = await file.read()
    target.write_bytes(contents)

    kind = _kind_for(safe)
    text = _extract_pdf_text(target) if kind == "pdf" else ""
    now = datetime.utcnow().isoformat()
    with db() as c:
        c.execute(
            "INSERT INTO memory_items (id, filename, kind, size_bytes, path, text, created_at) "
            "VALUES (?,?,?,?,?,?,?)",
            (file_id, safe, kind, len(contents), str(target), text, now),
        )

    print(f"[upload] {safe}  ({len(contents)} bytes, kind={kind})")
    return MemoryItemOut(
        id=file_id,
        filename=safe,
        kind=kind,
        size_bytes=len(contents),
        created_at=now,
    )


@app.delete("/memory/{item_id}")
def delete_memory(item_id: str):
    with db() as c:
        row = c.execute(
            "SELECT path FROM memory_items WHERE id = ?", (item_id,)
        ).fetchone()
        if row:
            try:
                Path(row["path"]).unlink(missing_ok=True)
            except Exception:
                pass
        c.execute("DELETE FROM memory_items WHERE id = ?", (item_id,))
    return {"ok": True}


@app.get("/memory/{item_id}/file")
def download_memory(item_id: str):
    with db() as c:
        row = c.execute(
            "SELECT path, filename FROM memory_items WHERE id = ?", (item_id,)
        ).fetchone()
    if not row:
        raise HTTPException(404, "Not found.")
    return FileResponse(row["path"], filename=row["filename"])


# ──────────────────────────────────────────────────────────────────────
# Search
# ──────────────────────────────────────────────────────────────────────
def _make_snippet(text: str, query: str, width: int = 180) -> str:
    if not text:
        return ""
    lower = text.lower()
    q = query.lower().strip()
    idx = lower.find(q) if q else -1
    if idx < 0:
        return text[:width].strip() + ("…" if len(text) > width else "")
    start = max(0, idx - width // 2)
    end = min(len(text), idx + len(q) + width // 2)
    snip = text[start:end].strip()
    # bold the match
    if q:
        pattern = re.compile(re.escape(query), re.IGNORECASE)
        snip = pattern.sub(lambda m: f"**{m.group(0)}**", snip)
    prefix = "…" if start > 0 else ""
    suffix = "…" if end < len(text) else ""
    return f"{prefix}{snip}{suffix}"


@app.post("/search", response_model=SearchResponse)
def search(req: SearchRequest):
    q = (req.query or "").strip()
    if not q:
        return SearchResponse(query=q, results=[])

    with db() as c:
        rows = c.execute(
            "SELECT id, filename, kind, size_bytes, text, created_at "
            "FROM memory_items"
        ).fetchall()

    hits: List[SearchHit] = []
    q_lower = q.lower()
    for r in rows:
        name = r["filename"] or ""
        text = r["text"] or ""
        in_name = q_lower in name.lower()
        in_text = q_lower in text.lower()
        if not (in_name or in_text):
            continue
        relevance = 95 if in_name and in_text else (85 if in_name else 70)
        snippet = _make_snippet(text, q) if in_text else f"Match in filename: **{name}**"
        kb = max(1, r["size_bytes"] // 1024)
        meta = f"{r['kind'].upper()} · {kb} KB"
        hits.append(
            SearchHit(
                id=r["id"],
                type=r["kind"],
                title=name,
                path=f"Memory › {r['kind'].upper()} › {_friendly_time(r['created_at'])}",
                snippet=snippet or name,
                meta=meta,
                relevance=relevance,
            )
        )
    hits.sort(key=lambda h: h.relevance, reverse=True)
    return SearchResponse(query=q, results=hits)


# ──────────────────────────────────────────────────────────────────────
# Documents (generate / list / download)
# ──────────────────────────────────────────────────────────────────────
DEFAULT_SECTIONS = [
    "Title Page",
    "Abstract",
    "Introduction",
    "Experimental Setup",
    "Results & Analysis",
    "Conclusion & References",
]


def _doc_body_from_prompt(prompt: str) -> List[tuple[str, str]]:
    """Build a structured (heading, paragraph) list from the prompt.
    Once Ollama is wired in, replace this with real generation per section.
    """
    intro = prompt.strip()
    return [
        ("Abstract",
         f"This document was generated locally on the student's PC. Topic: {intro[:140]}"),
        ("Introduction",
         intro or "Introduction to be generated by the local LLM."),
        ("Experimental Setup",
         "Describe the equipment, materials and procedure used. (Generated locally.)"),
        ("Results & Analysis",
         "Summarise the data collected and interpret the findings. (Generated locally.)"),
        ("Conclusion & References",
         "Summarise the outcomes and list any references used. (Generated locally.)"),
    ]


def _build_docx(title: str, sections: List[tuple[str, str]]) -> bytes:
    from docx import Document
    from docx.shared import Pt
    doc = Document()
    h = doc.add_heading(title, level=0)
    for run in h.runs:
        run.font.size = Pt(20)
    doc.add_paragraph(datetime.now().strftime("Generated %B %d, %Y · My_GPT 4 Students (offline)"))
    for heading, body in sections:
        doc.add_heading(heading, level=1)
        doc.add_paragraph(body)
    buf = BytesIO()
    doc.save(buf)
    return buf.getvalue()


def _build_pdf(title: str, sections: List[tuple[str, str]]) -> bytes:
    from reportlab.lib.pagesizes import LETTER
    from reportlab.lib.styles import getSampleStyleSheet
    from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer
    buf = BytesIO()
    doc = SimpleDocTemplate(buf, pagesize=LETTER, title=title)
    styles = getSampleStyleSheet()
    flow = [
        Paragraph(title, styles["Title"]),
        Paragraph(
            datetime.now().strftime("Generated %B %d, %Y · My_GPT 4 Students (offline)"),
            styles["Italic"],
        ),
        Spacer(1, 18),
    ]
    for heading, body in sections:
        flow.append(Paragraph(heading, styles["Heading2"]))
        flow.append(Paragraph(body.replace("\n", "<br/>"), styles["BodyText"]))
        flow.append(Spacer(1, 10))
    doc.build(flow)
    return buf.getvalue()


@app.get("/documents", response_model=List[DocumentOut])
def list_documents():
    with db() as c:
        rows = c.execute(
            "SELECT id, title, format, size_bytes, created_at FROM documents "
            "ORDER BY created_at DESC"
        ).fetchall()
    return [
        DocumentOut(
            id=r["id"],
            title=r["title"],
            format=r["format"],
            size_bytes=r["size_bytes"],
            created_at=r["created_at"],
            download_url=f"/documents/{r['id']}/download",
            sections=DEFAULT_SECTIONS,
        )
        for r in rows
    ]


@app.post("/documents/generate", response_model=DocumentOut)
def generate_document(req: GenerateDocRequest):
    prompt = (req.prompt or "").strip()
    if not prompt:
        raise HTTPException(400, "Prompt cannot be empty.")
    fmt = (req.format or "docx").lower()
    if fmt not in {"docx", "pdf"}:
        raise HTTPException(400, "Format must be 'docx' or 'pdf'.")

    title = (req.title or prompt.split("\n")[0])[:80].strip() or "Generated Document"
    sections = _doc_body_from_prompt(prompt)

    data = _build_docx(title, sections) if fmt == "docx" else _build_pdf(title, sections)

    doc_id = uuid.uuid4().hex[:12]
    safe_title = re.sub(r"[^A-Za-z0-9]+", "_", title).strip("_") or "document"
    target = EXPORT_DIR / f"{doc_id}__{safe_title}.{fmt}"
    target.write_bytes(data)

    now = datetime.utcnow().isoformat()
    with db() as c:
        c.execute(
            "INSERT INTO documents (id, title, format, path, size_bytes, prompt, created_at) "
            "VALUES (?,?,?,?,?,?,?)",
            (doc_id, title, fmt, str(target), len(data), prompt, now),
        )

    # Drop a record into chat history if a session is provided
    if req.session_id:
        with db() as c:
            if c.execute("SELECT 1 FROM sessions WHERE id = ?", (req.session_id,)).fetchone():
                c.execute(
                    "INSERT INTO messages (session_id, role, content, created_at) VALUES (?,?,?,?)",
                    (req.session_id, "user", f"[Write Doc] {prompt}", now),
                )
                c.execute(
                    "INSERT INTO messages (session_id, role, content, created_at) VALUES (?,?,?,?)",
                    (
                        req.session_id,
                        "assistant",
                        f"Generated **{title}** ({fmt.upper()}). It's saved to your local exports folder.",
                        now,
                    ),
                )
                _bump_session(req.session_id)

    return DocumentOut(
        id=doc_id,
        title=title,
        format=fmt,
        size_bytes=len(data),
        created_at=now,
        download_url=f"/documents/{doc_id}/download",
        sections=[s[0] for s in sections],
    )


@app.get("/documents/{doc_id}/download")
def download_document(doc_id: str):
    with db() as c:
        row = c.execute(
            "SELECT path, title, format FROM documents WHERE id = ?", (doc_id,)
        ).fetchone()
    if not row:
        raise HTTPException(404, "Not found.")
    fname = re.sub(r"[^A-Za-z0-9]+", "_", row["title"]).strip("_") or "document"
    return FileResponse(row["path"], filename=f"{fname}.{row['format']}")


@app.delete("/documents/{doc_id}")
def delete_document(doc_id: str):
    with db() as c:
        row = c.execute("SELECT path FROM documents WHERE id = ?", (doc_id,)).fetchone()
        if row:
            try:
                Path(row["path"]).unlink(missing_ok=True)
            except Exception:
                pass
        c.execute("DELETE FROM documents WHERE id = ?", (doc_id,))
    return {"ok": True}


# ──────────────────────────────────────────────────────────────────────
# Profile (just JSON on disk so it persists across restarts)
# ──────────────────────────────────────────────────────────────────────
PROFILE_PATH = ROOT / "profile.json"


class Profile(BaseModel):
    name: str = "Student"
    career: str = ""
    avatar: Optional[str] = None  # data URL


@app.get("/profile", response_model=Profile)
def get_profile():
    if PROFILE_PATH.exists():
        import json
        try:
            return Profile(**json.loads(PROFILE_PATH.read_text("utf-8")))
        except Exception:
            pass
    return Profile()


@app.put("/profile", response_model=Profile)
def put_profile(p: Profile):
    import json
    PROFILE_PATH.write_text(json.dumps(p.model_dump(), ensure_ascii=False), "utf-8")
    return p


# ──────────────────────────────────────────────────────────────────────
# Entry point
# ──────────────────────────────────────────────────────────────────────
if __name__ == "__main__":
    port = int(os.environ.get("PORT", "8000"))
    uvicorn.run("main:app", host="127.0.0.1", port=port, reload=True)
