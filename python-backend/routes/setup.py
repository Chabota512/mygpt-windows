"""
Setup routes for model path and Ollama initialization.
"""

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import Optional, Dict, Any
import json

setup_router = APIRouter()

# Global setup manager instance will be injected
setup_manager = None

class ModelPathRequest(BaseModel):
    path: str

class SetupStatus(BaseModel):
    is_setup_complete: bool
    model_path: Optional[str] = None
    ollama_running: bool = False


def inject_setup_manager(manager):
    """Inject the setup manager instance."""
    global setup_manager
    setup_manager = manager


@setup_router.get("/status", response_model=SetupStatus)
async def get_setup_status():
    """Get current setup status."""
    if not setup_manager:
        raise HTTPException(status_code=500, detail="Setup manager not initialized")
    
    model_path = setup_manager.get_model_path()
    is_complete = model_path is not None and len(model_path) > 0
    
    return SetupStatus(
        is_setup_complete=is_complete,
        model_path=model_path,
        ollama_running=setup_manager.is_ollama_running(),
    )


@setup_router.post("/model-path")
async def set_model_path(req: ModelPathRequest):
    """Set the model path."""
    if not setup_manager:
        raise HTTPException(status_code=500, detail="Setup manager not initialized")
    
    if not req.path or len(req.path.strip()) == 0:
        raise HTTPException(status_code=400, detail="Path cannot be empty")
    
    success = setup_manager.set_model_path(req.path)
    if not success:
        raise HTTPException(status_code=400, detail="Failed to set model path")
    
    return {
        "status": "success",
        "message": "Model path updated",
        "model_path": req.path,
    }


@setup_router.get("/detect-models")
async def detect_models(path: Optional[str] = None):
    """Detect models and Ollama in the given path."""
    if not setup_manager:
        raise HTTPException(status_code=500, detail="Setup manager not initialized")
    
    search_path = path or setup_manager.get_model_path()
    if not search_path:
        raise HTTPException(status_code=400, detail="No model path provided or configured")
    
    result = setup_manager.detect_models(search_path)
    return result


@setup_router.post("/start-ollama")
async def start_ollama(req: Optional[ModelPathRequest] = None):
    """Start Ollama server with the configured model path."""
    if not setup_manager:
        raise HTTPException(status_code=500, detail="Setup manager not initialized")
    
    model_path = req.path if req else setup_manager.get_model_path()
    if not model_path:
        raise HTTPException(status_code=400, detail="No model path configured")
    
    result = setup_manager.start_ollama(model_path)
    return result
