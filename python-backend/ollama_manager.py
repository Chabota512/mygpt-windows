"""
Ollama Manager — Automated Server & Model Orchestration
========================================================

On an 8GB RAM system with OLLAMA_MAX_LOADED_MODELS=1, this module handles:

1. Starting the Ollama server in the background (if not running)
2. Checking port 11434 responsiveness
3. Tracking which model is currently loaded in RAM
4. Switching models safely: unload old → load new
5. Using keep_alive: 0 to flush RAM before switching

The key constraint: only ONE model in RAM at a time. This module ensures
smooth transitions without 500 errors or OOM crashes.
"""

from __future__ import annotations

import os
import subprocess
import socket
import time
import threading
import json
from pathlib import Path
from typing import Optional
import requests
import ollama

# ──────────────────────────────────────────────────────────────────────
# Globals
# ──────────────────────────────────────────────────────────────────────
_current_model: Optional[str] = None
_ollama_proc: Optional[subprocess.Popen] = None
_lock = threading.Lock()
_OLLAMA_PORT = 11434
_OLLAMA_HOST = "http://localhost:11434"
_MAX_RETRIES = 5
_RETRY_DELAY = 1.0


def set_model_dir(model_dir: Path) -> None:
    """Set the OLLAMA_MODELS environment variable before starting the server."""
    os.environ["OLLAMA_MODELS"] = str(model_dir)
    print(f"[OllamaManager] Set OLLAMA_MODELS={model_dir}")


def set_ollama_host(host: str) -> None:
    """Override the default localhost:11434 if needed."""
    global _OLLAMA_HOST
    _OLLAMA_HOST = host
    os.environ["OLLAMA_HOST"] = host
    print(f"[OllamaManager] Set OLLAMA_HOST={host}")


def _is_port_open(port: int = _OLLAMA_PORT, host: str = "127.0.0.1") -> bool:
    """Check if a port is open (server is responsive)."""
    try:
        with socket.create_connection((host, port), timeout=2):
            return True
    except (socket.timeout, socket.error, ConnectionRefusedError):
        return False


def _wait_for_port(
    port: int = _OLLAMA_PORT,
    max_retries: int = _MAX_RETRIES,
    delay: float = _RETRY_DELAY,
) -> bool:
    """Wait for the port to become open."""
    for attempt in range(max_retries):
        if _is_port_open(port):
            print(f"[OllamaManager] Port {port} is open (attempt {attempt + 1})")
            return True
        print(f"[OllamaManager] Waiting for port {port}… (attempt {attempt + 1}/{max_retries})")
        time.sleep(delay)
    return False


def _find_ollama_exe() -> Optional[Path]:
    """
    Locate ollama.exe in the model directory.
    
    Strategy:
    1. Check MODEL_DIR / ollama.exe (where the user portable instance is)
    2. Check %PATH% (system-wide Ollama installation)
    3. Return None if not found
    """
    model_dir = Path(os.environ.get("OLLAMA_MODELS", "C:\\dev\\models"))
    
    candidates = [
        model_dir / "ollama.exe",
        Path("ollama.exe"),
    ]
    
    for candidate in candidates:
        if candidate.exists():
            print(f"[OllamaManager] Found ollama.exe at {candidate}")
            return candidate
    
    # Try to find it in PATH
    try:
        result = subprocess.run(
            ["where", "ollama.exe"],
            capture_output=True,
            text=True,
            timeout=5,
        )
        if result.returncode == 0:
            exe_path = Path(result.stdout.strip().split("\n")[0])
            if exe_path.exists():
                print(f"[OllamaManager] Found ollama.exe in PATH at {exe_path}")
                return exe_path
    except Exception:
        pass
    
    return None


def start_server(model_dir: Path) -> bool:
    """
    Start the Ollama server in the background if it's not running.
    
    Returns True if the server is running (either already running or just started),
    False if startup failed.
    """
    global _ollama_proc
    
    with _lock:
        # Check if already running
        if _is_port_open():
            print(f"[OllamaManager] Ollama is already running on port {_OLLAMA_PORT}")
            return True
        
        # Find ollama.exe
        exe = _find_ollama_exe()
        if not exe:
            print(
                "[OllamaManager] ERROR: ollama.exe not found.\n"
                f"  - Expected at: {model_dir}/ollama.exe\n"
                "  - Or in PATH\n"
                "  - Download from https://ollama.com"
            )
            return False
        
        # Set up environment for Windows
        env = os.environ.copy()
        env["OLLAMA_MAX_LOADED_MODELS"] = "1"  # RAM guard
        # Use absolute path and convert to Windows format
        models_path = str(model_dir.resolve())
        env["OLLAMA_MODELS"] = models_path
        
        try:
            print(f"[OllamaManager] Starting Ollama server from: {exe}")
            print(f"[OllamaManager] OLLAMA_MODELS={models_path}")
            print(f"[OllamaManager] OLLAMA_MAX_LOADED_MODELS=1")
            
            _ollama_proc = subprocess.Popen(
                [str(exe.resolve()), "serve"],
                env=env,
                stdout=subprocess.PIPE,
                stderr=subprocess.PIPE,
                text=True,
                creationflags=subprocess.CREATE_NEW_CONSOLE,
            )
            print(f"[OllamaManager] Ollama process started (PID {_ollama_proc.pid})")
            
            # Wait for port to open
            if _wait_for_port(_OLLAMA_PORT):
                print("[OllamaManager] ✓ Server is responsive")
                return True
            else:
                print("[OllamaManager] ✗ Server did not respond in time")
                return False
        
        except Exception as e:
            print(f"[OllamaManager] ERROR starting server: {e}")
            return False


def stop_server() -> None:
    """Stop the Ollama server gracefully."""
    global _ollama_proc, _current_model
    
    with _lock:
        if _ollama_proc:
            try:
                _ollama_proc.terminate()
                _ollama_proc.wait(timeout=10)
                print("[OllamaManager] Server stopped.")
            except subprocess.TimeoutExpired:
                _ollama_proc.kill()
                print("[OllamaManager] Server killed (timeout on terminate).")
            except Exception as e:
                print(f"[OllamaManager] Error stopping server: {e}")
            finally:
                _ollama_proc = None
                _current_model = None


def _unload_current_model() -> None:
    """
    Unload the current model from RAM using keep_alive: 0.
    
    This sends a dummy request with keep_alive=0 seconds, forcing Ollama
    to immediately flush the model from memory. Essential on 8GB systems
    before loading a new model.
    """
    global _current_model
    
    if not _current_model:
        return
    
    try:
        client = ollama.Client(host=_OLLAMA_HOST)
        # Send a no-op request with keep_alive: 0 to flush RAM
        client.generate(
            model=_current_model,
            prompt="",
            stream=False,
            options={"keep_alive": 0},
        )
        print(f"[OllamaManager] Unloaded model: {_current_model}")
        _current_model = None
    except Exception as e:
        print(f"[OllamaManager] Warning: Failed to unload {_current_model}: {e}")
        _current_model = None


def load_model(model_name: str, keep_alive: int = -1) -> bool:
    """
    Load a model into RAM.
    
    Args:
        model_name: Name of the model (e.g., "llama3.2:1b")
        keep_alive: How long to keep the model in RAM:
                    -1 = forever (default, save RAM swaps)
                     0 = unload immediately (for cleanup)
                    >0 = seconds (e.g., 300 for 5 minutes)
    
    Returns True if loaded successfully, False otherwise.
    """
    global _current_model
    
    with _lock:
        # If a different model is loaded, unload it first
        if _current_model and _current_model != model_name:
            print(f"[OllamaManager] Switching: {_current_model} → {model_name}")
            _unload_current_model()
            # Small delay to let the system flush
            time.sleep(0.5)
        
        # If same model is already loaded, skip
        if _current_model == model_name:
            print(f"[OllamaManager] Model already loaded: {model_name}")
            return True
        
        try:
            print(f"[OllamaManager] Loading model: {model_name} (keep_alive={keep_alive})")
            client = ollama.Client(host=_OLLAMA_HOST)
            
            # Generate a dummy request to load the model (warm up the cache)
            response = client.generate(
                model=model_name,
                prompt="",
                stream=False,
                options={"keep_alive": keep_alive},
            )
            
            _current_model = model_name
            print(f"[OllamaManager] ✓ Model loaded: {model_name}")
            return True
        
        except Exception as e:
            print(f"[OllamaManager] ERROR loading {model_name}: {e}")
            return False


def get_current_model() -> Optional[str]:
    """Get the name of the currently loaded model."""
    return _current_model


def is_server_running() -> bool:
    """Check if Ollama is running and responsive."""
    return _is_port_open()


def ensure_server_running(model_dir: Path) -> bool:
    """
    Ensure the Ollama server is running. Start it if needed.
    
    This is the main entry point for the FastAPI app on startup.
    """
    if is_server_running():
        print("[OllamaManager] ✓ Ollama is running")
        return True
    
    print("[OllamaManager] Ollama not running. Starting…")
    return start_server(model_dir)


# ──────────────────────────────────────────────────────────────────────
# Specialist Router
# ──────────────────────────────────────────────────────────────────────
class SpecialistRouter:
    """
    Routes tasks to the right specialist model based on content analysis.
    
    On app boot, the Writer (lightest) model is pre-loaded.
    When a task needs Vision or Reasoning, this router:
    1. Detects the need
    2. Unloads the current model (flush RAM)
    3. Loads the required model
    4. Executes the task
    5. May switch back to Writer or stay loaded based on keep_alive
    """
    
    def __init__(
        self,
        writer_model: str = "llama3.2:1b",
        vision_model: str = "qwen3.5:0.8b",
        reasoning_model: str = "phi4-mini",
    ):
        self.writer_model = writer_model
        self.vision_model = vision_model
        self.reasoning_model = reasoning_model
    
    def ensure_writer_loaded(self) -> bool:
        """Pre-load the Writer model on app startup."""
        return load_model(self.writer_model, keep_alive=-1)
    
    def ensure_vision_loaded(self) -> bool:
        """Load Vision model with infinite keep_alive (won't be auto-unloaded)."""
        return load_model(self.vision_model, keep_alive=-1)
    
    def ensure_reasoning_loaded(self) -> bool:
        """Load Reasoning model with infinite keep_alive."""
        return load_model(self.reasoning_model, keep_alive=-1)
    
    def switch_to_writer(self) -> bool:
        """Switch back to Writer model (lightest, usually the final step)."""
        return load_model(self.writer_model, keep_alive=-1)


# Example usage in main.py:
#
#   from ollama_manager import OllamaManager, SpecialistRouter, ensure_server_running
#
#   router = SpecialistRouter()
#
#   @app.on_event("startup")
#   async def startup():
#       MODEL_DIR = resolve_model_dir()
#       set_model_dir(MODEL_DIR)
#       
#       # Start Ollama server and pre-load Writer
#       if ensure_server_running(MODEL_DIR):
#           router.ensure_writer_loaded()
#       else:
#           print("[startup] Warning: Ollama server failed to start")
#
#   def _route_task(message: str, history, image_paths=None):
#       # ...existing code...
#       
#       if image_paths:
#           stages.append(f"Analyzing image with {vision_model}…")
#           router.ensure_vision_loaded()  # Switch to Vision
#           # ...call vision model...
#           router.switch_to_writer()  # Switch back to Writer
#       
#       # etc.
