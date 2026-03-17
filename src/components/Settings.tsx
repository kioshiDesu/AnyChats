import { useEffect, useState } from 'react';
import { useStore } from '../store/useStore';
import { fetchModels, ApiOptions } from '../services/api';
import { Key, Bot, AlertCircle, Loader2, X, Settings, Eye, EyeOff, Activity, MessageSquare, Network, Moon, Sun, MonitorSmartphone, Search, ChevronDown, Database } from 'lucide-react';
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
    <div className="fixed inset-0 z-50 flex justify-end bg-black/60 backdrop-blur-sm">
      <div className="w-full max-w-md h-[100dvh] bg-white dark:bg-gray-900 shadow-xl border-l border-gray-200 dark:border-gray-800 flex flex-col animate-slide-in-right overflow-hidden">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 dark:border-gray-800 bg-gray-50 dark:bg-gray-800/50 flex-shrink-0">
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white flex items-center gap-2">
            <Settings size={20} className="text-blue-500" />
            Settings
          </h2>
          <div className="flex items-center gap-4">
            <button
              onClick={() => setIsDarkMode(!isDarkMode)}
              aria-label="Toggle dark mode"
              className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-white transition-colors p-1"
            >
              {isDarkMode ? <Sun size={20} /> : <Moon size={20} />}
            </button>
            <button
              onClick={() => setSettingsOpen(false)}
              aria-label="Close settings"
              className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-white transition-colors p-1 rounded-md"
            >
              <X size={20} />
            </button>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          
          <div className="space-y-4 border-b border-gray-200 dark:border-gray-800 pb-6">
            <h3 className="text-sm font-semibold text-gray-900 dark:text-white flex items-center gap-2">
              <Network size={16} className="text-blue-500" />
              Connection Mode
            </h3>
            
            <div className="flex rounded-lg overflow-hidden border border-gray-300 dark:border-gray-700">
              <button
                className={`flex-1 py-2 text-sm font-medium transition-colors ${inputApiMode === 'cloud' ? 'bg-blue-600 text-white' : 'bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700'}`}
                onClick={() => setInputApiMode('cloud')}
              >
                Cloud (OpenRouter)
              </button>
              <button
                className={`flex-1 py-2 text-sm font-medium transition-colors ${inputApiMode === 'local' ? 'bg-blue-600 text-white' : 'bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700'}`}
                onClick={() => setInputApiMode('local')}
              >
                Local (Ollama)
              </button>
            </div>

            {inputApiMode === 'cloud' ? (
              <div className="space-y-2">
                <label className="flex items-center gap-2 text-sm font-medium text-gray-700 dark:text-gray-300">
                  <Key size={16} className="text-gray-400" />
                  OpenRouter API Key
                </label>
                <div className="relative">
                  <input
                    type={showKey ? "text" : "password"}
                    value={inputKey}
                    onChange={(e) => setInputKey(e.target.value)}
                    placeholder="sk-or-v1-..."
                    className="w-full pl-4 pr-10 py-2 border border-gray-300 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 outline-none transition-all"
                  />
                  <button
                    type="button"
                    onClick={() => setShowKey(!showKey)}
                    className="absolute inset-y-0 right-0 px-3 flex items-center text-gray-500"
                  >
                    {showKey ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                </div>
              </div>
            ) : (
              <div className="space-y-2">
                <label className="flex items-center gap-2 text-sm font-medium text-gray-700 dark:text-gray-300">
                  <MonitorSmartphone size={16} className="text-gray-400" />
                  Custom API Base URL
                </label>
                <input
                  type="text"
                  value={inputLocalEndpoint}
                  onChange={(e) => setInputLocalEndpoint(e.target.value)}
                  placeholder="http://127.0.0.1:11434"
                  className="w-full px-4 py-2 border border-gray-300 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 outline-none"
                />
                
                <div className="mt-4 p-4 bg-gray-50 dark:bg-gray-800/50 rounded-lg border border-gray-200 dark:border-gray-700 space-y-2 text-sm text-gray-600 dark:text-gray-400">
                  <p className="font-semibold text-gray-900 dark:text-gray-200">Termux/Ollama Setup:</p>
                  <ol className="list-decimal pl-5 space-y-1">
                    <li>Install Termux from F-Droid</li>
                    <li><code className="bg-gray-200 dark:bg-gray-700 px-1 rounded">pkg install ollama</code></li>
                    <li><code className="bg-gray-200 dark:bg-gray-700 px-1 rounded">ollama serve</code></li>
                    <li>In a new session: <code className="bg-gray-200 dark:bg-gray-700 px-1 rounded">ollama run llama3.2:1b</code></li>
                    <li>Enter <code className="bg-gray-200 dark:bg-gray-700 px-1 rounded">http://127.0.0.1:11434</code> in app</li>
                  </ol>
                  <p className="pt-2 text-xs">Recommended for 4GB RAM: 1B-3B models. For 6GB+ RAM: 7B models.</p>
                </div>

                <div className="mt-4 space-y-2 text-sm">
                  <p className="font-semibold text-gray-900 dark:text-gray-200">Recommended Coding Models:</p>
                  <div className="space-y-2">
                    <div className="flex items-center justify-between p-2 bg-gray-50 dark:bg-gray-800/50 rounded border border-gray-200 dark:border-gray-700">
                      <span className="text-gray-700 dark:text-gray-300 font-mono text-xs">qwen2.5-coder:7b</span>
                      <button onClick={() => navigator.clipboard.writeText('ollama run qwen2.5-coder:7b')} className="text-blue-500 hover:text-blue-600 text-xs font-medium">Copy Command</button>
                    </div>
                    <div className="flex items-center justify-between p-2 bg-gray-50 dark:bg-gray-800/50 rounded border border-gray-200 dark:border-gray-700">
                      <span className="text-gray-700 dark:text-gray-300 font-mono text-xs">deepseek-coder:6.7b</span>
                      <button onClick={() => navigator.clipboard.writeText('ollama run deepseek-coder:6.7b')} className="text-blue-500 hover:text-blue-600 text-xs font-medium">Copy Command</button>
                    </div>
                    <div className="flex items-center justify-between p-2 bg-gray-50 dark:bg-gray-800/50 rounded border border-gray-200 dark:border-gray-700">
                      <span className="text-gray-700 dark:text-gray-300 font-mono text-xs">codellama:7b</span>
                      <button onClick={() => navigator.clipboard.writeText('ollama run codellama:7b')} className="text-blue-500 hover:text-blue-600 text-xs font-medium">Copy Command</button>
                    </div>
                  </div>
                </div>
              </div>
            )}

            <button
              onClick={testConnection}
              disabled={isTestingConn}
              className="w-full flex items-center justify-center gap-2 px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 rounded-lg transition-colors border border-gray-300 dark:border-gray-700 disabled:opacity-50"
            >
              {isTestingConn ? <Loader2 size={16} className="animate-spin" /> : 'Test Connection'}
            </button>
            {connSuccess && <p className="text-green-500 text-sm text-center">Connection successful!</p>}
          </div>

          <div className="space-y-4 border-b border-gray-200 dark:border-gray-800 pb-6">
            <h3 className="text-sm font-semibold text-gray-900 dark:text-white flex items-center gap-2">
              <Bot size={16} className="text-blue-500" />
              Model Configuration
            </h3>

            {models.length > 0 && (
              <div className="space-y-2 relative flex flex-col">
                <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Active Model</label>
                
                <div className="relative order-1">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <Search size={16} className="text-gray-400" />
                  </div>
                  <input
                    type="text"
                    value={isModelDropdownOpen ? modelSearch : (models.find(m => m.id === selectedModel)?.name || selectedModel)}
                    onChange={(e) => {
                      setModelSearch(e.target.value);
                      setIsModelDropdownOpen(true);
                    }}
                    onFocus={() => {
                      setModelSearch(''); // clear search when focusing to easily see all
                      setIsModelDropdownOpen(true);
                    }}
                    onBlur={() => {
                      setIsModelDropdownOpen(false);
                      setModelSearch('');
                    }}
                    placeholder="Search for an AI model..."
                    className="w-full pl-10 pr-10 py-2 border border-gray-300 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white outline-none focus:ring-2 focus:ring-blue-500"
                  />
                  <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none">
                    <ChevronDown size={16} className={`text-gray-400 transition-transform ${isModelDropdownOpen ? 'rotate-180' : ''}`} />
                  </div>
                  
                  {isModelDropdownOpen && (
                    <div className="absolute z-50 w-full mt-1 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-xl max-h-60 overflow-y-auto overscroll-contain">
                      {filteredModels.length > 0 ? (
                        filteredModels.map((model) => (
                          <div
                            key={model.id}
                            className={`px-4 py-3 cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-700 border-b border-gray-100 dark:border-gray-700/50 last:border-0 flex justify-between items-center ${selectedModel === model.id ? 'bg-blue-50 dark:bg-blue-900/20' : ''}`}
                            onMouseDown={(e) => {
                              e.preventDefault(); // Prevent input onBlur from firing immediately
                              setSelectedModel(model.id);
                              setModelSearch(model.name);
                              setIsModelDropdownOpen(false);
                            }}
                          >
                            <div className="flex flex-col min-w-0 pr-2">
                              <div className={`font-medium text-sm truncate ${selectedModel === model.id ? 'text-blue-600 dark:text-blue-400' : 'text-gray-900 dark:text-gray-100'}`}>
                                {model.name}
                              </div>
                              <div className="text-xs text-gray-500 dark:text-gray-400 mt-0.5 truncate">
                                {model.id}
                              </div>
                            </div>
                            {model.pricing && (parseFloat(model.pricing.prompt) === 0 && parseFloat(model.pricing.completion) === 0) && (
                              <span className="shrink-0 px-2 py-0.5 rounded text-[10px] font-medium bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400 border border-green-200 dark:border-green-800">
                                Free
                              </span>
                            )}
                          </div>
                        ))
                      ) : (
                        <div className="px-4 py-4 text-sm text-gray-500 dark:text-gray-400 text-center">
                          No models found matching "{modelSearch}"
                        </div>
                      )}
                    </div>
                  )}
                </div>

                <div className="order-2 mt-2">
                  <div className="text-xs text-gray-500 dark:text-gray-400 mb-1.5">Recently Used:</div>
                  {recentModels && recentModels.length > 0 && (
                    <div className="flex flex-wrap gap-2">
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
                            className={`text-xs px-2.5 py-1.5 rounded-md border ${selectedModel === id ? 'bg-blue-100 border-blue-300 text-blue-700 dark:bg-blue-900/30 dark:border-blue-800 dark:text-blue-300' : 'bg-gray-100 border-gray-200 text-gray-600 hover:bg-gray-200 dark:bg-gray-800 dark:border-gray-700 dark:text-gray-400 dark:hover:bg-gray-700'} transition-colors truncate max-w-[150px]`}
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

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1">
                <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Temperature</label>
                <input
                  type="number" step="0.1" min="0" max="2"
                  value={inputTemp} onChange={(e) => setInputTemp(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white text-sm"
                />
              </div>
              <div className="space-y-1">
                <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Top P</label>
                <input
                  type="number" step="0.1" min="0" max="1"
                  value={inputTopP} onChange={(e) => setInputTopP(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white text-sm"
                />
              </div>
              <div className="space-y-1 col-span-2">
                <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Max Tokens (0 for unlimited)</label>
                <input
                  type="number" min="0" step="100"
                  value={inputMaxTokens} onChange={(e) => setInputMaxTokens(e.target.value)}
                  placeholder="Auto"
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white text-sm"
                />
              </div>
              
              <div className="col-span-2 pt-2">
                <button
                  type="button"
                  onClick={() => {
                    setInputTemp('0.1');
                    setInputTopP('0.9');
                    setInputMaxTokens('4096');
                    setInputPrompt('You are an expert pair programmer. Always write clean, efficient, and well-documented code. When providing code blocks, always include the file path like ```language path="filename.ext"```.');
                  }}
                  className="w-full py-2 text-sm font-medium text-purple-700 dark:text-purple-300 bg-purple-100 dark:bg-purple-900/30 hover:bg-purple-200 dark:hover:bg-purple-900/50 rounded-lg transition-colors border border-purple-200 dark:border-purple-800"
                >
                  Apply Coding Presets (Low Temp, High Tokens)
                </button>
              </div>
            </div>
          </div>

          <div className="space-y-4 pb-6">
            <h3 className="text-sm font-semibold text-gray-900 dark:text-white flex items-center gap-2">
              <MessageSquare size={16} className="text-blue-500" />
              Chat Preferences
            </h3>

            <div className="space-y-2">
              <label className="text-sm font-medium text-gray-700 dark:text-gray-300">System Prompt</label>
              <textarea
                value={inputPrompt}
                onChange={(e) => setInputPrompt(e.target.value)}
                placeholder="You are a helpful assistant..."
                className="w-full px-4 py-2 border border-gray-300 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white min-h-[80px] resize-none"
              />
            </div>

            <div className="flex items-center gap-3">
              <label className="flex items-center gap-2 text-sm font-medium text-gray-700 dark:text-gray-300 cursor-pointer">
                <Activity size={16} className="text-gray-400" />
                Stream Responses
              </label>
              <div 
                onClick={() => setInputStreaming(!inputStreaming)}
                className={`relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 ${inputStreaming ? 'bg-blue-600' : 'bg-gray-200 dark:bg-gray-700'}`}
              >
                <span className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${inputStreaming ? 'translate-x-5' : 'translate-x-0'}`} />
              </div>
            </div>
          </div>
          
          <div className="space-y-4 pb-6">
            <h3 className="text-sm font-semibold text-gray-900 dark:text-white flex items-center gap-2">
              <Database size={16} className="text-blue-500" />
              Storage Management
            </h3>
            
            <div className="space-y-2 text-sm text-gray-700 dark:text-gray-300">
              <div className="flex justify-between items-center">
                <span>Workspace Storage Usage</span>
                <span className="font-medium">{storageQuota.formattedUsage} / {storageQuota.formattedQuota}</span>
              </div>
              <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                <div 
                  className="bg-blue-600 h-2 rounded-full transition-all duration-500"
                  style={{ width: `${Math.min(100, storageQuota.percentUsed)}%` }}
                ></div>
              </div>
              {storageQuota.percentUsed > 80 && (
                <p className="text-xs text-orange-500 mt-2 flex items-center gap-1">
                  <AlertCircle size={12} /> Running low on storage space.
                </p>
              )}
              
              <div className="pt-4">
                <button
                  type="button"
                  onClick={async () => {
                    if (window.confirm("Are you sure you want to clear ALL workspace files and projects? This cannot be undone.")) {
                      const { dbService } = await import('../services/db');
                      await dbService.clearAll();
                      const { useWorkspaceStore } = await import('../store/useWorkspaceStore');
                      await useWorkspaceStore.getState().loadProjects();
                      useWorkspaceStore.getState().setCurrentProject(null);
                      alert("Workspace database cleared.");
                    }
                  }}
                  className="w-full py-2 text-sm font-medium text-red-700 dark:text-red-300 bg-red-100 dark:bg-red-900/30 hover:bg-red-200 dark:hover:bg-red-900/50 rounded-lg transition-colors border border-red-200 dark:border-red-800"
                >
                  Clear Workspace Database
                </button>
              </div>
            </div>
          </div>

          {error && (
            <div className="flex items-center gap-2 text-red-600 dark:text-red-400 text-sm bg-red-50 dark:bg-red-900/20 p-3 rounded-lg">
              <AlertCircle size={16} className="shrink-0" />
              <p>{error}</p>
            </div>
          )}
        </div>

        <div className="p-6 border-t border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 flex-shrink-0">
          <div className="flex justify-end gap-3">
            <button
              onClick={() => setSettingsOpen(false)}
              className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleSave}
              disabled={isLoading}
              className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors disabled:opacity-50"
            >
              {isLoading ? <Loader2 size={16} className="animate-spin" /> : 'Save & Refresh'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
