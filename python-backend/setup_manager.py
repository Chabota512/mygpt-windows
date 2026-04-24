"""
Setup manager for model path and Ollama initialization.
Handles first-time setup flow: model path detection, Ollama discovery, and startup.
"""

import os
import subprocess
import json
from pathlib import Path
from typing import Optional, Dict, Any
import platform
import time


class SetupManager:
    """Manages Ollama model path and server startup."""
    
    def __init__(self, model_location_file: Path):
        self.model_location_file = model_location_file
        self.ollama_process = None
    
    def get_model_path(self) -> Optional[str]:
        """Get the current model path from config file."""
        if self.model_location_file.exists():
            try:
                content = self.model_location_file.read_text("utf-8").strip()
                for line in content.splitlines():
                    line = line.strip()
                    if line and not line.startswith("#"):
                        return line
            except Exception:
                pass
        return None
    
    def set_model_path(self, path: str) -> bool:
        """Set the model path in config file."""
        try:
            model_path = Path(path).expanduser().resolve()
            if not model_path.exists():
                model_path.mkdir(parents=True, exist_ok=True)
            
            self.model_location_file.write_text(str(model_path), encoding="utf-8")
            return True
        except Exception as e:
            print(f"[Setup] Failed to set model path: {e}")
            return False
    
    def detect_models(self, model_path: str) -> Dict[str, Any]:
        """Scan for Ollama installation and available models."""
        try:
            model_dir = Path(model_path).expanduser().resolve()
            
            # Check if directory exists and has models
            models = []
            if model_dir.exists():
                # Look for model files (gguf, bin, etc.)
                for ext in ['*.gguf', '*.bin', '*.safetensors']:
                    models.extend([f.name for f in model_dir.glob(f"**/{ext}")])
            
            # Try to find Ollama executable
            ollama_path = self._find_ollama(model_dir)
            
            return {
                "status": "success",
                "model_path": str(model_dir),
                "models_found": len(models),
                "model_files": models[:20],  # Return first 20
                "ollama_found": ollama_path is not None,
                "ollama_path": str(ollama_path) if ollama_path else None,
            }
        except Exception as e:
            return {
                "status": "error",
                "message": str(e),
            }
    
    def _find_ollama(self, model_dir: Path) -> Optional[Path]:
        """Try to find Ollama executable in model directory or system."""
        # Check in model directory itself
        if model_dir.exists():
            for name in ['ollama.exe', 'ollama']:
                ollama_exe = model_dir / name
                if ollama_exe.exists():
                    return ollama_exe
        
        # Check parent directories (common structure: models/../ollama.exe)
        if model_dir.parent.exists():
            for name in ['ollama.exe', 'ollama']:
                ollama_exe = model_dir.parent / name
                if ollama_exe.exists():
                    return ollama_exe
        
        # Check system PATH (Windows)
        if platform.system() == "Windows":
            try:
                result = subprocess.run(['where', 'ollama.exe'], 
                                      capture_output=True, text=True, timeout=2)
                if result.returncode == 0:
                    return Path(result.stdout.strip().split('\n')[0])
            except Exception:
                pass
        
        return None
    
    def start_ollama(self, model_path: str) -> Dict[str, Any]:
        """Start Ollama server with proper environment variables."""
        try:
            model_dir = Path(model_path).expanduser().resolve()
            
            if not model_dir.exists():
                return {
                    "status": "error",
                    "message": f"Model directory does not exist: {model_dir}",
                }
            
            # Find Ollama executable
            ollama_exe = self._find_ollama(model_dir)
            if not ollama_exe:
                return {
                    "status": "error",
                    "message": "Ollama executable not found. Make sure ollama.exe is in the model directory or parent directory.",
                }
            
            # Prepare environment
            env = os.environ.copy()
            env['OLLAMA_MODELS'] = str(model_dir / "models")
            env['OLLAMA_MAX_LOADED_MODELS'] = "1"
            
            # Start Ollama process
            if platform.system() == "Windows":
                # Use CREATE_NEW_CONSOLE to run silently in background
                creationflags = subprocess.CREATE_NEW_CONSOLE | subprocess.CREATE_NO_WINDOW
                self.ollama_process = subprocess.Popen(
                    [str(ollama_exe), 'serve'],
                    env=env,
                    stdout=subprocess.DEVNULL,
                    stderr=subprocess.DEVNULL,
                    creationflags=creationflags,
                )
            else:
                # Unix-like systems
                self.ollama_process = subprocess.Popen(
                    [str(ollama_exe), 'serve'],
                    env=env,
                    stdout=subprocess.DEVNULL,
                    stderr=subprocess.DEVNULL,
                )
            
            # Give it a moment to start
            time.sleep(2)
            
            # Check if process is still running
            if self.ollama_process.poll() is None:
                return {
                    "status": "success",
                    "message": "Ollama started successfully",
                    "ollama_path": str(ollama_exe),
                    "model_path": str(model_dir),
                }
            else:
                return {
                    "status": "error",
                    "message": "Ollama failed to start. Check the installation.",
                }
        
        except Exception as e:
            return {
                "status": "error",
                "message": f"Failed to start Ollama: {str(e)}",
            }
    
    def is_ollama_running(self) -> bool:
        """Check if Ollama process is running."""
        if self.ollama_process:
            return self.ollama_process.poll() is None
        return False
