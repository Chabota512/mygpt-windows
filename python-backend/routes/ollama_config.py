"""
API Routes for Ollama Configuration
===================================
Endpoints: /ollama/config, /ollama/config/update, /ollama/status
"""

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import Dict, Any, Optional
from ollama_config_manager import get_manager


router = APIRouter(prefix="/ollama", tags=["Ollama Configuration"])


class OllamaConfigUpdate(BaseModel):
    """Update request for Ollama config."""
    model_path: Optional[str] = None
    ollama_executable: Optional[str] = None
    ollama_host: Optional[str] = None
    ollama_port: Optional[int] = None
    ollama_enabled: Optional[bool] = None
    max_retries: Optional[int] = None
    retry_delay_seconds: Optional[int] = None
    auto_restart_on_failure: Optional[bool] = None


@router.get("/config")
async def get_ollama_config() -> Dict[str, Any]:
    """Get current Ollama configuration."""
    manager = get_manager()
    return manager.get_config()


@router.post("/config/update")
async def update_ollama_config(update: OllamaConfigUpdate) -> Dict[str, Any]:
    """
    Update Ollama configuration and optionally restart.
    
    The updated config is saved to ollama_config.json and can be viewed/edited manually.
    """
    manager = get_manager()
    
    # Build update dict (only non-None values)
    updates = {k: v for k, v in update.dict().items() if v is not None}
    
    if not updates:
        return {"status": "no_changes", "config": manager.get_config()}
    
    # Save config
    success = manager.save_config(updates)
    
    if not success:
        raise HTTPException(status_code=500, detail="Failed to save config")
    
    return {
        "status": "updated",
        "config": manager.get_config(),
        "message": "Config saved. Restart the app to apply changes, or use /ollama/restart endpoint."
    }


@router.post("/restart")
async def restart_ollama() -> Dict[str, Any]:
    """
    Restart Ollama server.
    This triggers the PowerShell startup script to begin immediately.
    """
    manager = get_manager()
    manager.start_ollama_async()
    
    return {
        "status": "restart_initiated",
        "message": "Ollama startup script is running in background. Check logs for progress."
    }


@router.get("/status")
async def get_ollama_status() -> Dict[str, Any]:
    """Get Ollama connection status."""
    manager = get_manager()
    config = manager.get_config()
    
    # Try to check if Ollama is running
    import socket
    host_str = config.get("ollama_host", "http://127.0.0.1:11434")
    
    # Parse host:port
    if "://" in host_str:
        host_str = host_str.split("://")[1]
    
    if ":" in host_str:
        host, port_str = host_str.rsplit(":", 1)
        port = int(port_str)
    else:
        host = host_str
        port = config.get("ollama_port", 11434)
    
    # Test connection
    try:
        with socket.create_connection((host, port), timeout=2):
            is_running = True
    except:
        is_running = False
    
    return {
        "enabled": manager.is_ollama_enabled(),
        "is_running": is_running,
        "host": host,
        "port": port,
        "config_file": str(manager.CONFIG_FILE),
        "startup_script": str(manager.STARTUP_SCRIPT),
    }
