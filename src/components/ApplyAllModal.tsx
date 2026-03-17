import { X, FileCode, AlertCircle, Check } from 'lucide-react';

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
    <div className="fixed inset-0 z-[80] flex items-center justify-center bg-black/60 p-4">
      <div className="w-full max-w-md bg-surface-1 rounded border border-white/[0.08] max-h-[80vh] flex flex-col shadow-xl">
        <div className="flex items-center justify-between px-4 py-3 border-b border-white/[0.06]">
          <div className="flex items-center gap-2">
            <h2 className="text-sm font-semibold text-white">
              Apply {files.length} file{files.length !== 1 ? 's' : ''}
            </h2>
            {isApplying && (
              <div className="w-3.5 h-3.5 border-2 border-accent border-t-transparent rounded-full animate-spin" />
            )}
          </div>
          <button
            onClick={onCancel}
            disabled={isApplying}
            className="p-1 rounded text-neutral-500 hover:text-white hover:bg-white/[0.06] disabled:opacity-50 transition-colors"
          >
            <X size={16} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-4">
          <div className="flex gap-3 mb-3">
            <div className="flex items-center gap-1.5 px-2 py-1 bg-secondary-soft rounded text-[11px] font-medium text-secondary">
              <FileCode size={12} strokeWidth={1.5} />
              {newCount} new
            </div>
            <div className="flex items-center gap-1.5 px-2 py-1 bg-warning-soft rounded text-[11px] font-medium text-warning">
              <AlertCircle size={12} strokeWidth={1.5} />
              {updateCount} update
            </div>
          </div>

          {updateCount > 0 && (
            <div className="mb-3 p-2.5 bg-warning-soft border border-warning/20 rounded">
              <p className="text-[13px] text-warning">
                Existing files will be overwritten. A version is saved before each update.
              </p>
            </div>
          )}

          <div className="space-y-1.5">
            {files.map((file, index) => (
              <div
                key={index}
                className="flex items-center gap-2.5 p-2.5 bg-surface-2 rounded border border-white/[0.06]"
              >
                {file.isNew ? (
                  <FileCode size={15} strokeWidth={1.5} className="text-secondary shrink-0" />
                ) : (
                  <AlertCircle size={15} strokeWidth={1.5} className="text-warning shrink-0" />
                )}
                <span className="text-[13px] text-neutral-300 font-mono truncate">
                  {file.path}
                </span>
              </div>
            ))}
          </div>
        </div>

        <div className="px-4 py-3 border-t border-white/[0.06] flex justify-end gap-2">
          <button
            onClick={onCancel}
            disabled={isApplying}
            className="px-3 py-1.5 text-sm font-medium text-neutral-400 hover:text-white hover:bg-white/[0.06] rounded disabled:opacity-50 transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            disabled={isApplying || files.length === 0}
            className="flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-white bg-accent hover:bg-accent-soft rounded disabled:opacity-50 transition-colors"
          >
            {isApplying ? (
              <>
                <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                Applying...
              </>
            ) : (
              <>
                <Check size={14} strokeWidth={2} />
                Apply all
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
