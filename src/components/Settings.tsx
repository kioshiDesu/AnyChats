import { useEffect, useState } from 'react';
import { useStore } from '../store/useStore';
import { fetchModels, ApiOptions } from '../services/api';
import { Key, AlertCircle, Loader2, X, Eye, EyeOff, Moon, Sun, Search, ChevronDown } from 'lucide-react';
import { useStorageQuota } from '../hooks/useFileSystem';

export function SettingsModal() {
  const {
    apiKey, setApiKey,
    models, setModels,
    selectedModel, setSelectedModel,
    recentModels,
    isSettingsOpen, setSettingsOpen,
    systemPrompt, setSystemPrompt,
    useStreaming, setUseStreaming,
    apiMode, setApiMode,
    localEndpoint, setLocalEndpoint,
    temperature, setTemperature,
    topP, setTopP,
    maxTokens, setMaxTokens,
    isDarkMode, setIsDarkMode,
  } = useStore();

  const [inputKey, setInputKey] = useState(apiKey);
  const [inputPrompt, setInputPrompt] = useState(systemPrompt);
  const [inputStreaming, setInputStreaming] = useState(useStreaming);
  const [inputApiMode, setInputApiMode] = useState(apiMode);
  const [inputLocalEndpoint, setInputLocalEndpoint] = useState(localEndpoint);
  
  const [inputTemp, setInputTemp] = useState(temperature.toString());
  const [inputTopP, setInputTopP] = useState(topP.toString());
  const [inputMaxTokens, setInputMaxTokens] = useState(maxTokens?.toString() || '');
  const [modelSearch, setModelSearch] = useState('');
  const [isModelDropdownOpen, setIsModelDropdownOpen] = useState(false);

  const [isLoading, setIsLoading] = useState(false);
  const [isTestingConn, setIsTestingConn] = useState(false);
  const [connSuccess, setConnSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showKey, setShowKey] = useState(false);
  
  const storageQuota = useStorageQuota();

  useEffect(() => {
    setInputKey(apiKey);
    setInputPrompt(systemPrompt);
    setInputStreaming(useStreaming);
    setInputApiMode(apiMode);
    setInputLocalEndpoint(localEndpoint);
    setInputTemp(temperature.toString());
    setInputTopP(topP.toString());
    setInputMaxTokens(maxTokens?.toString() || '');
  }, [apiKey, systemPrompt, useStreaming, apiMode, localEndpoint, temperature, topP, maxTokens, isSettingsOpen]);

  useEffect(() => {
    if (selectedModel && models.length > 0) {
      const active = models.find(m => m.id === selectedModel);
      setModelSearch(active ? active.name : selectedModel);
    }
  }, [selectedModel, models, isSettingsOpen]);

  const filteredModels = models.filter((m) =>
    m.id.toLowerCase().includes(modelSearch.toLowerCase()) ||
    m.name?.toLowerCase().includes(modelSearch.toLowerCase())
  );

  const testConnection = async () => {
    if (inputApiMode === 'cloud' && !inputKey.trim()) {
      setError('API Key is required for Cloud mode');
      return;
    }

    if (inputApiMode === 'local' && !inputLocalEndpoint.trim()) {
      setError('Custom API Base URL is required for Local mode');
      return;
    }

    setIsTestingConn(true);
    setError(null);
    setConnSuccess(false);
    try {
      const options: ApiOptions = {
        apiMode: inputApiMode,
        apiKey: inputKey,
        localEndpoint: inputLocalEndpoint,
        model: '',
      };
      const fetchedModels = await fetchModels(options);
      
      if (!fetchedModels || fetchedModels.length === 0) {
        throw new Error('No models found. Please check your connection.');
      }
      
      setModels(fetchedModels);
      if (!fetchedModels.find((m:any) => m.id === selectedModel)) {
        setSelectedModel(fetchedModels[0].id);
      }
      
      setConnSuccess(true);
      setTimeout(() => setConnSuccess(false), 3000);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Connection failed');
    } finally {
      setIsTestingConn(false);
    }
  };

  const handleSave = async () => {
    if (inputApiMode === 'cloud' && !inputKey.trim()) {
      setError('API Key is required for Cloud mode');
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const options: ApiOptions = {
        apiMode: inputApiMode,
        apiKey: inputKey,
        localEndpoint: inputLocalEndpoint,
        model: '',
      };
      
      const fetchedModels = await fetchModels(options);
      setModels(fetchedModels);
      
      if (fetchedModels.length > 0 && !fetchedModels.find((m:any) => m.id === selectedModel)) {
        setSelectedModel(fetchedModels[0].id);
      }

      setApiKey(inputKey);
      setApiMode(inputApiMode);
      setLocalEndpoint(inputLocalEndpoint);
      setSystemPrompt(inputPrompt);
      setUseStreaming(inputStreaming);
      
      const pTemp = parseFloat(inputTemp);
      if (!isNaN(pTemp)) setTemperature(pTemp);
      
      const pTopP = parseFloat(inputTopP);
      if (!isNaN(pTopP)) setTopP(pTopP);
      
      const pMax = parseInt(inputMaxTokens);
      setMaxTokens(isNaN(pMax) ? undefined : pMax);

      setSettingsOpen(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save settings');
    } finally {
      setIsLoading(false);
    }
  };

  if (!isSettingsOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-black/60">
      <div className="w-full max-w-md h-[100dvh] bg-neutral-950 shadow-xl border-l border-white/[0.06] flex flex-col animate-slide-in-right overflow-hidden">
        <div className="flex items-center justify-between px-5 py-3.5 border-b border-white/[0.06] flex-shrink-0">
          <h2 className="text-base font-semibold text-white tracking-tight">
            Settings
          </h2>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setIsDarkMode(!isDarkMode)}
              aria-label="Toggle dark mode"
              className="text-neutral-500 hover:text-white transition-colors p-1.5 rounded hover:bg-white/[0.06]"
            >
              {isDarkMode ? <Sun size={16} strokeWidth={1.5} /> : <Moon size={16} strokeWidth={1.5} />}
            </button>
            <button
              onClick={() => setSettingsOpen(false)}
              aria-label="Close settings"
              className="text-neutral-500 hover:text-white transition-colors p-1.5 rounded hover:bg-white/[0.06]"
            >
              <X size={16} />
            </button>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-5 space-y-8">
          
          <div className="space-y-4 border-b border-white/[0.06] pb-6">
            <h3 className="text-[11px] font-semibold text-neutral-500 uppercase tracking-wider">
              Connection
            </h3>
            
            <div className="flex rounded overflow-hidden border border-white/[0.08]">
              <button
                className={`flex-1 py-2 text-sm font-medium transition-colors ${inputApiMode === 'cloud' ? 'bg-accent text-white' : 'bg-surface-2 text-neutral-400 hover:bg-surface-3 hover:text-white'}`}
                onClick={() => setInputApiMode('cloud')}
              >
                Cloud
              </button>
              <button
                className={`flex-1 py-2 text-sm font-medium transition-colors ${inputApiMode === 'local' ? 'bg-accent text-white' : 'bg-surface-2 text-neutral-400 hover:bg-surface-3 hover:text-white'}`}
                onClick={() => setInputApiMode('local')}
              >
                Local
              </button>
            </div>

            {inputApiMode === 'cloud' ? (
              <div className="space-y-1.5">
                <label className="text-sm font-medium text-neutral-300">
                  API Key
                </label>
                <div className="relative">
                  <input
                    type={showKey ? "text" : "password"}
                    value={inputKey}
                    onChange={(e) => setInputKey(e.target.value)}
                    placeholder="sk-or-v1-..."
                    className="w-full pl-3 pr-10 py-2 border border-white/[0.08] rounded bg-surface-2 text-white text-sm placeholder-neutral-600 outline-none focus:border-accent/40 transition-colors"
                  />
                  <button
                    type="button"
                    onClick={() => setShowKey(!showKey)}
                    className="absolute inset-y-0 right-0 px-3 flex items-center text-neutral-500"
                  >
                    {showKey ? <EyeOff size={16} strokeWidth={1.5} /> : <Eye size={16} strokeWidth={1.5} />}
                  </button>
                </div>
              </div>
            ) : (
              <div className="space-y-1.5">
                <label className="text-sm font-medium text-neutral-300">
                  Ollama endpoint
                </label>
                <input
                  type="text"
                  value={inputLocalEndpoint}
                  onChange={(e) => setInputLocalEndpoint(e.target.value)}
                  placeholder="http://127.0.0.1:11434"
                  className="w-full px-3 py-2 border border-white/[0.08] rounded bg-surface-2 text-white text-sm placeholder-neutral-600 outline-none focus:border-accent/40 transition-colors"
                />
                
                <div className="mt-4 p-3 bg-surface-2 rounded border border-white/[0.06] space-y-2 text-sm text-neutral-400">
                  <p className="font-medium text-neutral-300">Termux / Ollama setup</p>
                  <ol className="list-decimal pl-4 space-y-1 text-[13px]">
                    <li>Install Termux from F-Droid</li>
                    <li><code className="bg-white/[0.06] px-1 rounded text-[12px]">pkg install ollama</code></li>
                    <li><code className="bg-white/[0.06] px-1 rounded text-[12px]">ollama serve</code></li>
                    <li>New session: <code className="bg-white/[0.06] px-1 rounded text-[12px]">ollama run llama3.2:1b</code></li>
                    <li>Enter <code className="bg-white/[0.06] px-1 rounded text-[12px]">http://127.0.0.1:11434</code></li>
                  </ol>
                  <p className="pt-1 text-[11px] text-neutral-500">4GB RAM: 1B-3B models. 6GB+: 7B models.</p>
                </div>

                <div className="mt-4 space-y-1.5 text-sm">
                  <p className="font-medium text-neutral-300">Recommended models</p>
                  {['qwen2.5-coder:7b', 'deepseek-coder:6.7b', 'codellama:7b'].map(model => (
                    <div key={model} className="flex items-center justify-between p-2 bg-surface-2 rounded border border-white/[0.06]">
                      <span className="text-neutral-400 font-mono text-[12px]">{model}</span>
                      <button onClick={() => navigator.clipboard.writeText(`ollama run ${model}`)} className="text-accent hover:text-accent-soft text-[11px] font-medium transition-colors">Copy</button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <button
              onClick={testConnection}
              disabled={isTestingConn}
              className="w-full flex items-center justify-center gap-2 px-3 py-2 text-sm font-medium text-neutral-300 bg-surface-2 hover:bg-surface-3 rounded transition-colors border border-white/[0.08] disabled:opacity-50"
            >
              {isTestingConn ? <Loader2 size={14} strokeWidth={1.5} className="animate-spin" /> : 'Test connection'}
            </button>
            {connSuccess && <p className="text-success text-sm text-center">Connected</p>}
          </div>

          <div className="space-y-4 border-b border-white/[0.06] pb-6">
            <h3 className="text-[11px] font-semibold text-neutral-500 uppercase tracking-wider">
              Model
            </h3>

            {models.length > 0 && (
              <div className="space-y-2 relative flex flex-col">
                <label className="text-sm font-medium text-neutral-300">Active model</label>
                
                <div className="relative order-1">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <Search size={14} strokeWidth={1.5} className="text-neutral-500" />
                  </div>
                  <input
                    type="text"
                    value={isModelDropdownOpen ? modelSearch : (models.find(m => m.id === selectedModel)?.name || selectedModel)}
                    onChange={(e) => {
                      setModelSearch(e.target.value);
                      setIsModelDropdownOpen(true);
                    }}
                    onFocus={() => {
                      setModelSearch('');
                      setIsModelDropdownOpen(true);
                    }}
                    onBlur={() => {
                      setIsModelDropdownOpen(false);
                      setModelSearch('');
                    }}
                    placeholder="Search models..."
                    className="w-full pl-9 pr-9 py-2 border border-white/[0.08] rounded bg-surface-2 text-white text-sm placeholder-neutral-600 outline-none focus:border-accent/40 transition-colors"
                  />
                  <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none">
                    <ChevronDown size={14} strokeWidth={1.5} className={`text-neutral-500 transition-transform ${isModelDropdownOpen ? 'rotate-180' : ''}`} />
                  </div>
                  
                  {isModelDropdownOpen && (
                    <div className="absolute z-50 w-full mt-1 bg-surface-1 border border-white/[0.08] rounded shadow-xl max-h-60 overflow-y-auto overscroll-contain">
                      {filteredModels.length > 0 ? (
                        filteredModels.map((model) => (
                          <div
                            key={model.id}
                            className={`px-3 py-2.5 cursor-pointer hover:bg-white/[0.04] border-b border-white/[0.04] last:border-0 flex justify-between items-center ${selectedModel === model.id ? 'bg-accent-muted' : ''}`}
                            onMouseDown={(e) => {
                              e.preventDefault();
                              setSelectedModel(model.id);
                              setModelSearch(model.name);
                              setIsModelDropdownOpen(false);
                            }}
                          >
                            <div className="flex flex-col min-w-0 pr-2">
                              <div className={`font-medium text-sm truncate ${selectedModel === model.id ? 'text-accent' : 'text-neutral-200'}`}>
                                {model.name}
                              </div>
                              <div className="text-xs text-neutral-500 mt-0.5 truncate">
                                {model.id}
                              </div>
                            </div>
                            {model.pricing && (parseFloat(model.pricing.prompt) === 0 && parseFloat(model.pricing.completion) === 0) && (
                              <span className="shrink-0 px-1.5 py-0.5 rounded text-[10px] font-medium bg-success-soft text-success border border-success/20">
                                Free
                              </span>
                            )}
                          </div>
                        ))
                      ) : (
                        <div className="px-3 py-3 text-sm text-neutral-500 text-center">
                          No models matching "{modelSearch}"
                        </div>
                      )}
                    </div>
                  )}
                </div>

                <div className="order-2 mt-2">
                  <div className="text-[11px] text-neutral-500 mb-1.5 uppercase tracking-wider font-medium">Recent</div>
                  {recentModels && recentModels.length > 0 && (
                    <div className="flex flex-wrap gap-1.5">
                      {recentModels.map(id => {
                        const m = models.find(mod => mod.id === id);
                        if (!m) return null;
                        return (
                          <button
                            key={id}
                            onClick={() => {
                              setSelectedModel(id);
                              setModelSearch(m.name);
                            }}
                            className={`text-[11px] px-2 py-1 rounded border transition-colors truncate max-w-[140px] ${selectedModel === id ? 'bg-accent-muted border-accent/30 text-accent' : 'bg-surface-2 border-white/[0.06] text-neutral-400 hover:bg-surface-3 hover:text-white'}`}
                            title={m.name}
                          >
                            {m.name.split(' ')[0]}
                          </button>
                        );
                      })}
                    </div>
                  )}
                </div>
              </div>
            )}

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <label className="text-sm font-medium text-neutral-300">Temperature</label>
                <input
                  type="number" step="0.1" min="0" max="2"
                  value={inputTemp} onChange={(e) => setInputTemp(e.target.value)}
                  className="w-full px-2.5 py-2 border border-white/[0.08] rounded bg-surface-2 text-white text-sm outline-none focus:border-accent/40 transition-colors"
                />
              </div>
              <div className="space-y-1">
                <label className="text-sm font-medium text-neutral-300">Top P</label>
                <input
                  type="number" step="0.1" min="0" max="1"
                  value={inputTopP} onChange={(e) => setInputTopP(e.target.value)}
                  className="w-full px-2.5 py-2 border border-white/[0.08] rounded bg-surface-2 text-white text-sm outline-none focus:border-accent/40 transition-colors"
                />
              </div>
              <div className="space-y-1 col-span-2">
                <label className="text-sm font-medium text-neutral-300">Max tokens <span className="text-neutral-500 font-normal">(0 = unlimited)</span></label>
                <input
                  type="number" min="0" step="100"
                  value={inputMaxTokens} onChange={(e) => setInputMaxTokens(e.target.value)}
                  placeholder="Auto"
                  className="w-full px-2.5 py-2 border border-white/[0.08] rounded bg-surface-2 text-white text-sm placeholder-neutral-600 outline-none focus:border-accent/40 transition-colors"
                />
              </div>
              
              <div className="col-span-2 pt-1">
                <button
                  type="button"
                  onClick={() => {
                    setInputTemp('0.1');
                    setInputTopP('0.9');
                    setInputMaxTokens('4096');
                    setInputPrompt('You are an expert pair programmer. Always write clean, efficient, and well-documented code. When providing code blocks, always include the file path like ```language path="filename.ext"```.');
                  }}
                  className="w-full py-2 text-sm font-medium text-neutral-300 bg-surface-2 hover:bg-surface-3 rounded transition-colors border border-white/[0.08]"
                >
                  Apply coding presets
                </button>
              </div>
            </div>
          </div>

          <div className="space-y-4 pb-6">
            <h3 className="text-[11px] font-semibold text-neutral-500 uppercase tracking-wider">
              Chat
            </h3>

            <div className="space-y-1.5">
              <label className="text-sm font-medium text-neutral-300">System prompt</label>
              <textarea
                value={inputPrompt}
                onChange={(e) => setInputPrompt(e.target.value)}
                placeholder="You are a helpful assistant..."
                className="w-full px-3 py-2 border border-white/[0.08] rounded bg-surface-2 text-white text-sm placeholder-neutral-600 min-h-[80px] resize-none outline-none focus:border-accent/40 transition-colors"
              />
            </div>

            <div className="flex items-center gap-3">
              <label className="flex items-center gap-2 text-sm font-medium text-neutral-300 cursor-pointer">
                Stream responses
              </label>
              <div 
                onClick={() => setInputStreaming(!inputStreaming)}
                className={`relative inline-flex h-5 w-9 flex-shrink-0 cursor-pointer rounded-full border border-transparent transition-colors duration-150 ease-out focus:outline-none ${inputStreaming ? 'bg-accent' : 'bg-surface-3'}`}
              >
                <span className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow transition duration-150 ease-out ${inputStreaming ? 'translate-x-4' : 'translate-x-0.5'}`} />
              </div>
            </div>
          </div>
          
          <div className="space-y-4 pb-6">
            <h3 className="text-[11px] font-semibold text-neutral-500 uppercase tracking-wider">
              Storage
            </h3>
            
            <div className="space-y-2 text-sm text-neutral-300">
              <div className="flex justify-between items-center">
                <span>Workspace usage</span>
                <span className="font-medium">{storageQuota.formattedUsage} / {storageQuota.formattedQuota}</span>
              </div>
              <div className="w-full bg-surface-3 rounded-full h-1.5">
                <div 
                  className="bg-accent h-1.5 rounded-full transition-all duration-500"
                  style={{ width: `${Math.min(100, storageQuota.percentUsed)}%` }}
                ></div>
              </div>
              {storageQuota.percentUsed > 80 && (
                <p className="text-[12px] text-warning mt-2 flex items-center gap-1">
                  <AlertCircle size={12} strokeWidth={1.5} /> Storage running low
                </p>
              )}
              
              <div className="pt-3">
                <button
                  type="button"
                  onClick={async () => {
                    if (window.confirm("Clear ALL workspace files and projects? This cannot be undone.")) {
                      const { dbService } = await import('../services/db');
                      await dbService.clearAll();
                      const { useWorkspaceStore } = await import('../store/useWorkspaceStore');
                      await useWorkspaceStore.getState().loadProjects();
                      useWorkspaceStore.getState().setCurrentProject(null);
                      alert("Workspace cleared.");
                    }
                  }}
                  className="w-full py-2 text-sm font-medium text-danger bg-danger-soft hover:bg-danger/20 rounded transition-colors border border-danger/20"
                >
                  Clear workspace
                </button>
              </div>
            </div>
          </div>

          {error && (
            <div className="flex items-center gap-2 text-danger text-sm bg-danger-soft p-3 rounded border border-danger/20">
              <AlertCircle size={14} strokeWidth={1.5} className="shrink-0" />
              <p>{error}</p>
            </div>
          )}
        </div>

        <div className="p-5 border-t border-white/[0.06] bg-neutral-950 flex-shrink-0">
          <div className="flex justify-end gap-2">
            <button
              onClick={() => setSettingsOpen(false)}
              className="px-3 py-2 text-sm font-medium text-neutral-400 hover:text-white hover:bg-white/[0.06] rounded transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleSave}
              disabled={isLoading}
              className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-accent hover:bg-accent-soft rounded transition-colors disabled:opacity-50"
            >
              {isLoading ? <Loader2 size={14} strokeWidth={1.5} className="animate-spin" /> : 'Save & refresh'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
