# My_GPT 4 Students — Local Python Backend

This is the "brain" of the desktop app. It runs entirely on the student's PC
and talks to a local LLM (no internet required).

## Run it on Windows

Open a terminal inside this folder and run:

```bat
python -m venv .venv
.venv\Scripts\activate
pip install -r requirements.txt
python main.py
```

The server starts on **http://localhost:8000**. The React frontend already
points at this address.

Test it from another terminal:

```bat
curl http://localhost:8000/health
```

## Plugging in Ollama (real offline AI)

1. Install Ollama from https://ollama.com  (it runs as a Windows service).
2. In a terminal: `ollama pull llama3`  (downloads the model once).
3. `pip install ollama` inside the same venv as this backend.
4. Open `main.py`, find the `chat()` function, and replace the dummy reply
   with:

   ```python
   import ollama
   out = ollama.chat(
       model="llama3",
       messages=[{"role": "user", "content": req.message}],
   )
   reply = out["message"]["content"]
   ```

That's it — the React UI now talks to a real local LLM.

## Endpoints

| Method | Path          | What it does                                  |
|--------|---------------|-----------------------------------------------|
| GET    | `/health`     | Liveness check.                               |
| POST   | `/chat`       | Send a message, get a reply.                  |
| POST   | `/upload-pdf` | Upload a PDF / image into the local memory.   |

Uploaded files are stored in `./uploads/` next to `main.py`.

## Next steps (when you're ready)

- **Memory (RAG):** add `chromadb` + `sentence-transformers`, chunk PDFs on
  upload, retrieve relevant chunks before calling the LLM.
- **Vision:** swap to a multimodal model like `llava` or `moondream` and
  send image bytes to `ollama.chat(..., images=[bytes])`.
- **Documents out:** add `python-docx` and a `/export-docx` endpoint that
  turns a chat reply into a `.docx` file.
- **Package as `.exe`:** `pip install pyinstaller` then
  `pyinstaller --onefile main.py`.
