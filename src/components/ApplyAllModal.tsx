import { X, FileCode, FolderOpen, AlertCircle, Check } from 'lucide-react';

export interface ApplyAllFile {
  path: string;
  content: string;
  isNew: boolean;
}

interface ApplyAllModalProps {
  files: ApplyAllFile[];
  onConfirm: () => void;
  onCancel: () => void;
  isApplying?: boolean;
}

export function ApplyAllModal({ files, onConfirm, onCancel, isApplying }: ApplyAllModalProps) {
  const newCount = files.filter(f => f.isNew).length;
  const updateCount = files.filter(f => !f.isNew).length;

  return (
    <div className="fixed inset-0 z-[80] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div className="w-full max-w-md bg-white dark:bg-gray-900 rounded-xl shadow-2xl border border-gray-200 dark:border-gray-700 max-h-[80vh] flex flex-col">
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-200 dark:border-gray-700">
          <div className="flex items-center gap-2">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
              Apply {files.length} File{files.length !== 1 ? 's' : ''}
            </h2>
            {isApplying && (
              <div className="ml-2 w-4 h-4 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
            )}
          </div>
          <button
            onClick={onCancel}
            disabled={isApplying}
            className="p-1.5 rounded-lg text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-800 disabled:opacity-50"
          >
            <X size={20} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-4">
          <div className="flex gap-4 mb-4">
            <div className="flex items-center gap-2 px-3 py-1.5 bg-green-100 dark:bg-green-900/30 rounded-lg">
              <FileCode size={16} className="text-green-600 dark:text-green-400" />
              <span className="text-sm font-medium text-green-700 dark:text-green-300">{newCount} New</span>
            </div>
            <div className="flex items-center gap-2 px-3 py-1.5 bg-yellow-100 dark:bg-yellow-900/30 rounded-lg">
              <AlertCircle size={16} className="text-yellow-600 dark:text-yellow-400" />
              <span className="text-sm font-medium text-yellow-700 dark:text-yellow-300">{updateCount} Update</span>
            </div>
          </div>

          {updateCount > 0 && (
            <div className="mb-4 p-3 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg">
              <p className="text-sm text-yellow-800 dark:text-yellow-200">
                Existing files will be overwritten. A version will be saved before each update.
              </p>
            </div>
          )}

          <div className="space-y-2">
            {files.map((file, index) => (
              <div
                key={index}
                className="flex items-center gap-3 p-3 bg-gray-50 dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700"
              >
                {file.isNew ? (
                  <FileCode size={18} className="text-green-500 shrink-0" />
                ) : (
                  <AlertCircle size={18} className="text-yellow-500 shrink-0" />
                )}
                <span className="text-sm text-gray-900 dark:text-gray-100 font-mono truncate">
                  {file.path}
                </span>
              </div>
            ))}
          </div>
        </div>

        <div className="px-5 py-4 border-t border-gray-200 dark:border-gray-700 flex justify-end gap-3">
          <button
            onClick={onCancel}
            disabled={isApplying}
            className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg disabled:opacity-50 transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            disabled={isApplying || files.length === 0}
            className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-lg disabled:opacity-50 transition-colors"
          >
            {isApplying ? (
              <>
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                Applying...
              </>
            ) : (
              <>
                <Check size={16} />
                Apply All
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
