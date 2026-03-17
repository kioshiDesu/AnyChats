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
    <div className="mt-3 border-t border-white/[0.06] pt-3">
      {/* Section header */}
      <div className="flex items-center justify-between px-2 mb-2">
        <span className="text-[11px] font-semibold text-neutral-500 uppercase tracking-wider">
          {currentProject.name}
        </span>
        <div className="flex items-center gap-0.5">
          <button onClick={() => setPreviewOpen(true)} className="p-1.5 rounded text-neutral-500 hover:text-success hover:bg-success-soft transition-colors" title="Preview">
            <Play size={13} strokeWidth={2} />
          </button>
          <button onClick={() => exportProjectAsZip(currentProject.id, currentProject.name)} className="p-1.5 rounded text-neutral-500 hover:text-white hover:bg-white/[0.06] transition-colors" title="Export ZIP">
            <Download size={13} strokeWidth={1.5} />
          </button>
          <button onClick={() => exportProjectAsSingleFile(currentProject.id, currentProject.name)} className="p-1.5 rounded text-neutral-500 hover:text-white hover:bg-white/[0.06] transition-colors" title="Export single file">
            <FileType2 size={13} strokeWidth={1.5} />
          </button>
          <button onClick={() => setIsCreating('file')} className="p-1.5 rounded text-neutral-500 hover:text-white hover:bg-white/[0.06] transition-colors" title="New file">
            <Plus size={13} strokeWidth={2} />
          </button>
        </div>
      </div>

      {/* Create input */}
      {isCreating && (
        <div className="px-2 pb-2">
          <input
            autoFocus
            type="text"
            className="w-full bg-white/[0.06] border border-white/[0.08] rounded px-2.5 py-1.5 text-sm text-white placeholder-neutral-500 outline-none focus:border-accent transition-colors"
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

      {/* File list */}
      <div className="space-y-px max-h-48 overflow-y-auto custom-scrollbar">
        {(!deferredFiles || deferredFiles.length === 0) && !isCreating ? (
          <div className="px-2 py-3 text-center">
            <p className="text-xs text-neutral-500">No files yet</p>
            <p className="text-[11px] text-neutral-600 mt-0.5">Create a file or import a project</p>
          </div>
        ) : (
          (deferredFiles || []).map((file) => file ? (
            <div
              key={file.id}
              className="group flex items-center justify-between rounded px-2 py-1.5 text-sm text-neutral-400 hover:bg-white/[0.06] hover:text-white cursor-pointer transition-colors"
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
                  <FolderOpen size={14} strokeWidth={1.5} className="text-neutral-500 shrink-0" />
                ) : (
                  <FileCode size={14} strokeWidth={1.5} className="text-neutral-500 shrink-0" />
                )}
                <span className="truncate text-[13px]">{file.path}</span>
              </div>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  if (window.confirm(`Delete "${file.path}"?`)) {
                    deleteFile(file.id);
                  }
                }}
                className="opacity-0 group-hover:opacity-100 p-1 text-neutral-500 hover:text-danger transition-opacity"
              >
                <Trash2 size={12} strokeWidth={1.5} />
              </button>
            </div>
          ) : null)
        )}
      </div>
    </div>
  );
}
