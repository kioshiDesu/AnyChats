import { useState, useDeferredValue } from 'react';
import { useWorkspaceStore } from '../store/useWorkspaceStore';
import { useFileSystem } from '../hooks/useFileSystem';
import { FileCode, FolderOpen, Plus, Trash2, Download, FileType2, Play } from 'lucide-react';
import { exportProjectAsZip, exportProjectAsSingleFile } from '../utils/projectExport';
import { useStore } from '../store/useStore';

export function WorkspaceExplorer() {
  const currentProject = useWorkspaceStore(state => state.currentProject);
  const files = useWorkspaceStore(state => state.files);
  const setPreviewOpen = useStore((state) => state.setPreviewOpen);
  const { createFile, deleteFile } = useFileSystem();

  const deferredFiles = useDeferredValue(files);
  const [isCreating, setIsCreating] = useState<'file' | 'folder' | null>(null);
  const [newPath, setNewPath] = useState('');

  if (!currentProject) return null;

  const handleCreate = async () => {
    if (!newPath) return;
    try {
      await createFile(newPath, isCreating || 'file', isCreating === 'file' ? '// new file' : undefined);
      setIsCreating(null);
      setNewPath('');
    } catch (e: any) {
      alert(e.message);
    }
  };

  return (
    <div className="mt-4 border-t border-gray-800 pt-4">
      <div className="flex items-center justify-between px-3 mb-2">
        <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider flex items-center gap-2">
          <FolderOpen size={14} />
          {currentProject.name} Files
        </h3>
        <div className="flex items-center gap-1">
          <button onClick={() => setPreviewOpen(true)} className="p-1 hover:bg-emerald-600/20 rounded text-emerald-500 hover:text-emerald-400" title="Run / Preview">
            <Play size={14} />
          </button>
          <button onClick={() => exportProjectAsZip(currentProject.id, currentProject.name)} className="p-1 hover:bg-gray-700 rounded text-gray-400 hover:text-white" title="Export as ZIP">
            <Download size={14} />
          </button>
          <button onClick={() => exportProjectAsSingleFile(currentProject.id, currentProject.name)} className="p-1 hover:bg-gray-700 rounded text-gray-400 hover:text-white" title="Export as Single File">
            <FileType2 size={14} />
          </button>
          <button onClick={() => setIsCreating('file')} className="p-1 hover:bg-gray-700 rounded text-gray-400 hover:text-white" title="New File">
            <Plus size={14} />
          </button>
        </div>
      </div>

      {isCreating && (
        <div className="px-3 py-2 flex items-center gap-2 text-sm">
          <input
            autoFocus
            type="text"
            className="flex-1 bg-gray-800 border border-gray-700 rounded px-2 py-1 text-white"
            placeholder={`path/to/${isCreating}...`}
            value={newPath}
            onChange={(e) => setNewPath(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') handleCreate();
              if (e.key === 'Escape') setIsCreating(null);
            }}
          />
        </div>
      )}

      <div className="px-1 space-y-0.5 max-h-48 overflow-y-auto custom-scrollbar">
        {(!deferredFiles || deferredFiles.length === 0) && !isCreating ? (
          <div className="text-xs text-gray-500 px-3 italic">No files in workspace</div>
        ) : (
          (deferredFiles || []).map((file) => file ? (
            <div
              key={file.id}
              className="group flex items-center justify-between rounded px-2 py-1.5 text-xs text-gray-300 hover:bg-gray-800 cursor-pointer"
            >
              <div 
                className="flex items-center gap-2 truncate flex-1"
                onClick={() => {
                  if (file.type !== 'folder') {
                    useWorkspaceStore.getState().setActiveFileId(file.id);
                  }
                }}
              >
                {file.type === 'folder' ? (
                  <FolderOpen size={14} className="text-blue-400 shrink-0" />
                ) : (
                  <FileCode size={14} className="text-emerald-400 shrink-0" />
                )}
                <span className="truncate">{file.path}</span>
              </div>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  if (window.confirm(`Are you sure you want to delete "${file.path}"?`)) {
                    deleteFile(file.id);
                  }
                }}
                className="opacity-0 group-hover:opacity-100 p-1 text-gray-500 hover:text-red-400 transition-opacity"
              >
                <Trash2 size={12} />
              </button>
            </div>
          ) : null)
        )}
      </div>
    </div>
  );
}
