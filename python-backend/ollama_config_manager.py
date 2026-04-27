"""
Ollama Configuration Manager
============================
Manages ollama_config.json - allows users to configure Ollama startup.
Auto-starts Ollama on backend startup and keeps it running.
"""

import json
import subprocess
import threading
import time
from pathlib import Path
from typing import Dict, Any, Optional
import platform
import os


class OllamaConfigManager:
    """Manages Ollama configuration and startup."""
    
    CONFIG_FILE = Path(__file__).parent / "ollama_config.json"
    STARTUP_SCRIPT = Path(__file__).parent / "start-ollama.ps1"
    
    def __init__(self):
        self.config = self._load_config()
        self.startup_process = None
        self.retry_thread = None
        self.should_retry = True
    
    def _load_config(self) -> Dict[str, Any]:
        """Load ollama_config.json."""
        try:
            if self.CONFIG_FILE.exists():
                return json.loads(self.CONFIG_FILE.read_text("utf-8"))
        except Exception as e:
            print(f"[OllamaConfig] Error loading config: {e}")
        
        # Return default config
        return {
            "ollama_enabled": True,
            "ollama_path": "",
            "ollama_host": "http://127.0.0.1:11434",
            "ollama_port": 11434,
            "max_retries": 10,
            "retry_delay_seconds": 2,
            "auto_restart_on_failure": True,
        }
    
    def save_config(self, updates: Dict[str, Any]) -> bool:
        """Save config updates to ollama_config.json."""
        try:
            self.config.update(updates)
            self.CONFIG_FILE.write_text(
                json.dumps(self.config, indent=2),
                encoding="utf-8"
            )
            print(f"[OllamaConfig] Saved config to {self.CONFIG_FILE}")
            return True
        except Exception as e:
            print(f"[OllamaConfig] Error saving config: {e}")
            return False
    
    def get_config(self) -> Dict[str, Any]:
        """Get current config (without sensitive data)."""
        return {
            k: v for k, v in self.config.items()
            if not k.startswith("_")
        }
    
    def is_ollama_enabled(self) -> bool:
        """Check if Ollama should be started."""
        return self.config.get("ollama_enabled", True)
    
    def start_ollama_async(self) -> None:
        """Start Ollama using the PowerShell startup script."""
        if not self.is_ollama_enabled():
            print("[OllamaConfig] Ollama is disabled in config")
            return
        
        if not self.STARTUP_SCRIPT.exists():
            print(f"[OllamaConfig] Startup script not found: {self.STARTUP_SCRIPT}")
            return
        
        # Start in background thread
        self.retry_thread = threading.Thread(target=self._startup_with_retry, daemon=True)
        self.retry_thread.start()
    
    def _startup_with_retry(self) -> None:
        """Run startup script with retry logic."""
        max_attempts = 5
        attempt = 1
        
        while self.should_retry and attempt <= max_attempts:
            try:
                print(f"[OllamaConfig] Starting Ollama (attempt {attempt}/{max_attempts})...")
                
                # Run PowerShell script
                result = subprocess.run(
                    [
                        "powershell",
                        "-ExecutionPolicy", "RemoteSigned",
                        "-File", str(self.STARTUP_SCRIPT),
                        "-ConfigPath", str(self.CONFIG_FILE)
                    ],
                    capture_output=True,
                    text=True,
                    timeout=60
                )
                
                if result.returncode == 0:
                    print("[OllamaConfig] ✓ Ollama started successfully")
                    return
                else:
                    print(f"[OllamaConfig] Script failed: {result.stderr}")
                    attempt += 1
                    time.sleep(2)
            except subprocess.TimeoutExpired:
                print("[OllamaConfig] Startup script timeout")
                attempt += 1
                time.sleep(2)
            except Exception as e:
                print(f"[OllamaConfig] Error starting Ollama: {e}")
                attempt += 1
                time.sleep(2)
        
        print(f"[OllamaConfig] Failed to start Ollama after {max_attempts} attempts")
    
    def stop(self) -> None:
        """Stop retry thread on shutdown."""
        self.should_retry = False


# Global instance
_config_manager = None

def get_manager() -> OllamaConfigManager:
    """Get or create the global Ollama config manager."""
    global _config_manager
    if _config_manager is None:
        _config_manager = OllamaConfigManager()
    return _config_manager
