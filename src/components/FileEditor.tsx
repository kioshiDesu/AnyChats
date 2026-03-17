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
      // Optional: show toast or success message
    } catch (error) {
      console.error('Failed to save file:', error);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="absolute inset-0 z-[60] bg-[#0d1117] flex flex-col h-[100dvh] w-full animate-in fade-in slide-in-from-bottom-4 duration-200">
      <div className="flex items-center justify-between p-3 border-b border-gray-800 bg-gray-900/50">
        <div className="flex flex-col">
          <span className="text-sm font-medium text-gray-200">{activeFile.path}</span>
          <span className="text-xs text-gray-500">Edit and save code directly</span>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowVersionHistory(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-gray-700 hover:bg-gray-600 text-gray-300 rounded text-sm font-medium transition-colors"
          >
            <Clock size={14} />
            History
          </button>
          <button 
            onClick={handleSave}
            disabled={isSaving}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white rounded text-sm font-medium transition-colors"
          >
            <Save size={14} />
            {isSaving ? 'Saving...' : 'Save'}
          </button>
          <button 
            onClick={() => setActiveFileId(null)}
            className="p-1.5 hover:bg-gray-800 text-gray-400 hover:text-white rounded transition-colors"
          >
            <X size={18} />
          </button>
        </div>
      </div>
      
      <div className="flex-1 overflow-hidden relative bg-[#1e1e1e]">
        <textarea
          className="absolute inset-0 w-full h-full resize-none p-4 font-mono text-[13px] leading-relaxed text-gray-300 bg-transparent focus:outline-none"
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
