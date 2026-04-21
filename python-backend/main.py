"""
My_GPT 4 Students — Local Python Backend
=========================================

A small FastAPI server that the React frontend talks to on localhost.
Designed to run fully OFFLINE on a Windows PC once you plug in a local
LLM (Ollama, llama-cpp-python, etc.).

Quick start (Windows, in a terminal inside this folder):

    python -m venv .venv
    .venv\\Scripts\\activate
    pip install -r requirements.txt
    python main.py

Then in another terminal start the React frontend. The UI talks to
http://localhost:8000 by default.

To plug in a real local LLM (Ollama):

    pip install ollama
    # then replace the dummy reply in /chat with:
    #     import ollama
    #     out = ollama.chat(model="llama3",
    #         messages=[{"role": "user", "content": req.message}])
    #     reply = out["message"]["content"]
"""

from __future__ import annotations

import os
import uuid
from datetime import datetime
from pathlib import Path
from typing import List, Optional

from fastapi import FastAPI, File, UploadFile, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
import uvicorn


# ──────────────────────────────────────────────────────────────────────
# App + CORS so the React frontend (any localhost port) can call us
# ──────────────────────────────────────────────────────────────────────
app = FastAPI(title="My_GPT 4 Students — Local Backend", version="0.1.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],          # local app, fine to be permissive
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# Where uploaded PDFs / images get stored on the user's PC
UPLOAD_DIR = Path(__file__).parent / "uploads"
UPLOAD_DIR.mkdir(exist_ok=True)


# ──────────────────────────────────────────────────────────────────────
# Schemas
# ──────────────────────────────────────────────────────────────────────
class ChatMessage(BaseModel):
    role: str            # "user" | "assistant"
    content: str


class ChatRequest(BaseModel):
    message: str
    history: Optional[List[ChatMessage]] = None
    session_id: Optional[str] = None


class ChatResponse(BaseModel):
    reply: str
    timestamp: str
    model: str


class UploadResponse(BaseModel):
    id: str
    filename: str
    size_bytes: int
    saved_to: str


# ──────────────────────────────────────────────────────────────────────
# Routes
# ──────────────────────────────────────────────────────────────────────
@app.get("/")
def root():
    return {
        "app": "My_GPT 4 Students backend",
        "status": "ok",
        "hint": "POST /chat  ·  POST /upload-pdf  ·  GET /health",
    }


@app.get("/health")
def health():
    return {"status": "ok", "time": datetime.utcnow().isoformat() + "Z"}


@app.post("/chat", response_model=ChatResponse)
def chat(req: ChatRequest):
    """
    Returns a dummy reply for now. Swap the body of this function with
    a real local-LLM call (Ollama / llama-cpp-python) when you're ready.
    """
    if not req.message or not req.message.strip():
        raise HTTPException(status_code=400, detail="Message cannot be empty.")

    # ── DUMMY REPLY (replace with Ollama call on your PC) ────────────
    reply = (
        f"(local backend stub) I received: \"{req.message.strip()}\".\n\n"
        "Plug in Ollama in main.py to get real answers — see the comment "
        "at the top of the file."
    )
    # ─────────────────────────────────────────────────────────────────

    return ChatResponse(
        reply=reply,
        timestamp=datetime.now().strftime("%H:%M"),
        model="stub-dev",
    )


@app.post("/upload-pdf", response_model=UploadResponse)
async def upload_pdf(file: UploadFile = File(...)):
    """
    Accepts a PDF (or image) and stores it locally so the RAG / vision
    pipeline can index it later.
    """
    if file.filename is None:
        raise HTTPException(status_code=400, detail="No filename provided.")

    file_id = uuid.uuid4().hex[:12]
    safe_name = Path(file.filename).name
    target = UPLOAD_DIR / f"{file_id}__{safe_name}"

    contents = await file.read()
    target.write_bytes(contents)

    print(f"[upload] saved {target.name} ({len(contents)} bytes)")

    return UploadResponse(
        id=file_id,
        filename=safe_name,
        size_bytes=len(contents),
        saved_to=str(target),
    )


# ──────────────────────────────────────────────────────────────────────
# Entry point
# ──────────────────────────────────────────────────────────────────────
if __name__ == "__main__":
    port = int(os.environ.get("PORT", "8000"))
    uvicorn.run("main:app", host="127.0.0.1", port=port, reload=True)
