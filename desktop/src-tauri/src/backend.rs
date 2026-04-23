// Manages the lifecycle of the bundled Python FastAPI backend (mygpt-backend.exe)
// and the Ollama serve process. Both are started silently in the background when
// the Tauri app launches, and killed when the window closes.

use std::time::Duration;
use std::fs;
use std::path::PathBuf;
use tauri::AppHandle;
use tauri_plugin_shell::process::CommandChild;
use tauri_plugin_shell::ShellExt;
use tokio::time::sleep;

const BACKEND_PORT: u16 = 8000;
const OLLAMA_PORT: u16 = 11434;

const VISION_MODEL: &str = "qwen3.5:0.8b";
const REASONING_MODEL: &str = "phi4-mini";
const WRITER_MODEL: &str = "llama3.2:1b";

fn get_models_dir() -> String {
    // Try to read model_location.txt (same pattern as python backend)
    let locations = vec![
        PathBuf::from("model_location.txt"),
        PathBuf::from("../python-backend/model_location.txt"),
    ];
    
    for path in locations {
        if let Ok(content) = fs::read_to_string(&path) {
            for line in content.lines() {
                let trimmed = line.trim();
                // Skip comments and empty lines
                if !trimmed.is_empty() && !trimmed.starts_with('#') {
                    return trimmed.to_string();
                }
            }
        }
    }
    
    // Fallback to default
    r"C:\dev\models".to_string()
}

pub struct BackendHandles {
    pub backend: Option<CommandChild>,
    pub ollama: Option<CommandChild>,
}

pub async fn start_all(app: &AppHandle) -> Result<BackendHandles, String> {
    let ollama = start_ollama(app).await;
    let backend = start_backend(app).await?;
    Ok(BackendHandles { backend: Some(backend), ollama })
}

pub async fn restart_ollama(handles: &mut BackendHandles, app: &AppHandle) -> Result<String, String> {
    // Kill existing Ollama process if running
    if let Some(child) = handles.ollama.take() {
        let _ = child.kill();
        eprintln!("[mygpt] terminated ollama service for restart");
        // Give it a moment to fully shutdown
        tokio::time::sleep(Duration::from_secs(2)).await;
    }
    
    // Start a new Ollama process
    match start_ollama(app).await {
        Some(_child) => {
            handles.ollama = Some(_child);
            eprintln!("[mygpt] ollama restarted successfully");
            Ok("Ollama restarted successfully".to_string())
        }
        None => {
            // Check if it's already running externally
            if is_port_open(OLLAMA_PORT).await {
                eprintln!("[mygpt] ollama already running on port {}", OLLAMA_PORT);
                Ok("Ollama is already running".to_string())
            } else {
                Err("Failed to restart Ollama - is it installed?".to_string())
            }
        }
    }
}

pub async fn start_ollama(app: &AppHandle) -> Option<CommandChild> {
    if is_port_open(OLLAMA_PORT).await {
        eprintln!("[mygpt] ollama already running on :{}", OLLAMA_PORT);
        return None;
    }

    let models_dir = get_models_dir();
    eprintln!("[mygpt] using models directory: {}", models_dir);

    let cmd = app
        .shell()
        .command("ollama")
        .args(["serve"])
        .env("OLLAMA_MAX_LOADED_MODELS", "1")
        .env("OLLAMA_NUM_PARALLEL", "1")
        .env("OLLAMA_MODELS", &models_dir);

    match cmd.spawn() {
        Ok((_rx, child)) => {
            eprintln!("[mygpt] spawned ollama serve");
            // Give Ollama a moment to bind its port before the backend starts.
            wait_for_port(OLLAMA_PORT, Duration::from_secs(15)).await;
            Some(child)
        }
        Err(e) => {
            eprintln!("[mygpt] could not spawn ollama (is it installed?): {e}");
            None
        }
    }
}

async fn start_backend(app: &AppHandle) -> Result<CommandChild, String> {
    if is_port_open(BACKEND_PORT).await {
        return Err(format!(
            "Port {} is already in use — another instance of the backend may be running.",
            BACKEND_PORT
        ));
    }

    let cmd = app
        .shell()
        .sidecar("mygpt-backend")
        .map_err(|e| format!("sidecar lookup failed: {e}"))?
        .env("OLLAMA_HOST", format!("http://127.0.0.1:{}", OLLAMA_PORT))
        .env("OLLAMA_VISION_MODEL", VISION_MODEL)
        .env("OLLAMA_REASONING_MODEL", REASONING_MODEL)
        .env("OLLAMA_WRITER_MODEL", WRITER_MODEL)
        .env("OLLAMA_MAX_LOADED_MODELS", "1")
        .env("MYGPT_HOST", "127.0.0.1")
        .env("MYGPT_PORT", BACKEND_PORT.to_string());

    let (_rx, child) = cmd.spawn().map_err(|e| format!("spawn failed: {e}"))?;
    eprintln!("[mygpt] spawned mygpt-backend");
    wait_for_port(BACKEND_PORT, Duration::from_secs(30)).await;
    Ok(child)
}

pub fn stop_all(handles: BackendHandles) {
    if let Some(child) = handles.backend {
        let _ = child.kill();
        eprintln!("[mygpt] terminated backend (mygpt-backend)");
    }
    if let Some(child) = handles.ollama {
        let _ = child.kill();
        eprintln!("[mygpt] terminated ollama service");
    }
}

async fn is_port_open(port: u16) -> bool {
    tokio::net::TcpStream::connect(("127.0.0.1", port))
        .await
        .is_ok()
}

async fn wait_for_port(port: u16, timeout: Duration) {
    let start = std::time::Instant::now();
    while start.elapsed() < timeout {
        if is_port_open(port).await {
            return;
        }
        sleep(Duration::from_millis(300)).await;
    }
    eprintln!("[mygpt] timed out waiting for port {}", port);
}
