import { useState, useEffect } from 'react';
import { X, Clock, RotateCcw, Eye, FileCode, AlertCircle } from 'lucide-react';
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
      year: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
      hour12: true,
    });
  };

  return (
    <div className="fixed inset-0 z-[90] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div className="w-full max-w-2xl bg-white dark:bg-gray-900 rounded-xl shadow-2xl border border-gray-200 dark:border-gray-700 max-h-[80vh] flex flex-col">
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-200 dark:border-gray-700">
          <div className="flex items-center gap-2">
            <Clock size={20} className="text-blue-500" />
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
              Version History
            </h2>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-800"
          >
            <X size={20} />
          </button>
        </div>

        <div className="p-4 border-b border-gray-200 dark:border-gray-700">
          <div className="flex items-center gap-2 text-sm">
            <FileCode size={16} className="text-emerald-500" />
            <span className="font-mono text-gray-700 dark:text-gray-300">{filePath}</span>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-4">
          {isLoading ? (
            <div className="flex items-center justify-center py-8">
              <div className="w-6 h-6 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
            </div>
          ) : versions.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-8 text-center">
              <Clock size={48} className="text-gray-300 dark:text-gray-600 mb-3" />
              <p className="text-gray-500 dark:text-gray-400">No previous versions</p>
              <p className="text-sm text-gray-400 dark:text-gray-500 mt-1">
                Versions are saved automatically when you update a file.
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              <div className="flex items-center gap-2 p-3 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg">
                <FileCode size={16} className="text-green-600 dark:text-green-400" />
                <span className="text-sm font-medium text-green-800 dark:text-green-300">
                  Current Version
                </span>
              </div>

              {versions.map((version, index) => (
                <div
                  key={version.id}
                  className={`p-3 rounded-lg border transition-colors cursor-pointer ${
                    selectedVersion?.id === version.id
                      ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20'
                      : 'border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600'
                  }`}
                  onClick={() => setSelectedVersion(version)}
                >
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <Clock size={14} className="text-gray-400" />
                      <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                        {formatTimestamp(version.createdAt)}
                      </span>
                    </div>
                    {index === 0 && (
                      <span className="text-xs px-2 py-0.5 bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400 rounded">
                        Latest
                      </span>
                    )}
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setSelectedVersion(version);
                      }}
                      className={`flex items-center gap-1 px-2 py-1 text-xs rounded transition-colors ${
                        selectedVersion?.id === version.id
                          ? 'bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300'
                          : 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700'
                      }`}
                    >
                      <Eye size={12} />
                      View
                    </button>
                  </div>

                  {selectedVersion?.id === version.id && (
                    <div className="mt-3 p-3 bg-gray-900 dark:bg-gray-950 rounded-lg max-h-48 overflow-auto">
                      <pre className="text-xs font-mono text-gray-300 whitespace-pre-wrap">
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

        <div className="px-5 py-4 border-t border-gray-200 dark:border-gray-700 flex justify-between items-center">
          <div className="text-sm text-gray-500 dark:text-gray-400">
            {versions.length > 0 ? `Up to ${versions.length} versions saved` : 'Max 5 versions kept'}
          </div>
          <div className="flex gap-3">
            <button
              onClick={onClose}
              className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleRestore}
              disabled={!selectedVersion || isRestoring}
              className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-lg disabled:opacity-50 transition-colors"
            >
              {isRestoring ? (
                <>
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  Restoring...
                </>
              ) : (
                <>
                  <RotateCcw size={16} />
                  Restore Version
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
