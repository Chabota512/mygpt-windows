// Prevents an additional console window on Windows in release.
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

mod backend;

use std::sync::Mutex;
use tauri::Manager;

pub struct AppState {
    pub backend: Mutex<Option<backend::BackendHandles>>,
}

#[tauri::command]
fn restart_ollama_command(state: tauri::State<'_, AppState>, app: tauri::AppHandle) -> Result<String, String> {
    let mut state_guard = state.backend.lock().unwrap();
    
    if let Some(handles) = &mut *state_guard {
        // Spawn the restart as a background task
        let app_clone = app.clone();
        
        // Kill existing Ollama process if running
        if let Some(child) = handles.ollama.take() {
            let _ = child.kill();
            eprintln!("[mygpt] terminated ollama service for restart");
        }
        
        // Drop the lock before spawning async task
        drop(state_guard);
        
        // Spawn async restart in background
        tauri::async_runtime::spawn(async move {
            tokio::time::sleep(tokio::time::Duration::from_secs(2)).await;
            // Start Ollama first (without holding the lock)
            let child = backend::start_ollama(&app_clone).await;
            
            // Update state with the child
            {
                let mut state_guard = app_clone.state::<AppState>().backend.lock().unwrap();
                if let Some(handles) = &mut *state_guard {
                    if let Some(child) = child {
                        handles.ollama = Some(child);
                        eprintln!("[mygpt] ollama restarted successfully");
                    }
                }
                // Lock is dropped here when state_guard goes out of scope
            }
            
            // Check if Ollama is running (outside of lock)
            if child.is_none() {
                if !(tokio::net::TcpStream::connect(("127.0.0.1", 11434)).await.is_ok()) {
                    eprintln!("[mygpt] failed to restart ollama");
                } else {
                    eprintln!("[mygpt] ollama already running on port 11434");
                }
            }
        });
        
        Ok("Restarting Ollama in background...".to_string())
    } else {
        Err("Backend not initialized".to_string())
    }
}

fn main() {
    tauri::Builder::default()
        .plugin(tauri_plugin_shell::init())
        .manage(AppState {
            backend: Mutex::new(None),
        })
        .invoke_handler(tauri::generate_handler![restart_ollama_command])
        .setup(|app| {
            let handle = app.handle().clone();
            // Spawn Ollama (if installed) and the bundled Python backend.
            tauri::async_runtime::spawn(async move {
                match backend::start_all(&handle).await {
                    Ok(handles) => {
                        let state = handle.state::<AppState>();
                        *state.backend.lock().unwrap() = Some(handles);
                        eprintln!("[mygpt] backend services started");
                    }
                    Err(e) => eprintln!("[mygpt] failed to start backend: {e}"),
                }
            });
            Ok(())
        })
        .on_window_event(|window, event| {
            if let tauri::WindowEvent::Destroyed = event {
                let state = window.state::<AppState>();
                let taken = {
                    let mut guard = state.backend.lock().unwrap();
                    guard.take()
                };
                if let Some(handles) = taken {
                    backend::stop_all(handles);
                }
            }
        })
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
