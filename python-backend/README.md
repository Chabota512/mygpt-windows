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

## Where the AI model is kept ("carry one model, install anywhere")

The AI model is the **biggest** file (often 4–8 GB). You don't want to
re-download it on every PC. Instead:

1. Download the model **once** on your own PC (e.g. with Ollama, or grab
   the `.gguf` file directly).
2. Copy the model folder to your USB / external drive — for example
   `E:\MyGPTModels`.
3. On any PC where you install My_GPT, point the app at that folder.

You have the same three choices as the data folder, in order of priority:

1. **Set an environment variable**
   ```bat
   set MYGPT_MODEL_DIR=E:\MyGPTModels
   python main.py
   ```

2. **Edit `model_location.txt`** (easiest — no terminal needed)
   Open `model_location.txt` in Notepad and put a folder path on a line
   of its own, for example:
   ```
   E:\MyGPTModels
   ```

3. **Do nothing** — the app looks for models inside `./models/`.

When the app starts, it prints the model folder it's using:
```
[My_GPT] Model folder: E:\MyGPTModels
```

You can also see and verify all of this from inside the app: open
**Settings → Model folder**. It shows the current path, whether it's on
an external drive, how many model files it found, and how much space
they take.

## Plugging in Ollama (real offline AI)

1. Install Ollama from https://ollama.com  (it runs as a Windows service).
2. Tell Ollama where to keep its models so they live on your portable drive
   (this is what makes them reusable across PCs):
   ```bat
   set OLLAMA_MODELS=E:\MyGPTModels
   ```
   On the same drive, also point My_GPT at it via `model_location.txt` or
   `MYGPT_MODEL_DIR` (see above).
3. Pull the model **once**: `ollama pull llama3`  (downloads to the drive).
4. `pip install ollama` inside the same venv as this backend.
5. Open `main.py`, find the `_llm_reply()` function, and replace the dummy
   reply with:

   ```python
   import ollama
   out = ollama.chat(
       model="llama3",
       messages=[{"role": "user", "content": message}],
   )
   return out["message"]["content"]
   ```

That's it — the React UI now talks to a real local LLM, and the model
itself is portable. Plug the drive into another PC, install the small app,
point it at the same folder, and you're running offline AI again with
zero re-download.

## Endpoints

| Method | Path                  | What it does                                  |
|--------|-----------------------|-----------------------------------------------|
| GET    | `/health`             | Liveness check.                               |
| POST   | `/chat`               | Send a message, get a reply.                  |
| POST   | `/upload-pdf`         | Upload a PDF / image into the local memory.   |
| GET    | `/memory`             | List items in local memory.                   |
| POST   | `/search`             | Full-text search across uploaded notes.       |
| POST   | `/documents/generate` | Generate a DOCX or PDF document.              |
| GET    | `/storage`            | Where data lives + free/used space.           |
| GET    | `/model-storage`      | Where the AI model lives + free/used space.   |
| GET    | `/profile`            | Get the user profile (offline cached).        |
| PUT    | `/profile`            | Save the user profile.                        |

## Next steps (when you're ready)

- **Smarter memory (RAG):** add `chromadb` + `sentence-transformers`,
  chunk PDFs on upload, retrieve relevant chunks before calling the LLM.
- **Vision:** swap to a multimodal model like `llava` or `moondream` and
  send image bytes to `ollama.chat(..., images=[bytes])`.
- **Package as `.exe`:** `pip install pyinstaller` then
  `pyinstaller --onefile main.py`.
