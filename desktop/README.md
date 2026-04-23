# My_GPT 4 Students — Native Windows Desktop App

This folder contains everything needed to package the React frontend + Python
FastAPI backend + Ollama orchestration into a single double‑clickable Windows
installer (`MyGPT-Setup.exe`) and a portable `.exe`.

## What gets bundled

```
MyGPT.exe                 ← Tauri shell (native Win32 window)
 ├── (embedded) React UI  ← compiled Vite build of artifacts/student-ai
 └── mygpt-backend.exe    ← PyInstaller bundle of python-backend/main.py
                            (auto-spawned on app launch, killed on close)
```

Ollama itself is **not** bundled — it must already be installed on the user's
machine. The Tauri shell auto-starts `ollama serve` in the background using the
portable model directory at `C:\dev\my-gpt\python-backend\models`.

## Building locally on Windows

Prerequisites:
- Node.js 20+, pnpm
- Python 3.11+
- Rust (stable) — `https://rustup.rs/`
- WebView2 runtime (preinstalled on Win10 21H2+/Win11)

```powershell
cd desktop
pnpm install
pnpm run build:all
```

The installer ends up at `desktop/src-tauri/target/release/bundle/nsis/`.

## Building on GitHub Actions

Push to `main` (or trigger the workflow manually) — see
`.github/workflows/desktop-windows.yml`. The built installer + portable `.exe`
are uploaded as workflow artifacts.

## Models

The app expects these three Ollama models (already pulled by the user):

| Role       | Model           |
|------------|-----------------|
| Vision     | `qwen3.5:0.8b`  |
| Reasoning  | `phi4-mini`     |
| Writer     | `llama3.2:1b`   |

Only **one** model is loaded into RAM at a time (`OLLAMA_MAX_LOADED_MODELS=1`)
so 8 GB machines are fine.
