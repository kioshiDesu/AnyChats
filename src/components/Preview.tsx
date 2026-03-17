import { useEffect, useRef, useState } from 'react';
import { useWorkspaceStore } from '../store/useWorkspaceStore';
import { useStore } from '../store/useStore';
import { X, Play, RefreshCw, Terminal } from 'lucide-react';

export function Preview() {
  const isPreviewOpen = useStore((state) => state.isPreviewOpen);
  const setPreviewOpen = useStore((state) => state.setPreviewOpen);
  const { files, currentProject } = useWorkspaceStore();
  
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const [logs, setLogs] = useState<{ type: string; message: string }[]>([]);
  const [isRunning, setIsRunning] = useState(false);

  // Close with Esc key
  useEffect(() => {
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setPreviewOpen(false);
    };
    window.addEventListener('keydown', handleEsc);
    return () => window.removeEventListener('keydown', handleEsc);
  }, [setPreviewOpen]);

  // Listen for console logs from iframe
  useEffect(() => {
    const handleMessage = (e: MessageEvent) => {
      if (e.data && e.data.type === 'sandbox-console') {
        setLogs((prev) => [...prev, { type: e.data.level, message: e.data.content }]);
      }
    };
    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, []);

  if (!isPreviewOpen || !currentProject) return null;

  const runCode = () => {
    setIsRunning(true);
    setLogs([]);

    const hasHtml = files.some(f => f.path.endsWith('.html'));
    const hasPython = files.some(f => f.path.endsWith('.py'));

    if (hasPython && !hasHtml) {
      runPython();
    } else {
      runWeb();
    }
  };

  const runWeb = () => {
    if (!iframeRef.current) return;

    // Build standard Web files
    const htmlFile = files.find(f => f.path === 'index.html')?.content || '<div id="root"></div>';
    const cssFiles = files.filter(f => f.path.endsWith('.css')).map(f => f.content).join('\n');
    const jsFiles = files.filter(f => f.path.endsWith('.js')).map(f => f.content).join('\n');

    const combinedHtml = `
      <!DOCTYPE html>
      <html>
        <head>
          <style>${cssFiles}</style>
          <script>
            // Capture console
            (function() {
              const originalLog = console.log;
              const originalError = console.error;
              const originalWarn = console.warn;
              
              function postLog(level, args) {
                const content = Array.from(args).map(a => 
                  typeof a === 'object' ? JSON.stringify(a, null, 2) : String(a)
                ).join(' ');
                window.parent.postMessage({ type: 'sandbox-console', level, content }, '*');
              }
              
              console.log = function(...args) { postLog('log', args); originalLog.apply(console, args); };
              console.error = function(...args) { postLog('error', args); originalError.apply(console, args); };
              console.warn = function(...args) { postLog('warn', args); originalWarn.apply(console, args); };
            })();
            
            // Handle global errors
            window.onerror = function(msg, url, line, col, error) {
              window.parent.postMessage({ type: 'sandbox-console', level: 'error', content: msg + ' (Line ' + line + ')' }, '*');
              return false;
            };
          </script>
        </head>
        <body>
          ${htmlFile}
          <script type="module">
            try {
              ${jsFiles}
            } catch (err) {
              console.error(err);
            }
          </script>
        </body>
      </html>
    `;

    const blob = new Blob([combinedHtml], { type: 'text/html' });
    iframeRef.current.src = URL.createObjectURL(blob);
    setIsRunning(false);
  };

  const runPython = async () => {
    if (!iframeRef.current) return;
    
    const pyFile = files.find(f => f.path === 'main.py' || f.path.endsWith('.py'));
    if (!pyFile) {
      setLogs([{ type: 'error', message: 'No Python file found (.py)' }]);
      setIsRunning(false);
      return;
    }

    const html = `
      <!DOCTYPE html>
      <html>
        <head>
          <script src="https://cdn.jsdelivr.net/pyodide/v0.25.0/full/pyodide.js"></script>
          <script>
            (function() {
              const originalLog = console.log;
              const originalError = console.error;
              function postLog(level, args) {
                const content = Array.from(args).join(' ');
                window.parent.postMessage({ type: 'sandbox-console', level, content }, '*');
              }
              console.log = function(...args) { postLog('log', args); originalLog.apply(console, args); };
              console.error = function(...args) { postLog('error', args); originalError.apply(console, args); };
            })();

            async function main() {
              try {
                console.log("Loading Pyodide...");
                let pyodide = await loadPyodide();
                console.log("Pyodide loaded. Executing script...");
                
                // Redirect python stdout
                pyodide.setStdout({ batched: (msg) => console.log(msg) });
                pyodide.setStderr({ batched: (msg) => console.error(msg) });
                
                await pyodide.runPythonAsync(${JSON.stringify(pyFile.content)});
              } catch (err) {
                console.error(err);
              }
            }
            main();
          </script>
        </head>
        <body>
          <h3 style="font-family:sans-serif;color:#555;padding:20px;">Running Python Environment... Check the output console below.</h3>
        </body>
      </html>
    `;
    
    const blob = new Blob([html], { type: 'text/html' });
    iframeRef.current.src = URL.createObjectURL(blob);
    setIsRunning(false);
  };

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-white dark:bg-gray-900">
      {/* Header */}
      <div className="flex h-14 shrink-0 items-center justify-between border-b border-gray-200 dark:border-gray-800 px-4">
        <div className="flex items-center gap-4">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white flex items-center gap-2">
            <Terminal size={18} /> Preview: {currentProject.name}
          </h2>
          <div className="flex gap-2">
            <button
              onClick={runCode}
              disabled={isRunning}
              className="flex items-center gap-1.5 rounded-md bg-emerald-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-emerald-700 disabled:opacity-50"
            >
              {isRunning ? <RefreshCw className="animate-spin" size={16} /> : <Play size={16} />}
              Run
            </button>
          </div>
        </div>
        <button
          onClick={() => setPreviewOpen(false)}
          className="rounded-md p-2 text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-800 dark:text-gray-400"
        >
          <X size={20} />
        </button>
      </div>

      <div className="flex flex-col flex-1 min-h-0 md:flex-row">
        {/* Output Panel / iframe window */}
        <div className="flex-1 border-r border-gray-200 dark:border-gray-800 relative bg-white min-h-[50%] md:min-h-0">
          <iframe
            ref={iframeRef}
            title="sandbox"
            className="w-full h-full border-0"
            sandbox="allow-scripts allow-modals allow-same-origin"
          />
        </div>
        
        {/* Integrated Console */}
        <div className="h-64 md:h-full md:w-80 lg:w-96 flex flex-col bg-gray-50 dark:bg-[#1e1e1e] shrink-0 border-t md:border-t-0 border-gray-200 dark:border-gray-800">
          <div className="px-3 py-2 border-b border-gray-200 dark:border-gray-800 flex justify-between items-center bg-gray-100 dark:bg-[#252526]">
            <span className="text-xs font-semibold text-gray-600 dark:text-gray-300 uppercase tracking-wider">Console</span>
            <button onClick={() => setLogs([])} className="text-xs text-gray-500 hover:text-gray-900 dark:hover:text-white">Clear</button>
          </div>
          <div className="flex-1 overflow-y-auto p-3 font-mono text-xs space-y-1">
            {logs.length === 0 && (
              <div className="text-gray-400 dark:text-gray-500 italic">No output...</div>
            )}
            {logs.map((log, i) => (
              <div
                key={i}
                className={'border-b border-gray-200 dark:border-gray-800/50 pb-1 break-words ' + (
                  log.type === 'error' ? 'text-red-500' :
                  log.type === 'warn' ? 'text-yellow-500' :
                  'text-gray-800 dark:text-gray-300'
                )}
              >
                {log.message}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}