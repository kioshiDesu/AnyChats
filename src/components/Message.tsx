import React, { Suspense, lazy, useState, useMemo } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { Copy, Check, User, Bot, Download, Layers } from 'lucide-react';

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

export function Message({ message, isTyping, onRetry, onApplyCode }: MessageProps) {
  const isUser = message.role === 'user';
  const [copiedText, setCopiedText] = React.useState<string | null>(null);
  const [showApplyAllModal, setShowApplyAllModal] = useState(false);
  const [isApplying, setIsApplying] = useState(false);

  const { files, currentProject, updateFile, createFile } = useWorkspaceStore();

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
    // Release markdown tables trapped inside code blocks
    content = content.replace(/```[a-zA-Z0-9_-]*\s*\n([\s\S]*?)\n```/g, (match, innerText) => {
      // Clean up lines (remove empty ones at start/end, trim \r)
      const lines = innerText.split('\n').map((l: string) => l.trim()).filter((l: string) => l.length > 0);
      
      // If no valid lines, just return the code block
      if (lines.length === 0) return match;

      // Markdown/Table detection: 
      // Sometimes AI wraps entire markdown responses (like READMEs) or tables in ```markdown
      // We should release them so they render natively.
      const isTable = lines.length >= 2 && 
                      lines.some((l: string) => l.includes('|')) && 
                      lines.some((l: string) => l.includes('|') && l.includes('-')) &&
                      lines.every((l: string) => l.includes('|') || l === '');
                      
      const isMarkdownBlock = match.toLowerCase().startsWith('```markdown');

      if (isTable || isMarkdownBlock) {
        // Return without backticks so it renders as native HTML/Markdown
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
        'w-full max-w-full border-b border-gray-100 dark:border-gray-800',
        isUser ? 'bg-white dark:bg-gray-900' : 'bg-gray-50 dark:bg-[#1A1C23]'
      )}
      style={{ maxWidth: '100vw' }}
    >
      <div className="max-w-3xl mx-auto px-4 md:px-6 py-6 flex gap-3 md:gap-4 w-full max-w-full min-w-0" style={{ maxWidth: '100%' }}>
        {/* Avatar */}
        <div className="flex-shrink-0 mt-1">
          <div
            className={clsx(
              'w-8 h-8 rounded-full flex items-center justify-center',
              isUser ? 'bg-blue-500 text-white' : 'bg-emerald-500 text-white'
            )}
          >
            {isUser ? <User size={18} /> : <Bot size={18} />}
          </div>
        </div>

        {/* Content Wrapper - Must have min-w-0 to prevent flex item from overflowing */}
        <div className="flex-1 min-w-0 w-full max-w-full overflow-x-hidden">
          {isTyping ? (
            <div className="flex space-x-1.5 h-8 items-center">
              <div className="w-2 h-2 bg-gray-400 dark:bg-gray-500 rounded-full animate-bounce [animation-delay:-0.3s]"></div>
              <div className="w-2 h-2 bg-gray-400 dark:bg-gray-500 rounded-full animate-bounce [animation-delay:-0.15s]"></div>
              <div className="w-2 h-2 bg-gray-400 dark:bg-gray-500 rounded-full animate-bounce"></div>
            </div>
          ) : (
            <div className="prose dark:prose-invert max-w-none w-full max-w-full min-w-0 break-words prose-p:leading-relaxed prose-pre:p-0" style={{ wordBreak: 'break-word', overflowWrap: 'anywhere' }}>
              {message.content.startsWith('**Error:**') && onRetry && (
                <div className="mb-4 flex items-center gap-2">
                  <button
                    onClick={onRetry}
                    className="flex items-center gap-1 px-3 py-1.5 bg-red-100 hover:bg-red-200 text-red-700 dark:bg-red-900/30 dark:hover:bg-red-900/50 dark:text-red-400 rounded-md text-sm font-medium transition-colors"
                  >
                    Retry Request
                  </button>
                </div>
              )}
              {!isUser && codeBlocksWithPaths.length > 0 && (
                <div className="mb-4 flex items-center gap-2">
                  <button
                    onClick={() => setShowApplyAllModal(true)}
                    className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-100 hover:bg-emerald-200 text-emerald-700 dark:bg-emerald-900/30 dark:hover:bg-emerald-900/50 dark:text-emerald-400 rounded-md text-sm font-medium transition-colors"
                  >
                    <Layers size={14} />
                    Apply All ({codeBlocksWithPaths.length})
                  </button>
                </div>
              )}
              <ReactMarkdown
                remarkPlugins={[remarkGfm]}
                components={{
                  // Intercept pre to cleanly separate block code from inline code
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
                      <div className="not-prose my-4 w-full max-w-full overflow-hidden rounded-md bg-[#1E1E1E] border border-gray-700 grid grid-cols-1">
                        {/* Code Header */}
                        <div className="flex flex-wrap items-center justify-between px-3 py-2 bg-[#2D2D2D] border-b border-gray-700 gap-2 w-full min-w-0">
                          <span className="text-xs font-mono text-gray-400 select-none shrink-0">
                            {language || 'text'}
                          </span>
                          
                          <div className="flex flex-wrap items-center gap-2 min-w-0">
                            {node?.data?.meta || node?.meta ? (
                              (() => {
                                const meta = (node?.data?.meta || node?.meta || '') as string;
                                const fileMatch = meta.match(/(?:file|path|filename)="([^"]+)"/i) || meta.match(/(?:file|path|filename)=([^\s]+)/i) || meta.match(/([a-zA-Z0-9_.-]+\.[a-zA-Z0-9]+)/);
                                const filename = fileMatch ? (fileMatch[1] || fileMatch[0]) : null;
                                
                                if (filename) {
                                  return (
                                    <button
                                      onClick={() => onApplyCode && onApplyCode(filename, text)}
                                      className="flex items-center gap-1.5 px-2 py-1 text-xs rounded hover:bg-white/10 text-emerald-400 transition-colors min-w-0"
                                      title={`Apply to ${filename}`}
                                    >
                                      <Check size={14} className="shrink-0" />
                                      <span className="truncate max-w-[100px] sm:max-w-[120px] md:max-w-[200px]">Apply to {filename}</span>
                                    </button>
                                  );
                                }
                                return null;
                              })()
                            ) : null}
                            <button
                              onClick={() => copyToClipboard(text)}
                              className="flex items-center gap-1.5 px-2 py-1 text-xs rounded hover:bg-white/10 text-gray-300 transition-colors shrink-0"
                            >
                              {copiedText === text ? (
                                <><Check size={14} className="text-emerald-400" /> <span className="text-emerald-400">Copied!</span></>
                              ) : (
                                <><Copy size={14} /> <span>Copy</span></>
                              )}
                            </button>
                            <button
                              onClick={() => downloadCode(text, language)}
                              className="flex items-center gap-1.5 px-2 py-1 text-xs rounded hover:bg-white/10 text-gray-300 transition-colors shrink-0"
                              title="Download code"
                            >
                              <Download size={14} /> <span>Download</span>
                            </button>
                          </div>
                        </div>
                        
                        {/* Code Content */}
                        <Suspense fallback={<div className="text-gray-400 p-4 font-mono text-sm">Loading code snippet...</div>}>
                          <div className="w-full max-w-full overflow-x-hidden min-w-0">
                            <CodeBlock {...codeProps} language={language || 'text'} text={text} />
                          </div>
                        </Suspense>
                      </div>
                    );
                  },
                  table({ children }) {
                    return (
                      <div className="w-full max-w-full overflow-x-auto my-4 border border-gray-200 dark:border-gray-700 rounded-md">
                        <table className="w-full text-left border-collapse min-w-max md:min-w-[500px]">
                          {children}
                        </table>
                      </div>
                    );
                  },
                  code({ className, children, ...props }: any) {
                    // Block code is intercepted entirely by our custom `pre` component above.
                    // This means any element that naturally falls to this `code` component is strictly INLINE code.
                    return (
                      <code {...props} className={clsx(className, 'px-1.5 py-0.5 rounded-md bg-gray-200 dark:bg-gray-700 font-mono text-[0.85em]')} style={{ overflowWrap: 'anywhere', wordBreak: 'break-word', whiteSpace: 'pre-wrap' }}>
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
}