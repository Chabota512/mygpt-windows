// Prevents an additional console window on Windows in release.
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

mod backend;

use std::sync::Mutex;
use tauri::Manager;

pub struct AppState {
    pub backend: Mutex<Option<backend::BackendHandles>>,
}

#[tauri::command]
async fn restart_ollama_command(state: tauri::State<'_, AppState>, app: tauri::AppHandle) -> Result<String, String> {
    let mut state_guard = state.backend.lock().unwrap();
    match &mut *state_guard {
        Some(handles) => backend::restart_ollama(handles, &app).await,
        None => Err("Backend not initialized".to_string()),
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
