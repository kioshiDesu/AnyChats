import { useEffect, useRef, useState } from 'react';
import { useWorkspaceStore } from '../store/useWorkspaceStore';
import { useStore } from '../store/useStore';
import { X, Play, RefreshCw } from 'lucide-react';

export function Preview() {
  const isPreviewOpen = useStore((state) => state.isPreviewOpen);
  const setPreviewOpen = useStore((state) => state.setPreviewOpen);
  const { files, currentProject } = useWorkspaceStore();
  
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const [logs, setLogs] = useState<{ type: string; message: string }[]>([]);
  const [isRunning, setIsRunning] = useState(false);

  useEffect(() => {
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setPreviewOpen(false);
    };
    window.addEventListener('keydown', handleEsc);
    return () => window.removeEventListener('keydown', handleEsc);
  }, [setPreviewOpen]);

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

    const htmlFile = files.find(f => f.path === 'index.html')?.content || '<div id="root"></div>';
    const cssFiles = files.filter(f => f.path.endsWith('.css')).map(f => f.content).join('\n');
    const jsFiles = files.filter(f => f.path.endsWith('.js')).map(f => f.content).join('\n');

    const combinedHtml = `
      <!DOCTYPE html>
      <html>
        <head>
          <style>${cssFiles}</style>
          <script>
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
                console.log("Pyodide loaded. Executing...");
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
        <body style="font-family:system-ui;color:#666;padding:20px;">
          <p>Running Python...</p>
        </body>
      </html>
    `;
    
    const blob = new Blob([html], { type: 'text/html' });
    iframeRef.current.src = URL.createObjectURL(blob);
    setIsRunning(false);
  };

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-neutral-950">
      {/* Header */}
      <div className="flex h-11 shrink-0 items-center justify-between border-b border-white/[0.06] px-4">
        <div className="flex items-center gap-3">
          <h2 className="text-sm font-medium text-white">
            Preview: {currentProject.name}
          </h2>
          <button
            onClick={runCode}
            disabled={isRunning}
            className="flex items-center gap-1.5 rounded px-2.5 py-1 bg-success-soft text-success text-xs font-medium hover:bg-success/20 disabled:opacity-50 transition-colors"
          >
            {isRunning ? <RefreshCw className="animate-spin" size={13} strokeWidth={1.5} /> : <Play size={13} strokeWidth={1.5} />}
            Run
          </button>
        </div>
        <button
          onClick={() => setPreviewOpen(false)}
          className="rounded p-1.5 text-neutral-500 hover:text-white hover:bg-white/[0.06] transition-colors"
        >
          <X size={16} />
        </button>
      </div>

      <div className="flex flex-col flex-1 min-h-0 md:flex-row">
        {/* Output */}
        <div className="flex-1 border-r border-white/[0.06] relative bg-white min-h-[50%] md:min-h-0">
          <iframe
            ref={iframeRef}
            title="preview"
            className="w-full h-full border-0"
            sandbox="allow-scripts allow-modals allow-same-origin"
          />
        </div>
        
        {/* Console */}
        <div className="h-56 md:h-full md:w-72 lg:w-80 flex flex-col bg-neutral-950 shrink-0 border-t md:border-t-0 border-white/[0.06]">
          <div className="px-3 py-1.5 border-b border-white/[0.06] flex justify-between items-center bg-surface-1">
            <span className="text-[11px] font-semibold text-neutral-500 uppercase tracking-wider">Console</span>
            <button onClick={() => setLogs([])} className="text-[11px] text-neutral-500 hover:text-white transition-colors">Clear</button>
          </div>
          <div className="flex-1 overflow-y-auto p-2.5 font-mono text-xs space-y-0.5 custom-scrollbar">
            {logs.length === 0 && (
              <div className="text-neutral-600 italic text-[11px]">No output</div>
            )}
            {logs.map((log, i) => (
              <div
                key={i}
                className={'border-b border-white/[0.03] pb-0.5 break-words ' + (
                  log.type === 'error' ? 'text-danger' :
                  log.type === 'warn' ? 'text-warning' :
                  'text-neutral-400'
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
