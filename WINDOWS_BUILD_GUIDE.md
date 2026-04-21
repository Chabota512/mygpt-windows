# My_GPT 4 Students — Local Setup & Native Windows App Build

This guide walks you from “I just downloaded the project zip” to “I have a
double‑clickable `My_GPT-Setup.exe` on Windows”.

The app has two parts:

- **Python backend** — `python-backend/` (FastAPI, SQLite, local LLM hookup)
- **React frontend** — `artifacts/mockup-sandbox/` (Vite + React + Tailwind)

For a native Windows app we will:

1. Run both parts locally and confirm they work.
2. Freeze the Python backend into a single `.exe` with **PyInstaller**.
3. Wrap the React frontend in **Electron**, which spawns the backend `.exe`.
4. Build a Windows installer with **electron‑builder**.

---

## 0. One‑time prerequisites (install on your Windows PC)

Install these once, in this order:

| Tool | Version | Notes |
|---|---|---|
| Python | 3.11 or 3.12 (64‑bit) | Tick **“Add Python to PATH”** in the installer. |
| Node.js | 20 LTS or 22 LTS | The Windows MSI from nodejs.org. |
| pnpm | latest | After Node, run `npm install -g pnpm` in PowerShell. |
| Git | latest | Optional but recommended. |
| (Optional) Ollama | latest | Only needed if you want a real local LLM. Get it from ollama.com. |

Open a fresh PowerShell window after installing and check:

```powershell
python --version
node --version
pnpm --version
```

---

## 1. Unzip the project

Put the downloaded folder somewhere short, e.g. `C:\dev\my-gpt`.
Avoid OneDrive paths — they sometimes break native builds.

Project layout you should see:

```
my-gpt\
  package.json
  pnpm-workspace.yaml
  python-backend\        <-- FastAPI server (the “brain”)
  artifacts\
    mockup-sandbox\      <-- React/Vite frontend (the UI)
    api-server\          <-- Express helper API (kept from Replit; optional)
```

---

## 2. Get the Python backend running

```powershell
cd C:\dev\my-gpt\python-backend

python -m venv .venv
.\.venv\Scripts\activate

pip install --upgrade pip
pip install -r requirements.txt

python main.py
```

You should see:

```
[My_GPT] Data folder: C:\dev\my-gpt\python-backend\data
[My_GPT] Model folder: C:\dev\my-gpt\python-backend\models
Uvicorn running on http://127.0.0.1:8000
```

Open http://127.0.0.1:8000/health in a browser — you should get
`{"status":"ok",...}`. Leave it running.

### Where the data lives

- Edit `python-backend\data_location.txt` to put chats / uploads on an
  external drive (e.g. `E:\MyGPTData`).
- Edit `python-backend\model_location.txt` to point at a folder that already
  has the AI model (great for installing on a friend’s PC from a USB stick).

### Plug in a real local LLM (optional but recommended)

1. Install **Ollama**, then in a new terminal:
   ```powershell
   ollama pull llama3
   ```
2. In `python-backend\main.py`, find the `_llm_reply` function and replace
   its body with the Ollama snippet that’s commented in the docstring:
   ```python
   import ollama
   msgs = [{"role": m.role, "content": m.content} for m in history]
   msgs.append({"role": "user", "content": message})
   out = ollama.chat(model="llama3", messages=msgs)
   return out["message"]["content"]
   ```
3. Add `ollama` to `requirements.txt` and `pip install ollama`.
4. Restart `python main.py`.

---

## 3. Get the React frontend running

In a **new** PowerShell window (keep the backend running in the first one):

```powershell
cd C:\dev\my-gpt
pnpm install

cd artifacts\mockup-sandbox
pnpm dev
```

Vite will print a URL like `http://localhost:5173`. Open it.
You should see the My_GPT UI talking to the Python backend on port 8000.

If the frontend can’t reach the backend, search the frontend source for
`localhost:8000` / `127.0.0.1:8000` and confirm those URLs are correct.

---

## 4. Freeze the Python backend into a single `.exe`

Stop the running backend (Ctrl+C). With the venv still active:

```powershell
cd C:\dev\my-gpt\python-backend
pip install pyinstaller

pyinstaller --onefile --name mygpt-backend ^
  --hidden-import=uvicorn.logging ^
  --hidden-import=uvicorn.loops.auto ^
  --hidden-import=uvicorn.protocols.http.auto ^
  --hidden-import=uvicorn.protocols.websockets.auto ^
  --hidden-import=uvicorn.lifespan.on ^
  main.py
```

When it finishes you’ll have:

```
python-backend\dist\mygpt-backend.exe
```

Test it by double‑clicking it (a console window opens, listening on
http://127.0.0.1:8000). Close it when done.

> First build is slow (a few minutes). Repeat builds are quick.

---

## 5. Wrap the frontend in Electron

We’ll add a small Electron shell that:

- builds the React app to static files (`vite build`)
- launches `mygpt-backend.exe` as a child process on app start
- shows the built UI in a desktop window
- kills the backend when you close the app

### 5a. Create the Electron folder

From the project root:

```powershell
cd C:\dev\my-gpt
mkdir electron-app
cd electron-app
pnpm init
```

Install Electron + builder:

```powershell
pnpm add -D electron electron-builder
```

### 5b. `electron-app/main.js`

Create `electron-app/main.js`:

```js
const { app, BrowserWindow } = require('electron');
const { spawn } = require('child_process');
const path = require('path');
const fs = require('fs');

let backendProcess = null;
let mainWindow = null;

function startBackend() {
  // In dev: run from python-backend/dist. In packaged build: from resources.
  const exeName = process.platform === 'win32'
    ? 'mygpt-backend.exe'
    : 'mygpt-backend';

  const candidates = [
    path.join(process.resourcesPath, 'backend', exeName),               // packaged
    path.join(__dirname, '..', 'python-backend', 'dist', exeName),      // dev
  ];

  const exePath = candidates.find(p => fs.existsSync(p));
  if (!exePath) {
    console.error('Backend exe not found. Looked in:', candidates);
    return;
  }

  backendProcess = spawn(exePath, [], {
    cwd: path.dirname(exePath),
    stdio: 'inherit',
    windowsHide: true,
  });
}

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1280,
    height: 820,
    autoHideMenuBar: true,
    webPreferences: { contextIsolation: true },
  });

  // Load the built React app
  mainWindow.loadFile(path.join(__dirname, 'renderer', 'index.html'));
}

app.whenReady().then(() => {
  startBackend();
  // Give uvicorn ~1s to bind the port before the UI fires its first request.
  setTimeout(createWindow, 1000);
});

app.on('window-all-closed', () => {
  if (backendProcess) backendProcess.kill();
  if (process.platform !== 'darwin') app.quit();
});
```

### 5c. Update `electron-app/package.json`

Replace the generated file with:

```json
{
  "name": "my-gpt-desktop",
  "version": "1.0.0",
  "description": "My_GPT 4 Students — Desktop",
  "main": "main.js",
  "scripts": {
    "build:renderer": "pnpm --filter @workspace/mockup-sandbox build && node ./copy-renderer.js",
    "build:backend": "pyinstaller --onefile --name mygpt-backend --distpath ../python-backend/dist ../python-backend/main.py",
    "start": "electron .",
    "dist": "pnpm run build:renderer && electron-builder"
  },
  "build": {
    "appId": "com.mygpt.students",
    "productName": "My_GPT 4 Students",
    "files": ["main.js", "renderer/**/*", "package.json"],
    "extraResources": [
      {
        "from": "../python-backend/dist/mygpt-backend.exe",
        "to": "backend/mygpt-backend.exe"
      }
    ],
    "win": {
      "target": ["nsis"],
      "icon": "icon.ico"
    },
    "nsis": {
      "oneClick": false,
      "allowToChangeInstallationDirectory": true
    }
  },
  "devDependencies": {
    "electron": "^33.0.0",
    "electron-builder": "^25.0.0"
  }
}
```

### 5d. Tiny copy script: `electron-app/copy-renderer.js`

```js
const fs = require('fs');
const path = require('path');

const src = path.join(__dirname, '..', 'artifacts', 'mockup-sandbox', 'dist');
const dst = path.join(__dirname, 'renderer');

fs.rmSync(dst, { recursive: true, force: true });
fs.cpSync(src, dst, { recursive: true });
console.log('Copied renderer:', src, '->', dst);
```

### 5e. Make Vite output relative paths

Open `artifacts/mockup-sandbox/vite.config.ts` and add `base: './'` to the
config object. Without this, Electron can’t load the JS/CSS files from disk.

```ts
export default defineConfig({
  base: './',
  // ...rest unchanged
});
```

---

## 6. Build the installer

From `electron-app/`:

```powershell
# 1. Freeze the backend (run once, then again any time main.py changes)
pnpm run build:backend

# 2. Build the React app + bundle into installer
pnpm run dist
```

When it’s done you’ll find:

```
electron-app\dist\My_GPT 4 Students Setup 1.0.0.exe
```

Double‑click it on any Windows 10/11 PC to install. The installer copies:

- the Electron UI
- the bundled `mygpt-backend.exe` (your whole Python app, no Python install
  needed on the target PC)

The first launch will create a `data/` folder beside the install (or wherever
`data_location.txt` points).

---

## 7. Distributing with a model on a USB stick

The “carry it once, install on any PC” flow:

1. On your PC, download the model with Ollama (`ollama pull llama3`) or copy
   raw model files into a folder, e.g. `E:\MyGPTModels\`.
2. Install the app on the target PC using the `.exe` from step 6.
3. Plug in the USB drive.
4. Open the install folder, edit `model_location.txt`, paste:
   ```
   E:\MyGPTModels
   ```
5. Launch the app — it reads the model straight off the stick. No internet
   needed, no re‑download.

Same trick works for `data_location.txt` so chats/uploads live on the stick.

---

## 8. Troubleshooting

| Symptom | Fix |
|---|---|
| White window on launch | You forgot `base: './'` in `vite.config.ts`. Rebuild. |
| `ECONNREFUSED 127.0.0.1:8000` in the UI | Backend exe didn’t start. Run `mygpt-backend.exe` manually and watch the console. |
| Antivirus flags the installer | Normal for unsigned PyInstaller bundles. Code‑sign the `.exe` with a real cert for distribution. |
| Huge installer | PyInstaller bundles Python + libs (~80–150 MB). Add `--exclude-module` flags, or switch to `--onedir` for faster startup. |
| Backend can’t write to `data/` | The user installed into `Program Files`. Edit `data_location.txt` to point at `%USERPROFILE%\Documents\MyGPTData`. |

---

## 9. What to do next on your PC

In rough order:

1. Plug in Ollama (Section 2) so you get real answers instead of the stub.
2. Add a proper app icon: drop `icon.ico` into `electron-app/`.
3. Optional: code‑sign the installer (avoids SmartScreen warning).
4. Optional: auto‑update via `electron-updater`.
5. Ship the `.exe` to your students.

That’s it — you now own the whole stack and can iterate offline.
