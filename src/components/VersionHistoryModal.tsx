import { useState, useEffect } from 'react';
import { X, Clock, RotateCcw, Eye, FileCode } from 'lucide-react';
import { useWorkspaceStore } from '../store/useWorkspaceStore';
import { FileVersion } from '../services/db';

interface VersionHistoryModalProps {
  fileId: string;
  filePath: string;
  currentContent: string;
  onRestore: (content: string) => void;
  onClose: () => void;
}

export function VersionHistoryModal({
  fileId,
  filePath,
  currentContent,
  onRestore,
  onClose,
}: VersionHistoryModalProps) {
  const [versions, setVersions] = useState<FileVersion[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedVersion, setSelectedVersion] = useState<FileVersion | null>(null);
  const [isRestoring, setIsRestoring] = useState(false);

  const { getFileVersions, restoreVersion } = useWorkspaceStore();

  useEffect(() => {
    loadVersions();
  }, [fileId]);

  const loadVersions = async () => {
    setIsLoading(true);
    try {
      const loadedVersions = await getFileVersions(fileId);
      setVersions(loadedVersions);
    } catch (error) {
      console.error('Error loading versions:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleRestore = async () => {
    if (!selectedVersion) return;

    setIsRestoring(true);
    try {
      await restoreVersion(selectedVersion.id);
      onRestore(selectedVersion.content);
      onClose();
    } catch (error) {
      console.error('Error restoring version:', error);
      alert('Failed to restore version');
    } finally {
      setIsRestoring(false);
    }
  };

  const formatTimestamp = (timestamp: number) => {
    const date = new Date(timestamp);
    return date.toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
      hour12: true,
    });
  };

  return (
    <div className="fixed inset-0 z-[90] flex items-center justify-center bg-black/60 p-4">
      <div className="w-full max-w-xl bg-surface-1 rounded border border-white/[0.08] max-h-[80vh] flex flex-col shadow-xl">
        <div className="flex items-center justify-between px-4 py-3 border-b border-white/[0.06]">
          <div className="flex items-center gap-2">
            <Clock size={16} strokeWidth={1.5} className="text-neutral-500" />
            <h2 className="text-sm font-semibold text-white">
              Version history
            </h2>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded text-neutral-500 hover:text-white hover:bg-white/[0.06] transition-colors"
          >
            <X size={16} />
          </button>
        </div>

        <div className="px-4 py-2.5 border-b border-white/[0.06]">
          <div className="flex items-center gap-2 text-[13px]">
            <FileCode size={13} strokeWidth={1.5} className="text-neutral-500" />
            <span className="font-mono text-neutral-400">{filePath}</span>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-4 custom-scrollbar">
          {isLoading ? (
            <div className="flex items-center justify-center py-8">
              <div className="w-5 h-5 border-2 border-accent border-t-transparent rounded-full animate-spin" />
            </div>
          ) : versions.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-8 text-center">
              <Clock size={40} strokeWidth={1} className="text-neutral-700 mb-3" />
              <p className="text-neutral-500 text-sm">No previous versions</p>
              <p className="text-[12px] text-neutral-600 mt-0.5">
                Versions are saved when you update a file
              </p>
            </div>
          ) : (
            <div className="space-y-2">
              <div className="flex items-center gap-2 p-2.5 bg-secondary-soft border border-secondary/20 rounded">
                <FileCode size={13} strokeWidth={1.5} className="text-secondary" />
                <span className="text-[13px] font-medium text-secondary">
                  Current version
                </span>
              </div>

              {versions.map((version, index) => (
                <div
                  key={version.id}
                  className={`p-3 rounded border transition-colors cursor-pointer ${
                    selectedVersion?.id === version.id
                      ? 'border-accent/40 bg-accent-muted'
                      : 'border-white/[0.06] hover:border-white/[0.1] hover:bg-white/[0.02]'
                  }`}
                  onClick={() => setSelectedVersion(version)}
                >
                  <div className="flex items-center justify-between mb-1.5">
                    <div className="flex items-center gap-2">
                      <Clock size={12} strokeWidth={1.5} className="text-neutral-500" />
                      <span className="text-[13px] font-medium text-neutral-300">
                        {formatTimestamp(version.createdAt)}
                      </span>
                    </div>
                    {index === 0 && (
                      <span className="text-[10px] px-1.5 py-0.5 bg-surface-3 text-neutral-500 rounded">
                        Latest
                      </span>
                    )}
                  </div>

                  <div className="flex items-center gap-1.5">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setSelectedVersion(version);
                      }}
                      className={`flex items-center gap-1 px-2 py-0.5 text-[11px] rounded transition-colors ${
                        selectedVersion?.id === version.id
                          ? 'bg-accent-muted text-accent'
                          : 'bg-surface-3 text-neutral-500 hover:bg-white/[0.06] hover:text-neutral-300'
                      }`}
                    >
                      <Eye size={11} strokeWidth={1.5} />
                      View
                    </button>
                  </div>

                  {selectedVersion?.id === version.id && (
                    <div className="mt-2.5 p-2.5 bg-neutral-950 rounded max-h-40 overflow-auto">
                      <pre className="text-[11px] font-mono text-neutral-400 whitespace-pre-wrap">
                        {selectedVersion.content.slice(0, 500)}
                        {selectedVersion.content.length > 500 && '...'}
                      </pre>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="px-4 py-3 border-t border-white/[0.06] flex justify-between items-center">
          <div className="text-[12px] text-neutral-500">
            {versions.length > 0 ? `${versions.length} version${versions.length !== 1 ? 's' : ''}` : 'Max 5 versions kept'}
          </div>
          <div className="flex gap-2">
            <button
              onClick={onClose}
              className="px-3 py-1.5 text-sm font-medium text-neutral-400 hover:text-white hover:bg-white/[0.06] rounded transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleRestore}
              disabled={!selectedVersion || isRestoring}
              className="flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-white bg-accent hover:bg-accent-soft disabled:opacity-50 rounded transition-colors"
            >
              {isRestoring ? (
                <>
                  <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  Restoring...
                </>
              ) : (
                <>
                  <RotateCcw size={13} strokeWidth={1.5} />
                  Restore
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
