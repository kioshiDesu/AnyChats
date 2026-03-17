import { useState, useRef, useEffect, useMemo } from 'react';
import { useStore } from '../store/useStore';
import { streamChat, sendMessage, ApiOptions } from '../services/api';
import { Message } from './Message';
import { Send, Menu, StopCircle, ArrowDown, Loader2, Eraser, Download, Mic, Network, MonitorSmartphone } from 'lucide-react';
import { useWorkspaceStore } from '../store/useWorkspaceStore';
import { useFileSystem } from '../hooks/useFileSystem';
import { parseSkillCommand, builtInSkills } from '../services/skills';

export function Chat() {
  const { currentProject, files } = useWorkspaceStore();
  const { createFile, updateFile } = useFileSystem();

  const {
    conversations,
    currentConversationId,
    addMessage,
    clearMessages,
    apiKey,
    selectedModel,
    setSidebarOpen,
    setSettingsOpen,
    systemPrompt,
    isLoading,
    setIsLoading,
    useStreaming,
    apiMode,
    localEndpoint,
    temperature,
    topP,
    maxTokens,
    isOffline,
    ollamaStatus,
  } = useStore();

  const [input, setInput] = useState('');
  const [isListening, setIsListening] = useState(false);
  const [isStreaming, setIsStreaming] = useState(false);
  const [streamingContent, setStreamingContent] = useState('');
  const abortControllerRef = useRef<AbortController | null>(null);
  
  const bottomRef = useRef<HTMLDivElement>(null);
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const [showScrollButton, setShowScrollButton] = useState(false);

  const projectContext = useMemo(() => {
    if (!currentProject) return '';
    let context = `\n\n--- Current Active Workspace Project: ${currentProject.name} ---\n` +
      `This is a virtual file system. When writing code, ALWAYS add the target file path in your codeblocks (e.g., \`\`\`tsx path="src/App.tsx"\`\`\`) to allow automatic file generation.\n\n` +
      `Project Files:\n`;

    let contextSize = 0;
    const MAX_CONTEXT_CHARS = 40000;
    const activeFiles = (files || []).filter(f => f?.type === 'file');

    for (const f of activeFiles) {
      const fileStr = `File: ${f.path}\n\`\`\`\n${f.content}\n\`\`\`\n`;
      if (contextSize + fileStr.length > MAX_CONTEXT_CHARS) {
        context += `\n... (Other files omitted due to context length limits. Focus on the ones provided.)\n`;
        break;
      }
      context += fileStr;
      contextSize += fileStr.length;
    }
    return context;
  }, [currentProject, files]);

  const currentConversation = conversations.find(
    (c) => c.id === currentConversationId
  );

  const scrollToBottom = (behavior: 'auto' | 'smooth' = 'auto') => {
    bottomRef.current?.scrollIntoView({ behavior });
  };

  useEffect(() => {
    scrollToBottom();
  }, [currentConversation?.messages.length, streamingContent]);

  const handleScroll = () => {
    if (!scrollContainerRef.current) return;
    const { scrollTop, scrollHeight, clientHeight } = scrollContainerRef.current;
    const isAtBottom = scrollHeight - scrollTop - clientHeight < 100;
    setShowScrollButton(!isAtBottom);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || !currentConversationId) return;
    
    if (apiMode === 'cloud' && !apiKey) {
      setSettingsOpen(true);
      return;
    }

    const userMessageContent = input.trim();
    setInput('');
    addMessage(currentConversationId, {
      role: 'user',
      content: userMessageContent,
    });

    setIsLoading(true);

    const parsedSkill = parseSkillCommand(userMessageContent);
    
    if (parsedSkill) {
      const skill = builtInSkills.find(s => s.name === parsedSkill.skillName);
      if (skill) {
        const mainParamName = Object.keys(skill.parameters)[0];
        const params: any = {};
        if (mainParamName) {
           params[mainParamName] = parsedSkill.params;
        }

        try {
          const result = await skill.handler(params, {
             projectId: currentProject?.id || '',
             files: files,
             apiOptions: { apiMode, apiKey, localEndpoint, model: selectedModel, temperature, topP, maxTokens },
             createFile,
             updateFile,
             onProgress: () => {}
          });
          
          useStore.getState().addMessage(currentConversationId, {
            role: 'assistant',
            content: result.message
          });
        } catch (e: any) {
          useStore.getState().addMessage(currentConversationId, {
            role: 'assistant',
            content: `**Error executing skill ${skill.name}:** ${e.message}`
          });
        } finally {
          setIsLoading(false);
        }
        return;
      }
    }

    // Prepare messages for API
    const contextMessages = [
      ...(currentConversation?.messages || []),
      { id: 'temp', role: 'user' as const, content: userMessageContent, createdAt: Date.now() },
    ].map((m) => ({ role: m.role, content: m.content }));

    let finalSystemPrompt = systemPrompt.trim();
    if (projectContext) {
      finalSystemPrompt += projectContext;
    }

    const apiMessages = finalSystemPrompt.trim()
      ? [{ role: 'system', content: finalSystemPrompt }, ...contextMessages]
      : contextMessages;

    const options: ApiOptions = {
      apiMode,
      apiKey,
      localEndpoint,
      model: selectedModel,
      temperature,
      topP,
      maxTokens,
    };

    if (useStreaming) {
      setIsStreaming(true);
      setStreamingContent('');
      
      abortControllerRef.current = new AbortController();

      try {
        const stream = streamChat(apiMessages, options, abortControllerRef.current.signal);
        let fullContent = '';
        
        for await (const chunk of stream) {
          fullContent += chunk;
          setStreamingContent(fullContent);
        }
        
        addMessage(currentConversationId, {
          role: 'assistant',
          content: fullContent,
        });
      } catch (error: any) {
        if (error.name === 'AbortError') {
           return;
        }
        console.error(error);
        addMessage(currentConversationId, {
          role: 'assistant',
          content: `**Error:** ${error instanceof Error ? error.message : 'Unknown error occurred'}`,
        });
      } finally {
        setIsStreaming(false);
        setStreamingContent('');
        setIsLoading(false);
        abortControllerRef.current = null;
      }
    } else {
      abortControllerRef.current = new AbortController();
      try {
        const content = await sendMessage(apiMessages, options, abortControllerRef.current.signal);
        addMessage(currentConversationId, {
          role: 'assistant',
          content: content,
        });
      } catch (error: any) {
        if (error.name === 'AbortError') return;
        console.error(error);
        addMessage(currentConversationId, {
          role: 'assistant',
          content: `**Error:** ${error instanceof Error ? error.message : 'Unknown error occurred'}`,
        });
      } finally {
        setIsLoading(false);
        abortControllerRef.current = null;
      }
    }
  };

  const handleApplyCode = async (filename: string, content: string) => {
    if (!currentProject) {
      alert("No active project workspace found. Create one in Settings > Workspace first.");
      return;
    }
    
    const existingFile = (files || []).find(f => f?.path === filename);
    try {
      if (existingFile) {
        if (window.confirm(`Overwrite ${filename}?`)) {
          await updateFile(existingFile.id, content);
          alert(`${filename} updated.`);
        }
      } else {
        await createFile(filename, 'file', content);
        alert(`${filename} created.`);
      }
    } catch (e: any) {
      alert(`Error: ${e.message}`);
    }
  };

  const handleStop = () => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    setIsStreaming(false);
    setIsLoading(false);
    if (streamingContent) {
      addMessage(currentConversationId!, {
        role: 'assistant',
        content: streamingContent + '\n\n*(Stopped by user)*',
      });
      setStreamingContent('');
    }
  };

  const handleVoiceInput = () => {
    if (!('webkitSpeechRecognition' in window) && !('SpeechRecognition' in window)) {
      alert('Speech recognition is not supported in this browser.');
      return;
    }
    
    // @ts-ignore
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    const recognition = new SpeechRecognition();
    recognition.continuous = false;
    recognition.interimResults = false;
    
    recognition.onstart = () => setIsListening(true);
    
    recognition.onresult = (event: any) => {
      const transcript = event.results[0][0].transcript;
      setInput((prev) => prev ? `${prev} ${transcript}` : transcript);
    };
    
    recognition.onerror = (event: any) => {
      console.error('Speech recognition error', event.error);
      setIsListening(false);
    };
    
    recognition.onend = () => setIsListening(false);
    
    recognition.start();
  };

  if (!currentConversation) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center bg-neutral-950 h-[100dvh]">
        <button
          onClick={() => setSidebarOpen(true)}
          aria-label="Toggle Sidebar"
          className="absolute top-4 left-4 md:hidden p-2 rounded hover:bg-white/[0.06] text-neutral-400 transition-colors"
        >
          <Menu size={20} />
        </button>
        <div className="text-center space-y-3 max-w-sm px-6">
          <h2 className="text-xl font-semibold tracking-tight">
            <span className="text-accent">OpenRouter</span>{' '}
            <span className="text-white">Mobile Chat</span>
          </h2>
          <p className="text-sm text-neutral-500 leading-relaxed">Select or create a conversation to get started</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 min-w-0 flex flex-col h-[100dvh] bg-neutral-950 relative">
      {/* Header */}
      <header className="flex items-center gap-3 px-4 h-12 bg-neutral-950 border-b border-white/[0.06] z-10 sticky top-0">
        <button
          onClick={() => setSidebarOpen(true)}
          aria-label="Toggle Sidebar"
          className="md:hidden p-1.5 -ml-1.5 rounded hover:bg-white/[0.06] text-neutral-400 transition-colors"
        >
          <Menu size={18} />
        </button>
        <div className="flex flex-col flex-1 min-w-0">
          <div className="flex items-center gap-2.5">
            <h1 className="text-sm font-medium truncate text-white">
              {currentConversation.title}
            </h1>
            {currentProject && (
              <span className="text-[11px] font-medium text-secondary shrink-0">
                {currentProject.name}
              </span>
            )}
            <span className="text-[11px] font-medium text-neutral-500 shrink-0">
              {apiMode === 'local' ? 'Local' : 'Cloud'}
            </span>
            {isOffline && (
              <span className="text-[11px] font-medium text-danger shrink-0">Offline</span>
            )}
            {apiMode === 'local' && ollamaStatus === 'offline' && (
              <span className="text-[11px] font-medium text-danger shrink-0">Ollama down</span>
            )}
          </div>
        </div>
        {currentConversation.messages.length > 0 && (
          <div className="flex items-center gap-0.5 shrink-0">
            <button
              onClick={() => {
                const data = JSON.stringify(currentConversation, null, 2);
                const blob = new Blob([data], { type: 'application/json' });
                const url = URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                a.download = `chat-${currentConversation.id.slice(0, 8)}.json`;
                document.body.appendChild(a);
                a.click();
                document.body.removeChild(a);
                URL.revokeObjectURL(url);
              }}
              title="Export conversation"
              className="p-1.5 rounded hover:bg-white/[0.06] text-neutral-500 hover:text-white transition-colors"
            >
              <Download size={16} strokeWidth={1.5} />
            </button>
            <button
              onClick={() => {
                if (window.confirm('Clear this conversation?')) {
                  clearMessages(currentConversation.id);
                }
              }}
              title="Clear messages"
              className="p-1.5 rounded hover:bg-white/[0.06] text-neutral-500 hover:text-danger transition-colors"
            >
              <Eraser size={16} strokeWidth={1.5} />
            </button>
          </div>
        )}
      </header>

      {/* Messages */}
      <div className="relative flex-1 min-h-0 flex flex-col">
        <div
          ref={scrollContainerRef}
          onScroll={handleScroll}
          className="flex-1 overflow-y-auto overflow-x-hidden w-full"
        >
        {currentConversation.messages.length > 50 && (
          <div className="bg-warning-soft text-warning text-[13px] text-center py-2 px-4 border-b border-warning/20">
            This conversation is long. Consider starting a new chat for lower token costs.
          </div>
        )}
        {currentConversation.messages.map((msg, index) => {
          const isLastError = index === currentConversation.messages.length - 1 && msg.role === 'assistant' && msg.content.startsWith('**Error:**');
          return (
            <Message
              key={msg.id}
              message={msg}
              onApplyCode={handleApplyCode}
              onRetry={isLastError ? () => {
                // Remove the error message
                useStore.getState().updateMessage(currentConversation.id, msg.id, 'Retrying...');
                
                // Construct messages without the current error message
                const messagesWithoutError = currentConversation.messages.slice(0, -1);
                
                // Get the context messages to send
                const contextMessages = messagesWithoutError.map((m) => ({ role: m.role, content: m.content }));
                let finalSystemPrompt = systemPrompt.trim();
                
                if (projectContext) {
                  finalSystemPrompt += projectContext;
                }

                const apiMessages = finalSystemPrompt.trim()
                  ? [{ role: 'system', content: finalSystemPrompt }, ...contextMessages]
                  : contextMessages;

                const options: ApiOptions = {
                  apiMode,
                  apiKey,
                  localEndpoint,
                  model: selectedModel,
                  temperature,
                  topP,
                  maxTokens,
                };

                setIsLoading(true);

                if (useStreaming) {
                  setIsStreaming(true);
                  setStreamingContent('');
                  abortControllerRef.current = new AbortController();

                  (async () => {
                    try {
                      const stream = streamChat(apiMessages, options, abortControllerRef.current!.signal);
                      let fullContent = '';
                      for await (const chunk of stream) {
                        fullContent += chunk;
                        setStreamingContent(fullContent);
                      }
                      useStore.getState().updateMessage(currentConversation.id, msg.id, fullContent);
                    } catch (error: any) {
                      if (error.name === 'AbortError') return;
                      useStore.getState().updateMessage(currentConversation.id, msg.id, `**Error:** ${error instanceof Error ? error.message : 'Unknown error occurred'}`);
                    } finally {
                      setIsStreaming(false);
                      setStreamingContent('');
                      setIsLoading(false);
                      abortControllerRef.current = null;
                    }
                  })();
                } else {
                  abortControllerRef.current = new AbortController();
                  (async () => {
                    try {
                      const content = await sendMessage(apiMessages, options, abortControllerRef.current!.signal);
                      useStore.getState().updateMessage(currentConversation.id, msg.id, content);
                    } catch (error: any) {
                      if (error.name === 'AbortError') return;
                      useStore.getState().updateMessage(currentConversation.id, msg.id, `**Error:** ${error instanceof Error ? error.message : 'Unknown error occurred'}`);
                    } finally {
                      setIsLoading(false);
                      abortControllerRef.current = null;
                    }
                  })();
                }
              } : undefined}
            />
          );
        })}
        {isStreaming && streamingContent && (
          <Message
            message={{
              id: 'streaming',
              role: 'assistant',
              content: streamingContent,
              createdAt: Date.now(),
            }}
          />
        )}
        {isLoading && !streamingContent && (
          <Message
            message={{
              id: 'typing',
              role: 'assistant',
              content: '...',
              createdAt: Date.now(),
            }}
            isTyping
          />
        )}
        <div ref={bottomRef} className="h-8 w-full shrink-0" />
      </div>

        {showScrollButton && (
          <button
            onClick={() => scrollToBottom('smooth')}
            className="absolute bottom-4 right-4 p-2 bg-surface-2 rounded-full shadow-lg border border-white/[0.08] text-neutral-400 hover:text-white hover:bg-surface-3 transition-colors z-20"
          >
            <ArrowDown size={16} />
          </button>
        )}
      </div>

      {/* Input area */}
      <div className="w-full shrink-0 bg-neutral-950 pt-2 pb-[max(0.75rem,env(safe-area-inset-bottom))] px-4 border-t border-white/[0.06]">
        <div className="max-w-3xl mx-auto w-full">
          {input.startsWith('/') && (
            <div className="mb-2 bg-surface-1 rounded border border-white/[0.08] overflow-hidden text-sm">
              <div className="px-3 py-1.5 bg-surface-2 border-b border-white/[0.06] text-[11px] font-semibold text-neutral-500 uppercase tracking-wider">Skills</div>
              {builtInSkills.map(skill => (
                <div key={skill.name} onClick={() => setInput(`/${skill.name} `)} className="px-3 py-2 cursor-pointer hover:bg-white/[0.04] text-neutral-300">
                  <span className="font-medium text-neutral-200">/{skill.name}</span>{' '}
                  <span className="text-neutral-500">— {skill.description}</span>
                </div>
              ))}
            </div>
          )}
          <form
            onSubmit={handleSubmit}
            className="relative flex items-end gap-2 bg-surface-1 rounded border border-white/[0.08] overflow-hidden focus-within:border-accent transition-colors p-1.5"
          >
            <textarea
              value={input}
              onChange={(e) => {
                setInput(e.target.value);
                e.target.style.height = 'auto';
                e.target.style.height = `${e.target.scrollHeight}px`;
              }}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  handleSubmit(e);
                  e.currentTarget.style.height = 'auto';
                }
              }}
              placeholder={(apiMode === 'cloud' && !apiKey) ? "Configure API key first..." : "Message..."}
              className="flex-1 max-h-48 min-h-[40px] bg-transparent resize-none py-2.5 px-2.5 outline-none text-white text-[15px] placeholder-neutral-600"
              rows={1}
              disabled={(apiMode === 'cloud' && !apiKey) || isLoading}
            />
            <button
              type="button"
              onClick={handleVoiceInput}
              className={`p-2 rounded transition-colors shrink-0 ${isListening ? 'text-danger' : 'text-neutral-500 hover:text-white'}`}
              title="Voice input"
            >
              <Mic size={18} strokeWidth={1.5} className={isListening ? 'animate-pulse' : ''} />
            </button>
            {isStreaming ? (
              <button
                type="button"
                onClick={handleStop}
                className="p-2 bg-danger text-white rounded transition-colors shrink-0"
                aria-label="Stop generation"
              >
                <StopCircle size={18} strokeWidth={2} />
              </button>
            ) : isLoading ? (
              <button
                type="button"
                disabled
                className="p-2 text-neutral-500 rounded shrink-0 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <Loader2 size={18} strokeWidth={1.5} className="animate-spin" />
              </button>
            ) : (
              <button
                type="submit"
                disabled={!input.trim() || (apiMode === 'cloud' && !apiKey)}
                aria-label="Send message"
                className="p-2 bg-accent hover:bg-accent-hover text-white rounded transition-colors shrink-0 disabled:opacity-20 disabled:cursor-not-allowed"
              >
                <Send size={18} strokeWidth={2} />
              </button>
            )}
          </form>

          {/* Quick actions */}
          {currentProject && (
            <div className="flex flex-wrap items-center gap-2 mt-2.5 mb-1">
              <button onClick={() => {
                let projType = 'Unknown';
                const safeFiles = files || [];
                const pkgJson = safeFiles.find(f => f?.path === 'package.json');
                if (pkgJson) {
                  try {
                    const pkg = JSON.parse(pkgJson.content);
                    const deps = { ...pkg.dependencies, ...pkg.devDependencies };
                    if (deps.react) projType = 'React';
                    if (deps.vue) projType = 'Vue';
                    if (deps['@angular/core']) projType = 'Angular';
                    if (deps.next) projType = 'Next.js';
                  } catch {}
                } else if (safeFiles.find(f => f?.path?.endsWith('.py'))) {
                  projType = 'Python';
                }
                
                setInput(`This workspace appears to be a ${projType} project. Can you explain the overall project architecture, entry points, and dependencies based on the current workspace context?`);
              }} className="text-[12px] px-2.5 py-1 rounded bg-secondary-soft/30 text-secondary-muted hover:bg-secondary-soft/50 hover:text-secondary transition-colors">Analyze architecture</button>
              <button onClick={() => {
                const worker = new Worker(new URL('../workers/eslint.worker.ts', import.meta.url), { type: 'module' });
                worker.onmessage = (e) => {
                  const results = e.data;
                  if (results.length > 0) {
                    const lintReport = results.map((r: any) => `[${r.severity}] ${r.file}:${r.line} - ${r.message}`).join('\n');
                    setInput(`I ran a linter and found these issues. Please review them and explain how to fix them:\n\n\`\`\`text\n${lintReport}\n\`\`\``);
                  } else {
                    setInput("The linter passed. Perform a deeper code review for complex logic bugs or anti-patterns.");
                  }
                  worker.terminate();
                };
                worker.postMessage({ files });
              }} className="text-[12px] px-2.5 py-1 rounded bg-accent-muted/50 text-accent-soft hover:bg-accent-muted hover:text-accent transition-colors">Lint review</button>
              <button onClick={() => setInput("Create a new full-stack project structure for a [Describe your app] app.")} className="text-[12px] px-2.5 py-1 rounded bg-secondary-soft/30 text-secondary-muted hover:bg-secondary-soft/50 hover:text-secondary transition-colors">Generate project</button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
