# Ollama Configuration Guide

## Overview

The My_GPT application now supports automatic Ollama server startup and configurable model paths. All settings are stored in a user-editable `ollama_config.json` file.

## Quick Start

### 1. **Find the Configuration File**

After installing My_GPT, locate the config file at:
- **Windows (Installed)**: `C:\Program Files\My_GPT 4 Students\ollama_config.json`
- **Windows (Portable)**: `./ollama_config.json` (in the app folder)
- **Development**: `python-backend/ollama_config.json`

### 2. **Edit the Configuration**

You can edit `ollama_config.json` with any text editor (Notepad, VS Code, etc.):

```json
{
  "ollama_enabled": true,
  "model_path": "E:\\Models",
  "ollama_executable": "E:\\Models\\ollama.exe",
  "ollama_host": "http://127.0.0.1:11434",
  "ollama_port": 11434,
  "max_retries": 10,
  "retry_delay_seconds": 2,
  "auto_restart_on_failure": true,
  "keep_alive": "5m"
}
```

### 3. **Restart the App**

The app will automatically:
- Read the updated configuration
- Start the Ollama server
- Keep retrying until Ollama is responsive
- Resume normal operation

## Configuration Options

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `ollama_enabled` | boolean | `true` | Enable/disable Ollama auto-start |
| `model_path` | string | `""` (auto-detect) | Path where models are stored |
| `ollama_executable` | string | `""` (auto-detect) | Full path to `ollama.exe` |
| `ollama_host` | string | `http://127.0.0.1:11434` | Host and port for Ollama server |
| `ollama_port` | integer | `11434` | Port number (usually 11434) |
| `max_retries` | integer | `10` | How many times to retry startup |
| `retry_delay_seconds` | integer | `2` | Seconds to wait between retries |
| `auto_restart_on_failure` | boolean | `true` | Auto-restart if Ollama crashes |
| `keep_alive` | string | `5m` | Keep models in memory for 5 minutes |

## Examples

### Example 1: External Drive Storage

If your models are on an external drive (to save disk space on C:):

```json
{
  "model_path": "E:\\MyModels",
  "ollama_executable": "E:\\MyModels\\ollama.exe",
  "ollama_enabled": true
}
```

### Example 2: System-Wide Ollama Installation

If Ollama is installed system-wide (via installer):

```json
{
  "model_path": "C:\\Users\\YourName\\.ollama\\models",
  "ollama_executable": "",
  "ollama_enabled": true
}
```
(Leave `ollama_executable` empty to auto-detect from system PATH)

### Example 3: Network Ollama Server

If running Ollama on a different machine:

```json
{
  "ollama_host": "http://192.168.1.100:11434",
  "ollama_enabled": true
}
```

### Example 4: Disable Auto-Start

If you prefer to start Ollama manually:

```json
{
  "ollama_enabled": false,
  "model_path": "E:\\Models"
}
```

## Startup Script

The app uses a PowerShell script (`start-ollama.ps1`) to start Ollama. This script:

1. **Reads** the `ollama_config.json` file
2. **Finds** the `ollama.exe` executable (checks config path first, then model directory, then system PATH)
3. **Starts** Ollama with the configured environment
4. **Waits** for the server to become responsive
5. **Retries** automatically if startup fails

### Manual Startup

If needed, you can manually run the startup script:

```powershell
# Open PowerShell and run:
cd "C:\Program Files\My_GPT 4 Students"
powershell -ExecutionPolicy RemoteSigned -File start-ollama.ps1
```

## Troubleshooting

### "Ollama executable not found"

**Solution**: Set the `ollama_executable` path in the config file:

```json
{
  "ollama_executable": "C:\\path\\to\\ollama.exe"
}
```

### "Port 11434 is already in use"

**Solution**: Either:
1. Close the other app using port 11434
2. Change the port in config:
   ```json
   {
     "ollama_port": 11435,
     "ollama_host": "http://127.0.0.1:11435"
   }
   ```

### "Models folder not accessible"

**Solution**: Ensure the path is correct and you have read/write permissions:

```json
{
  "model_path": "D:\\Models"  // Make sure D: is accessible
}
```

### "Ollama won't start"

**Solution**: Check the app logs for detailed error messages:

1. Open Settings in the app
2. Look at the "Ollama Status" section
3. Check logs for error details
4. Verify `ollama.exe` path and model path exist

## Using the App Settings

You can also configure Ollama through the app's Settings panel:

1. Click **Settings** (gear icon in top-right)
2. Find **Ollama Configuration** section
3. Update:
   - Model Path
   - Ollama Status
   - Click "Restart Ollama" to apply changes

These settings automatically update `ollama_config.json` and trigger a restart.

## Advanced: Keep Models in Memory

To keep models loaded in RAM longer (faster responses), increase `keep_alive`:

```json
{
  "keep_alive": "10m"  // Keep models for 10 minutes
}
```

Trade-off: Uses more RAM, but faster responses within the keep-alive window.

## Notes

- The configuration file can be safely edited while the app is running
- Changes take effect after restarting the app
- Empty strings (`""`) enable auto-detection
- Comments starting with `#` in config file are ignored
- The startup script has retry logic built-in (max 10 attempts by default)
