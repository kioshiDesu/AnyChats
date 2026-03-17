import { useState, useEffect } from 'react';
import { useWorkspaceStore } from '../store/useWorkspaceStore';
import { useFileSystem } from '../hooks/useFileSystem';
import { X, Save, Clock } from 'lucide-react';
import { VersionHistoryModal } from './VersionHistoryModal';

export function FileEditor() {
  const activeFileId = useWorkspaceStore(state => state.activeFileId);
  const setActiveFileId = useWorkspaceStore(state => state.setActiveFileId);
  const files = useWorkspaceStore(state => state.files);
  const { updateFile } = useFileSystem();
  const [content, setContent] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [showVersionHistory, setShowVersionHistory] = useState(false);

  const activeFile = files.find(f => f.id === activeFileId);

  useEffect(() => {
    if (activeFile) {
      setContent(activeFile.content || '');
    }
  }, [activeFile]);

  if (!activeFile) return null;

  const handleSave = async () => {
    setIsSaving(true);
    try {
      await updateFile(activeFile.id, content);
    } catch (error) {
      console.error('Failed to save file:', error);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="absolute inset-0 z-[60] bg-neutral-950 flex flex-col h-[100dvh] w-full animate-fade-in">
      <div className="flex items-center justify-between px-4 py-3 border-b border-white/[0.06] bg-surface-1">
        <div className="flex flex-col min-w-0">
          <span className="text-sm font-medium text-white truncate">{activeFile.path}</span>
          <span className="text-[11px] text-neutral-500">Edit and save</span>
        </div>
        <div className="flex items-center gap-1.5 shrink-0">
          <button
            onClick={() => setShowVersionHistory(true)}
            className="flex items-center gap-1.5 px-2.5 py-1.5 bg-surface-3 hover:bg-white/[0.08] text-neutral-400 hover:text-white rounded text-xs font-medium transition-colors"
          >
            <Clock size={13} strokeWidth={1.5} />
            History
          </button>
          <button 
            onClick={handleSave}
            disabled={isSaving}
            className="flex items-center gap-1.5 px-2.5 py-1.5 bg-accent hover:bg-accent-soft disabled:opacity-50 text-white rounded text-xs font-medium transition-colors"
          >
            <Save size={13} strokeWidth={1.5} />
            {isSaving ? 'Saving...' : 'Save'}
          </button>
          <button 
            onClick={() => setActiveFileId(null)}
            className="p-1.5 hover:bg-white/[0.06] text-neutral-500 hover:text-white rounded transition-colors"
          >
            <X size={16} />
          </button>
        </div>
      </div>
      
      <div className="flex-1 overflow-hidden relative bg-neutral-950">
        <textarea
          className="absolute inset-0 w-full h-full resize-none p-4 font-mono text-[13px] leading-relaxed text-neutral-300 bg-transparent focus:outline-none"
          value={content}
          onChange={(e) => setContent(e.target.value)}
          spellCheck={false}
        />
      </div>

      {showVersionHistory && activeFile && (
        <VersionHistoryModal
          fileId={activeFile.id}
          filePath={activeFile.path}
          currentContent={content}
          onRestore={(restoredContent) => {
            setContent(restoredContent);
          }}
          onClose={() => setShowVersionHistory(false)}
        />
      )}
    </div>
  );
}
