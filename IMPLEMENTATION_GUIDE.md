# Ollama Auto-Start Implementation

## Summary

This implementation adds automatic Ollama server startup with configurable model paths. The system uses a `ollama_config.json` file that users can edit to customize:
- Model storage location
- Ollama executable path
- Startup retries and delays
- Ollama host/port settings

The app automatically starts Ollama on launch and keeps retrying until it's responsive.

## Components Created

### 1. Configuration File (`python-backend/ollama_config.json`)

**Location**: Stored next to `main.py` in the Python backend folder

**Features**:
- User-editable JSON configuration
- No hardcoded paths
- Supports auto-detection when fields are empty
- Retry logic and timing settings

**Default Content**:
```json
{
  "ollama_enabled": true,
  "model_path": "",
  "ollama_executable": "",
  "ollama_host": "http://127.0.0.1:11434",
  "ollama_port": 11434,
  "max_retries": 10,
  "retry_delay_seconds": 2,
  "auto_restart_on_failure": true,
  "keep_alive": "5m"
}
```

### 2. Startup Script (`python-backend/start-ollama.ps1`)

**Language**: PowerShell

**Features**:
- Reads `ollama_config.json` settings
- Finds ollama.exe (checks config, model dir, system PATH)
- Starts Ollama with retry logic
- Handles environment variables (OLLAMA_MODELS, OLLAMA_HOST)
- Color-coded logging for debugging
- Can be run manually or by the app

**Execution**:
```powershell
powershell -ExecutionPolicy RemoteSigned -File start-ollama.ps1
```

### 3. Configuration Manager (`python-backend/ollama_config_manager.py`)

**Python Module**

**Classes**:
- `OllamaConfigManager`: Manages config loading/saving and async startup

**Key Methods**:
- `_load_config()`: Reads ollama_config.json
- `save_config(updates)`: Saves config changes
- `start_ollama_async()`: Launches startup script in background thread
- `_startup_with_retry()`: Retry logic (max 5 attempts)

**Features**:
- Global singleton instance via `get_manager()`
- Thread-safe startup process
- Graceful shutdown support

### 4. API Routes (`python-backend/routes/ollama_config.py`)

**FastAPI Router**

**Endpoints**:

#### `GET /ollama/config`
Returns current Ollama configuration
```json
{
  "ollama_enabled": true,
  "model_path": "E:\\Models",
  "ollama_executable": "E:\\Models\\ollama.exe",
  ...
}
```

#### `POST /ollama/config/update`
Updates Ollama configuration
**Request**:
```json
{
  "model_path": "D:\\NewModelsPath",
  "ollama_enabled": true
}
```
**Response**: Updated config + status message

#### `POST /ollama/restart`
Triggers immediate Ollama restart
**Response**:
```json
{
  "status": "restart_initiated",
  "message": "Ollama startup script is running in background..."
}
```

#### `GET /ollama/status`
Returns Ollama connection status
**Response**:
```json
{
  "enabled": true,
  "is_running": true,
  "host": "127.0.0.1",
  "port": 11434,
  "config_file": "...",
  "startup_script": "..."
}
```

### 5. Frontend API Client Updates (`artifacts/student-ai/src/components/student-ai/api.ts`)

**New Types**:
- `ApiOllamaConfig`: Type definition for config
- `ApiOllamaStatus`: Type definition for status

**New Methods**:
- `getOllamaConfig()`: Fetch current config
- `updateOllamaConfig(updates)`: Update config
- `restartOllama()`: Trigger restart
- `getOllamaStatus()`: Check Ollama status

### 6. Backend Integration (`python-backend/main.py`)

**Changes**:
1. Added asyncio import
2. Import OllamaConfigManager and routes
3. Include ollama_config router in FastAPI app
4. Updated startup event to use config manager

**Startup Flow**:
1. Load ollama_config.json
2. Start Ollama via PowerShell script
3. Wait up to 30 seconds for responsiveness
4. Pre-load Writer model if successful

## File Structure

```
python-backend/
├── ollama_config.json                 # User-editable config
├── start-ollama.ps1                   # Startup script
├── ollama_config_manager.py           # Config management
├── main.py                            # Updated with new imports/startup
└── routes/
    └── ollama_config.py               # API endpoints

artifacts/student-ai/src/components/student-ai/
└── api.ts                             # Updated with new endpoints

OLLAMA_CONFIG_GUIDE.md                 # User documentation
```

## How It Works

### Startup Flow (App Launch)

1. **Backend starts** with new startup event
2. **Load config** from `ollama_config.json`
3. **Start async script** (`start-ollama.ps1` in background)
4. **Retry logic** keeps trying for up to 30 seconds
5. **Pre-load model** once Ollama is responsive
6. **App is ready** for user interaction

### Update Flow (User Changes Settings)

1. **User updates config** in app settings (future UI)
2. **Config saved** to `ollama_config.json`
3. **POST /ollama/config/update** called
4. **POST /ollama/restart** called
5. **Script runs** in background with new settings
6. **Status updated** in real-time (via polling)

### Manual Configuration

Users can edit `ollama_config.json` directly:
```json
{
  "model_path": "E:\\MyExternalDrive\\Models",
  "ollama_executable": "E:\\MyExternalDrive\\Models\\ollama.exe",
  "ollama_enabled": true
}
```

## Configuration Examples

### External Drive Storage (low disk space)
```json
{
  "model_path": "E:\\Models",
  "ollama_executable": "E:\\Models\\ollama.exe"
}
```

### System Ollama Installation
```json
{
  "model_path": "",
  "ollama_executable": "",
  "ollama_enabled": true
}
```

### Network Ollama Server
```json
{
  "ollama_host": "http://192.168.1.100:11434",
  "ollama_enabled": true
}
```

### Disable Auto-Start
```json
{
  "ollama_enabled": false
}
```

## Retry Logic

- **Max Retries**: Configurable (default: 10 app-level + 5 script-level = 15 total)
- **Retry Delay**: Configurable (default: 2 seconds between attempts)
- **Total Wait Time**: ~30-40 seconds before giving up
- **User Feedback**: Logging shows progress to debug issues

## Error Handling

**If Ollama doesn't start:**
1. Check `ollama_config.json` exists and is valid JSON
2. Verify model path is accessible
3. Verify ollama.exe path is correct
4. Check port 11434 is not in use
5. Manual run: `powershell -File start-ollama.ps1`

## Future Enhancements

1. **UI Settings Panel** to update config from app
2. **Real-time status monitor** showing Ollama health
3. **Automatic port switching** if 11434 is in use
4. **Model pre-download** feature
5. **Ollama update checker**
6. **Multi-model loading** strategy
7. **Performance profiling** dashboard

## Dependencies

- **Backend**: Python 3.7+ (no new deps, uses existing subprocess/threading)
- **Startup**: PowerShell 5.1+ (Windows native, no installation needed)
- **Frontend**: No new dependencies (existing api.ts pattern)

## Testing Checklist

- [x] ollama_config.json created and readable
- [x] start-ollama.ps1 compiles and runs
- [x] ollama_config_manager.py has no syntax errors
- [x] API routes defined correctly
- [x] main.py integrates manager correctly
- [x] Frontend API types added
- [x] TypeScript compilation passes
- [x] Backend Python compilation passes
- [ ] Manual testing: Change config and restart
- [ ] Manual testing: Verify Ollama starts automatically
- [ ] Manual testing: Check status via API

## Troubleshooting

**Issue**: `[startup] Ollama executable not found`
**Fix**: Set `ollama_executable` in config or place ollama.exe in model directory

**Issue**: `Port 11434 is already in use`
**Fix**: Change `ollama_port` in config or close conflicting app

**Issue**: `Cannot access models folder`
**Fix**: Verify folder path is correct and user has read/write permissions

**Issue**: Script runs but Ollama doesn't start
**Fix**: Check Event Viewer or run script manually with `-File start-ollama.ps1`

## Integration with Existing Code

- Uses same `.txt` file config pattern as `data_location.txt` and `model_location.txt`
- Follows existing FastAPI router structure
- Compatible with existing SetupManager
- No breaking changes to existing APIs
- Backward compatible with old startup method

## Configuration File as Deployment Method

Like `.lic` files in other applications:
- **editable**: Users can open in any text editor
- **deployable**: Can be pre-configured before app installation
- **versionable**: Can be committed to git
- **shareable**: Users can share working configs
- **auditable**: Easy to verify what's configured

## Notes

- All logging goes to console (visible in app logs)
- Config changes take effect after app restart
- The startup script is OS-specific (PowerShell/Windows)
- For Linux/Mac: Would need bash script equivalent
- Thread-safe implementation using Python locks
