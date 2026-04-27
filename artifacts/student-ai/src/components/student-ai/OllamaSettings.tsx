import React, { useState, useEffect } from 'react';
import { Loader2, AlertCircle, CheckCircle2, Settings2, HardDrive, Zap } from 'lucide-react';
import { api } from './api';

interface OllamaConfig {
  ollama_enabled: boolean;
  model_path: string;
  ollama_executable: string;
  ollama_host: string;
  ollama_port: number;
  max_retries: number;
  retry_delay_seconds: number;
  auto_restart_on_failure: boolean;
  keep_alive?: string;
}

interface OllamaStatus {
  enabled: boolean;
  is_running: boolean;
  host: string;
  port: number;
  config_file?: string;
  startup_script?: string;
}

interface Props {
  c: Record<string, string>; // Color/style classes
}

export function OllamaSettings({ c }: Props) {
  const [config, setConfig] = useState<OllamaConfig | null>(null);
  const [status, setStatus] = useState<OllamaStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'success' | 'error'>('idle');
  const [errorMessage, setErrorMessage] = useState<string>('');
  const [successMessage, setSuccessMessage] = useState<string>('');
  const [checkingStatus, setCheckingStatus] = useState(false);

  // Load config and status on mount
  useEffect(() => {
    loadSettings();
    checkOllamaStatus();
  }, []);

  const loadSettings = async () => {
    try {
      setLoading(true);
      const cfg = await api.getOllamaConfig();
      setConfig(cfg);
    } catch (error) {
      setErrorMessage('Failed to load Ollama configuration');
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const checkOllamaStatus = async () => {
    try {
      setCheckingStatus(true);
      const st = await api.getOllamaStatus();
      setStatus(st);
    } catch (error) {
      setStatus({ enabled: false, is_running: false, host: 'unknown', port: 11434 });
    } finally {
      setCheckingStatus(false);
    }
  };

  const handleSaveAndRestart = async () => {
    if (!config) return;

    setSaving(true);
    setSaveStatus('saving');
    setErrorMessage('');
    setSuccessMessage('');

    try {
      // Save config
      await api.updateOllamaConfig(config);
      setSaveStatus('success');
      setSuccessMessage('Configuration saved! Restarting Ollama...');

      // Trigger restart
      await api.restartOllama();

      // Poll for Ollama to come back online
      let retries = 0;
      const maxRetries = 30; // 30 seconds with 1-second intervals

      const waitForOllama = setInterval(async () => {
        retries++;
        try {
          const st = await api.getOllamaStatus();
          if (st.is_running) {
            clearInterval(waitForOllama);
            setStatus(st);
            setSuccessMessage('✓ Ollama restarted successfully with new settings!');
            setTimeout(() => {
              setSaveStatus('idle');
              setSuccessMessage('');
            }, 3000);
          }
        } catch (error) {
          if (retries >= maxRetries) {
            clearInterval(waitForOllama);
            setSaveStatus('error');
            setErrorMessage('Ollama did not restart within 30 seconds. Check configuration.');
          }
        }
      }, 1000);
    } catch (error: any) {
      setSaveStatus('error');
      setErrorMessage(error?.message || 'Failed to save configuration');
    } finally {
      setSaving(false);
    }
  };

  const handleRestartOllama = async () => {
    setSaving(true);
    setSaveStatus('saving');
    setErrorMessage('');
    setSuccessMessage('');

    try {
      await api.restartOllama();
      setSuccessMessage('Ollama is restarting...');

      // Poll for restart
      let retries = 0;
      const maxRetries = 30;

      const waitForOllama = setInterval(async () => {
        retries++;
        try {
          const st = await api.getOllamaStatus();
          if (st.is_running) {
            clearInterval(waitForOllama);
            setStatus(st);
            setSuccessMessage('✓ Ollama restarted successfully!');
            setTimeout(() => {
              setSaveStatus('idle');
              setSuccessMessage('');
            }, 3000);
          }
        } catch (error) {
          if (retries >= maxRetries) {
            clearInterval(waitForOllama);
            setSaveStatus('error');
            setErrorMessage('Ollama restart timeout.');
          }
        }
      }, 1000);
    } catch (error: any) {
      setSaveStatus('error');
      setErrorMessage(error?.message || 'Failed to restart Ollama');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <section>
        <h3 className={`text-[11px] uppercase tracking-widest font-semibold mb-3 ${c.textFaint}`}>
          Ollama Configuration
        </h3>
        <div className={`rounded-xl border ${c.border} ${c.bgMuted} p-3 flex items-center gap-3`}>
          <Loader2 className="w-4 h-4 text-indigo-500 animate-spin" />
          <p className={`text-[11px] ${c.textFaint}`}>Loading Ollama settings…</p>
        </div>
      </section>
    );
  }

  return (
    <section>
      <h3 className={`text-[11px] uppercase tracking-widest font-semibold mb-3 ${c.textFaint}`}>
        Ollama Configuration
      </h3>

      <div className={`rounded-xl border ${c.border} ${c.bgMuted} p-4 space-y-4`}>
        {/* Status indicator */}
        <div className={`flex items-center gap-3 p-3 rounded-lg ${status?.is_running ? 'bg-emerald-500/10 border border-emerald-400/30' : 'bg-red-500/10 border border-red-400/30'}`}>
          <div className={`w-2 h-2 rounded-full ${status?.is_running ? 'bg-emerald-500' : 'bg-red-500'}`} />
          <div className="flex-1 min-w-0">
            <p className={`text-xs font-medium ${status?.is_running ? 'text-emerald-600' : 'text-red-600'}`}>
              {status?.is_running ? 'Ollama is running' : 'Ollama is not running'}
            </p>
            <p className={`text-[10px] mt-0.5 ${c.textFaint}`}>
              {status?.host}:{status?.port}
            </p>
          </div>
          <button
            onClick={checkOllamaStatus}
            disabled={checkingStatus}
            className={`px-2 py-1 rounded-md text-[10px] font-medium border ${c.border} ${c.textBody} ${c.hoverMuted} disabled:opacity-50`}
          >
            {checkingStatus ? <Loader2 className="w-3 h-3 animate-spin" /> : 'Check'}
          </button>
        </div>

        {/* Enable/Disable toggle */}
        <div className="flex items-center justify-between">
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={config?.ollama_enabled ?? false}
              onChange={(e) => setConfig(prev => prev ? { ...prev, ollama_enabled: e.target.checked } : null)}
              className="w-4 h-4 rounded border border-indigo-300 accent-indigo-600"
            />
            <span className={`text-xs font-medium ${c.text}`}>Enable Ollama Auto-Start</span>
          </label>
        </div>

        {/* Model Path */}
        <div>
          <label className={`text-xs font-medium ${c.text} block mb-1.5`}>Model Path</label>
          <input
            type="text"
            value={config?.model_path ?? ''}
            onChange={(e) => setConfig(prev => prev ? { ...prev, model_path: e.target.value } : null)}
            placeholder="e.g., E:\MyModels or leave empty for auto-detect"
            className={`w-full px-3 py-2 rounded-lg border ${c.border} ${c.card} text-xs font-mono ${c.text} placeholder:${c.textFaint} focus:outline-none focus:ring-1 focus:ring-indigo-500`}
          />
          <p className={`text-[10px] mt-1 ${c.textFaint}`}>Directory containing your models. Leave empty to auto-detect.</p>
        </div>

        {/* Ollama Executable */}
        <div>
          <label className={`text-xs font-medium ${c.text} block mb-1.5`}>Ollama Executable Path</label>
          <input
            type="text"
            value={config?.ollama_executable ?? ''}
            onChange={(e) => setConfig(prev => prev ? { ...prev, ollama_executable: e.target.value } : null)}
            placeholder="e.g., E:\MyModels\ollama.exe or leave empty for auto-detect"
            className={`w-full px-3 py-2 rounded-lg border ${c.border} ${c.card} text-xs font-mono ${c.text} placeholder:${c.textFaint} focus:outline-none focus:ring-1 focus:ring-indigo-500`}
          />
          <p className={`text-[10px] mt-1 ${c.textFaint}`}>Path to ollama.exe. Leave empty to auto-detect from system PATH.</p>
        </div>

        {/* Ollama Host */}
        <div>
          <label className={`text-xs font-medium ${c.text} block mb-1.5`}>Ollama Host</label>
          <input
            type="text"
            value={config?.ollama_host ?? ''}
            onChange={(e) => setConfig(prev => prev ? { ...prev, ollama_host: e.target.value } : null)}
            placeholder="http://127.0.0.1:11434"
            className={`w-full px-3 py-2 rounded-lg border ${c.border} ${c.card} text-xs font-mono ${c.text} placeholder:${c.textFaint} focus:outline-none focus:ring-1 focus:ring-indigo-500`}
          />
          <p className={`text-[10px] mt-1 ${c.textFaint}`}>Change if Ollama is on a different PC (e.g., http://192.168.1.100:11434)</p>
        </div>

        {/* Ollama Port */}
        <div className="grid grid-cols-3 gap-3">
          <div>
            <label className={`text-xs font-medium ${c.text} block mb-1.5`}>Port</label>
            <input
              type="number"
              value={config?.ollama_port ?? 11434}
              onChange={(e) => setConfig(prev => prev ? { ...prev, ollama_port: parseInt(e.target.value) } : null)}
              min="1"
              max="65535"
              className={`w-full px-3 py-2 rounded-lg border ${c.border} ${c.card} text-xs ${c.text} focus:outline-none focus:ring-1 focus:ring-indigo-500`}
            />
          </div>

          {/* Max Retries */}
          <div>
            <label className={`text-xs font-medium ${c.text} block mb-1.5`}>Max Retries</label>
            <input
              type="number"
              value={config?.max_retries ?? 10}
              onChange={(e) => setConfig(prev => prev ? { ...prev, max_retries: parseInt(e.target.value) } : null)}
              min="1"
              max="100"
              className={`w-full px-3 py-2 rounded-lg border ${c.border} ${c.card} text-xs ${c.text} focus:outline-none focus:ring-1 focus:ring-indigo-500`}
            />
          </div>

          {/* Retry Delay */}
          <div>
            <label className={`text-xs font-medium ${c.text} block mb-1.5`}>Retry Delay (s)</label>
            <input
              type="number"
              value={config?.retry_delay_seconds ?? 2}
              onChange={(e) => setConfig(prev => prev ? { ...prev, retry_delay_seconds: parseInt(e.target.value) } : null)}
              min="1"
              max="60"
              className={`w-full px-3 py-2 rounded-lg border ${c.border} ${c.card} text-xs ${c.text} focus:outline-none focus:ring-1 focus:ring-indigo-500`}
            />
          </div>
        </div>

        {/* Auto-restart on failure */}
        <div className="flex items-center justify-between pt-2">
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={config?.auto_restart_on_failure ?? true}
              onChange={(e) => setConfig(prev => prev ? { ...prev, auto_restart_on_failure: e.target.checked } : null)}
              className="w-4 h-4 rounded border border-indigo-300 accent-indigo-600"
            />
            <span className={`text-xs font-medium ${c.text}`}>Auto-Restart on Failure</span>
          </label>
        </div>

        {/* Error Message */}
        {errorMessage && (
          <div className="flex items-start gap-2.5 p-3 rounded-lg bg-red-500/10 border border-red-400/30">
            <AlertCircle className="w-4 h-4 text-red-600 flex-shrink-0 mt-0.5" />
            <p className="text-[11px] text-red-600">{errorMessage}</p>
          </div>
        )}

        {/* Success Message */}
        {successMessage && (
          <div className="flex items-start gap-2.5 p-3 rounded-lg bg-emerald-500/10 border border-emerald-400/30">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 flex-shrink-0 mt-0.5" />
            <p className="text-[11px] text-emerald-600">{successMessage}</p>
          </div>
        )}

        {/* Loading Indicator */}
        {saveStatus === 'saving' && (
          <div className="flex items-center gap-2 p-3 rounded-lg bg-indigo-500/10 border border-indigo-400/30">
            <Loader2 className="w-4 h-4 text-indigo-600 animate-spin" />
            <p className="text-[11px] text-indigo-600">
              {saving ? 'Saving and restarting...' : 'Processing...'}
            </p>
          </div>
        )}

        {/* Buttons */}
        <div className="flex items-center gap-2 pt-2">
          <button
            onClick={handleSaveAndRestart}
            disabled={saving || !config}
            className="flex-1 px-3 py-2 rounded-lg text-[11px] font-medium bg-indigo-600 text-white hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-2"
          >
            {saving ? (
              <>
                <Loader2 className="w-3 h-3 animate-spin" />
                Saving...
              </>
            ) : (
              <>
                <Settings2 className="w-3 h-3" />
                Save & Restart
              </>
            )}
          </button>

          <button
            onClick={handleRestartOllama}
            disabled={saving || !config || !config.ollama_enabled}
            title="Restart Ollama with current settings"
            className={`px-3 py-2 rounded-lg text-[11px] font-medium border ${c.border} ${c.textBody} ${c.hoverMuted} disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-2`}
          >
            {saving ? (
              <Loader2 className="w-3 h-3 animate-spin" />
            ) : (
              <Zap className="w-3 h-3" />
            )}
            Restart
          </button>
        </div>

        <p className={`text-[10px] ${c.textFaint} text-center pt-2`}>
          Changes are applied immediately. Ollama will restart with new settings.
        </p>
      </div>
    </section>
  );
}
