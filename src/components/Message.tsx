import React, { Suspense, lazy, useState, useMemo } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { Copy, Check, Download, Layers } from 'lucide-react';

const CodeBlock = lazy(() => import('./CodeBlock'));
import { Message as MessageType } from '../store/useStore';
import { useWorkspaceStore } from '../store/useWorkspaceStore';
import { clsx } from 'clsx';
import { ApplyAllModal, ApplyAllFile } from './ApplyAllModal';

interface MessageProps {
  message: MessageType;
  isTyping?: boolean;
  onRetry?: () => void;
  onApplyCode?: (filename: string, text: string) => void;
}

const MessageComponent = ({ message, isTyping, onRetry, onApplyCode }: MessageProps) => {
  const isUser = message.role === 'user';
  const [copiedText, setCopiedText] = React.useState<string | null>(null);
  const [showApplyAllModal, setShowApplyAllModal] = useState(false);
  const [isApplying, setIsApplying] = useState(false);

  const files = useWorkspaceStore(state => state.files);
  const currentProject = useWorkspaceStore(state => state.currentProject);
  const updateFile = useWorkspaceStore(state => state.updateFile);
  const createFile = useWorkspaceStore(state => state.createFile);

  const codeBlocksWithPaths = useMemo(() => {
    const blocks: ApplyAllFile[] = [];
    const regex = /```(\w*)\s*(?:path=["']([^"']+)["'])?\s*\n([\s\S]*?)```/g;
    let match;
    
    while ((match = regex.exec(message.content)) !== null) {
      const [, language, path, content] = match;
      if (path && content) {
        const existingFile = files?.find(f => f?.path === path);
        blocks.push({
          path,
          content: content.trim(),
          isNew: !existingFile,
        });
      }
    }
    return blocks;
  }, [message.content, files]);

  const handleApplyAll = async () => {
    if (!currentProject) {
      alert('No active project. Create one in the workspace first.');
      return;
    }

    setIsApplying(true);
    try {
      for (const file of codeBlocksWithPaths) {
        const existingFile = files?.find(f => f?.path === file.path);
        if (existingFile) {
          await updateFile(existingFile.id, file.content);
        } else {
          await createFile(currentProject.id, file.path, 'file', file.content);
        }
      }
      setShowApplyAllModal(false);
    } catch (error) {
      console.error('Error applying files:', error);
      alert('Error applying some files. Check console for details.');
    } finally {
      setIsApplying(false);
    }
  };

  const processedContent = React.useMemo(() => {
    let content = message.content;
    content = content.replace(/```[a-zA-Z0-9_-]*\s*\n([\s\S]*?)\n```/g, (match, innerText) => {
      const lines = innerText.split('\n').map((l: string) => l.trim()).filter((l: string) => l.length > 0);
      if (lines.length === 0) return match;

      const isTable = lines.length >= 2 && 
                      lines.some((l: string) => l.includes('|')) && 
                      lines.some((l: string) => l.includes('|') && l.includes('-')) &&
                      lines.every((l: string) => l.includes('|') || l === '');
                      
      const isMarkdownBlock = match.toLowerCase().startsWith('```markdown');

      if (isTable || isMarkdownBlock) {
        return '\n' + innerText + '\n';
      }
      
      return match;
    });
    return content;
  }, [message.content]);

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedText(text);
    setTimeout(() => setCopiedText(null), 2000);
  };

  const downloadCode = (text: string, language: string) => {
    const blob = new Blob([text], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `code.${language || 'txt'}`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  return (
    <div
      className={clsx(
        'w-full max-w-full border-b border-white/[0.04]',
        isUser ? 'bg-neutral-950' : 'bg-surface-1'
      )}
      style={{ maxWidth: '100vw' }}
    >
      <div className="max-w-3xl mx-auto px-4 md:px-6 py-5 flex gap-3 md:gap-4 w-full max-w-full min-w-0" style={{ maxWidth: '100%' }}>
        {/* Role indicator */}
        <div className="flex-shrink-0 mt-0.5">
          <div
            className={clsx(
              'w-6 h-6 rounded flex items-center justify-center text-[11px] font-semibold',
              isUser 
                ? 'bg-surface-3 text-neutral-300' 
                : 'bg-accent text-white'
            )}
          >
            {isUser ? 'U' : 'AI'}
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0 w-full max-w-full overflow-x-hidden">
          {isTyping ? (
            <div className="flex space-x-1.5 h-6 items-center">
              <div className="w-1.5 h-1.5 bg-neutral-600 rounded-full animate-bounce [animation-delay:-0.3s]"></div>
              <div className="w-1.5 h-1.5 bg-neutral-600 rounded-full animate-bounce [animation-delay:-0.15s]"></div>
              <div className="w-1.5 h-1.5 bg-neutral-600 rounded-full animate-bounce"></div>
            </div>
          ) : (
            <div className="prose prose-invert prose-sm max-w-none w-full max-w-full min-w-0 break-words prose-p:leading-relaxed prose-p:text-neutral-300 prose-headings:text-white prose-strong:text-white prose-pre:p-0 prose-code:text-neutral-300" style={{ wordBreak: 'break-word', overflowWrap: 'anywhere' }}>
              {message.content.startsWith('**Error:**') && onRetry && (
                <div className="mb-3 flex items-center gap-2">
                  <button
                    onClick={onRetry}
                    className="flex items-center gap-1 px-2.5 py-1 bg-danger-soft text-danger rounded text-xs font-medium hover:bg-danger/20 transition-colors"
                  >
                    Retry
                  </button>
                </div>
              )}
              {!isUser && codeBlocksWithPaths.length > 0 && (
                <div className="mb-3 flex items-center gap-2">
                  <button
                    onClick={() => setShowApplyAllModal(true)}
                    className="flex items-center gap-1.5 px-2.5 py-1 bg-secondary-soft text-secondary rounded text-xs font-medium hover:bg-secondary-soft/80 transition-colors"
                  >
                    <Layers size={13} strokeWidth={1.5} />
                    Apply all ({codeBlocksWithPaths.length})
                  </button>
                </div>
              )}
              <ReactMarkdown
                remarkPlugins={[remarkGfm]}
                components={{
                  pre({ children, ...props }: any) {
                    const childArray = React.Children.toArray(children);
                    const isBlockCode = childArray.length === 1 && React.isValidElement(childArray[0]) && (childArray[0] as React.ReactElement<any>).props?.node?.tagName === 'code';
                    
                    if (!isBlockCode) {
                      return <pre className="not-prose max-w-full overflow-hidden bg-transparent m-0 p-0" {...props}>{children}</pre>;
                    }

                    const codeElement = childArray[0] as React.ReactElement<any>;
                    const { className, children: codeChildren, node, ...codeProps } = codeElement.props;
                    
                    const match = /language-(\w+)/.exec(className || '');
                    const language = match ? match[1] : '';
                    const text = String(codeChildren).replace(/\n$/, '');

                    return (
                      <div className="not-prose my-4 w-full max-w-full overflow-hidden rounded bg-neutral-900 border border-white/[0.06] grid grid-cols-1">
                        {/* Code header */}
                        <div className="flex flex-wrap items-center justify-between px-3 py-1.5 bg-surface-2 border-b border-white/[0.06] gap-2 w-full min-w-0">
                          <span className="text-[11px] font-mono text-neutral-500 select-none shrink-0">
                            {language || 'text'}
                          </span>
                          
                          <div className="flex flex-wrap items-center gap-1 min-w-0">
                            {node?.data?.meta || node?.meta ? (
                              (() => {
                                const meta = (node?.data?.meta || node?.meta || '') as string;
                                const fileMatch = meta.match(/(?:file|path|filename)="([^"]+)"/i) || meta.match(/(?:file|path|filename)=([^\s]+)/i) || meta.match(/([a-zA-Z0-9_.-]+\.[a-zA-Z0-9]+)/);
                                const filename = fileMatch ? (fileMatch[1] || fileMatch[0]) : null;
                                
                                if (filename) {
                                  return (
                                    <button
                                      onClick={() => onApplyCode && onApplyCode(filename, text)}
                                      className="flex items-center gap-1 px-2 py-0.5 text-[11px] rounded hover:bg-secondary-soft/30 text-secondary transition-colors min-w-0"
                                      title={`Apply to ${filename}`}
                                    >
                                      <Check size={12} strokeWidth={2} className="shrink-0" />
                                      <span className="truncate max-w-[80px] sm:max-w-[100px] md:max-w-[160px]">{filename}</span>
                                    </button>
                                  );
                                }
                                return null;
                              })()
                            ) : null}
                            <button
                              onClick={() => copyToClipboard(text)}
                              className="flex items-center gap-1 px-2 py-0.5 text-[11px] rounded hover:bg-white/[0.06] text-neutral-400 transition-colors shrink-0"
                            >
                              {copiedText === text ? (
                                <><Check size={12} strokeWidth={2} className="text-success" /> <span className="text-success">Copied</span></>
                              ) : (
                                <><Copy size={12} strokeWidth={1.5} /> <span>Copy</span></>
                              )}
                            </button>
                            <button
                              onClick={() => downloadCode(text, language)}
                              className="flex items-center gap-1 px-2 py-0.5 text-[11px] rounded hover:bg-white/[0.06] text-neutral-400 transition-colors shrink-0"
                              title="Download"
                            >
                              <Download size={12} strokeWidth={1.5} />
                            </button>
                          </div>
                        </div>
                        
                        {/* Code content */}
                        <Suspense fallback={<div className="text-neutral-500 p-4 font-mono text-xs">Loading...</div>}>
                          <div className="w-full max-w-full overflow-x-hidden min-w-0">
                            <CodeBlock {...codeProps} language={language || 'text'} text={text} />
                          </div>
                        </Suspense>
                      </div>
                    );
                  },
                  table({ children }) {
                    return (
                      <div className="w-full max-w-full overflow-x-auto my-4 border border-white/[0.06] rounded">
                        <table className="w-full text-left border-collapse min-w-max md:min-w-[500px]">
                          {children}
                        </table>
                      </div>
                    );
                  },
                  code({ className, children, ...props }: any) {
                    return (
                      <code {...props} className={clsx(className, 'px-1 py-0.5 rounded bg-white/[0.06] font-mono text-[0.85em]')} style={{ overflowWrap: 'anywhere', wordBreak: 'break-word', whiteSpace: 'pre-wrap' }}>
                        {children}
                      </code>
                    );
                  },
                }}
              >
                {processedContent}
              </ReactMarkdown>
            </div>
          )}
        </div>
      </div>

      {showApplyAllModal && (
        <ApplyAllModal
          files={codeBlocksWithPaths}
          onConfirm={handleApplyAll}
          onCancel={() => setShowApplyAllModal(false)}
          isApplying={isApplying}
        />
      )}
    </div>
  );
};

export const Message = React.memo(MessageComponent, (prevProps, nextProps) => {
  return (
    prevProps.message.id === nextProps.message.id &&
    prevProps.message.content === nextProps.message.content &&
    prevProps.isTyping === nextProps.isTyping
  );
});
