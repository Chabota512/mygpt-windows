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

## Where your data is kept ("head on PC, body on external drive")

The app code itself is small — only a few megabytes. But uploaded notes,
generated documents, and the chat database can grow over time. So we let
**you** decide where the data lives.

You have three choices, in order of priority:

1. **Set an environment variable** (most flexible)
   ```bat
   set MYGPT_DATA_DIR=E:\MyGPTData
   python main.py
   ```

2. **Edit `data_location.txt`** (easiest — no terminal needed)
   Just open `data_location.txt` in Notepad and put a folder path on a line
   of its own, for example:
   ```
   E:\MyGPTData
   ```
   Save the file and start the app — your chats, files, and documents will
   now live on the external drive.

3. **Do nothing** — data is kept inside this folder under `./data/`.

When the app starts, it prints the data folder it's using:
```
[My_GPT] Data folder: E:\MyGPTData
```

### Tip for low-disk-space PCs

Plug in a USB stick or external drive, create a folder on it (say
`E:\MyGPTData`), put that path in `data_location.txt`, and you're done.
The app on the PC stays tiny; the heavy stuff lives on the drive.
You can even unplug the drive when you don't need the app — just plug it
back in before you start it again.

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

| Method | Path                  | What it does                                  |
|--------|-----------------------|-----------------------------------------------|
| GET    | `/health`             | Liveness check.                               |
| POST   | `/chat`               | Send a message, get a reply.                  |
| POST   | `/upload-pdf`         | Upload a PDF / image into the local memory.   |
| GET    | `/memory`             | List items in local memory.                   |
| POST   | `/search`             | Full-text search across uploaded notes.       |
| POST   | `/documents/generate` | Generate a DOCX or PDF document.              |
| GET    | `/profile`            | Get the user profile (offline cached).        |
| PUT    | `/profile`            | Save the user profile.                        |

## Next steps (when you're ready)

- **Smarter memory (RAG):** add `chromadb` + `sentence-transformers`,
  chunk PDFs on upload, retrieve relevant chunks before calling the LLM.
- **Vision:** swap to a multimodal model like `llava` or `moondream` and
  send image bytes to `ollama.chat(..., images=[bytes])`.
- **Package as `.exe`:** `pip install pyinstaller` then
  `pyinstaller --onefile main.py`.
