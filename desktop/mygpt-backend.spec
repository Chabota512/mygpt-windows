# PyInstaller spec for the My_GPT FastAPI backend.
# Produces a single mygpt-backend.exe that Tauri spawns as a sidecar.
# Run from the desktop/ directory:
#   pyinstaller --noconfirm --clean --distpath ./src-tauri/binaries --workpath ./build/pyinstaller mygpt-backend.spec
import sys
from pathlib import Path

block_cipher = None

ROOT = Path(SPECPATH).resolve().parent
BACKEND = ROOT / "python-backend"

a = Analysis(
    [str(BACKEND / "main.py")],
    pathex=[str(BACKEND)],
    binaries=[],
    datas=[],
    hiddenimports=[
        "uvicorn.logging",
        "uvicorn.loops",
        "uvicorn.loops.auto",
        "uvicorn.protocols",
        "uvicorn.protocols.http",
        "uvicorn.protocols.http.auto",
        "uvicorn.protocols.websockets",
        "uvicorn.protocols.websockets.auto",
        "uvicorn.lifespan",
        "uvicorn.lifespan.on",
        "ollama",
        "docx",
        "reportlab",
        "pypdf",
    ],
    hookspath=[],
    hooksconfig={},
    runtime_hooks=[],
    excludes=[],
    win_no_prefer_redirects=False,
    win_private_assemblies=False,
    cipher=block_cipher,
    noarchive=False,
)

pyz = PYZ(a.pure, a.zipped_data, cipher=block_cipher)

# Tauri sidecar requires a target-triple suffix on the binary name.
# We name it generically here; the GitHub Actions workflow renames the
# output to mygpt-backend-x86_64-pc-windows-msvc.exe before tauri build.
exe = EXE(
    pyz,
    a.scripts,
    a.binaries,
    a.zipfiles,
    a.datas,
    [],
    name="mygpt-backend",
    debug=False,
    bootloader_ignore_signals=False,
    strip=False,
    upx=False,
    runtime_tmpdir=None,
    console=False,
    disable_windowed_traceback=False,
    argv_emulation=False,
    target_arch=None,
    codesign_identity=None,
    entitlements_file=None,
)
