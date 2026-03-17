import { useState, useRef, useEffect } from 'react';
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
        // extract basic params (we'll just pass the whole string as the main parameter for now)
        // A full implementation would parse key=value args from parsedSkill.params
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
             onProgress: () => {
               // Optional: Show progress somewhere
             }
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
    if (currentProject) {
      let projectContext = `\n\n--- Current Active Workspace Project: ${currentProject.name} ---\n` +
        `This is a virtual file system. When writing code, ALWAYS add the target file path in your codeblocks (e.g., \`\`\`tsx path="src/App.tsx"\`\`\`) to allow automatic file generation.\n\n` +
        `Project Files:\n`;

      let contextSize = 0;
      const MAX_CONTEXT_CHARS = 40000; // Limit roughly ~10k tokens
      const activeFiles = (files || []).filter(f => f?.type === 'file');
      
      for (const f of activeFiles) {
        const fileStr = `File: ${f.path}\n\`\`\`\n${f.content}\n\`\`\`\n`;
        if (contextSize + fileStr.length > MAX_CONTEXT_CHARS) {
          projectContext += `\n... (Other files omitted due to context length limits. Focus on the ones provided.)\n`;
          break;
        }
        projectContext += fileStr;
        contextSize += fileStr.length;
      }
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
    
    // Check if file exists
    const existingFile = (files || []).find(f => f?.path === filename);
    try {
      if (existingFile) {
        if (window.confirm(`Are you sure you want to overwrite ${filename}?`)) {
          await updateFile(existingFile.id, content);
          alert(`${filename} updated successfully!`);
        }
      } else {
        await createFile(filename, 'file', content);
        alert(`${filename} created successfully!`);
      }
    } catch (e: any) {
      alert(`Error applying code: ${e.message}`);
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
      <div className="flex-1 flex flex-col items-center justify-center bg-gray-50 dark:bg-gray-800 h-[100dvh]">
        <button
          onClick={() => setSidebarOpen(true)}
          aria-label="Toggle Sidebar"
          className="absolute top-4 left-4 md:hidden p-2 rounded-md hover:bg-gray-200 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300 transition-colors"
        >
          <Menu size={24} />
        </button>
        <div className="text-center space-y-4">
          <h2 className="text-2xl font-semibold text-gray-700 dark:text-gray-300">OpenRouter Mobile Chat</h2>
          <p className="text-gray-500 dark:text-gray-400">Select or create a conversation to get started</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 min-w-0 flex flex-col h-[100dvh] bg-gray-50 dark:bg-gray-800 relative">
      <header className="flex items-center gap-3 p-4 bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-800 shadow-sm z-10 sticky top-0">
        <button
          onClick={() => setSidebarOpen(true)}
          aria-label="Toggle Sidebar"
          className="md:hidden p-2 -ml-2 rounded-md hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-600 dark:text-gray-300 transition-colors"
        >
          <Menu size={24} />
        </button>
        <div className="flex flex-col flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <h1 className="text-lg font-semibold truncate text-gray-800 dark:text-white">
              {currentConversation.title}
            </h1>
            {currentProject && (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-400">
                Workspace: {currentProject.name}
              </span>
            )}
            {apiMode === 'local' ? (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400">
                <MonitorSmartphone size={12} />
                Local
              </span>
            ) : (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400">
                <Network size={12} />
                Cloud
              </span>
            )}
            {isOffline && (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400 ml-1">
                Offline
              </span>
            )}
            {apiMode === 'local' && ollamaStatus === 'offline' && (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400 ml-1">
                Ollama Down
              </span>
            )}
          </div>
        </div>
        {currentConversation.messages.length > 0 && (
          <div className="flex items-center gap-1 shrink-0">
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
              title="Export Conversation"
              className="p-2 rounded-md hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 transition-colors"
            >
              <Download size={20} />
            </button>
            <button
              onClick={() => {
                if (window.confirm('Are you sure you want to clear this conversation?')) {
                  clearMessages(currentConversation.id);
                }
              }}
              title="Clear Messages"
              className="p-2 rounded-md hover:bg-red-50 dark:hover:bg-red-900/30 text-gray-500 hover:text-red-600 dark:text-gray-400 dark:hover:text-red-400 transition-colors"
            >
              <Eraser size={20} />
            </button>
          </div>
        )}
      </header>

      <div className="relative flex-1 min-h-0 flex flex-col">
        <div
          ref={scrollContainerRef}
          onScroll={handleScroll}
          className="flex-1 overflow-y-auto overflow-x-hidden w-full pb-4"
        >
        {currentConversation.messages.length > 50 && (
          <div className="bg-yellow-50 dark:bg-yellow-900/30 text-yellow-800 dark:text-yellow-200 text-sm text-center py-2 px-4 shadow-sm border-b border-yellow-200 dark:border-yellow-900/50">
            Warning: This conversation is very long. Consider starting a new chat to avoid high token costs or API limits.
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
                
                if (currentProject) {
                  let projectContext = `\n\n--- Current Active Workspace Project: ${currentProject.name} ---\n` +
                    `This is a virtual file system. When writing code, ALWAYS add the target file path in your codeblocks (e.g., \`\`\`tsx path="src/App.tsx"\`\`\`) to allow automatic file generation.\n\n` +
                    `Project Files:\n`;

                  let contextSize = 0;
                  const MAX_CONTEXT_CHARS = 40000;
                  const activeFiles = (files || []).filter(f => f?.type === 'file');
                  
                  for (const f of activeFiles) {
                    const fileStr = `File: ${f.path}\n\`\`\`\n${f.content}\n\`\`\`\n`;
                    if (contextSize + fileStr.length > MAX_CONTEXT_CHARS) {
                      projectContext += `\n... (Other files omitted due to context length limits)\n`;
                      break;
                    }
                    projectContext += fileStr;
                    contextSize += fileStr.length;
                  }
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
                      // Replace the "Retrying..." message with final content
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
            className="absolute bottom-4 right-4 p-2 bg-white dark:bg-gray-700 rounded-full shadow-lg border border-gray-200 dark:border-gray-600 text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-600 transition-all z-20"
          >
            <ArrowDown size={20} />
          </button>
        )}
      </div>

      <div className="w-full shrink-0 bg-gray-50 dark:bg-gray-800 pt-2 pb-[max(1rem,env(safe-area-inset-bottom))] px-4 border-t border-gray-200 dark:border-gray-700/50">
        <div className="max-w-3xl mx-auto w-full">
          {input.startsWith('/') && (
            <div className="mb-2 bg-white dark:bg-gray-800 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700 overflow-hidden text-sm">
              <div className="px-3 py-2 bg-gray-50 dark:bg-gray-900 border-b border-gray-200 dark:border-gray-700 text-xs font-semibold text-gray-500 uppercase">Available Skills</div>
              {builtInSkills.map(skill => (
                <div key={skill.name} onClick={() => setInput(`/${skill.name} `)} className="px-3 py-2 cursor-pointer hover:bg-blue-50 dark:hover:bg-blue-900/20 text-gray-700 dark:text-gray-300">
                  <span className="font-semibold text-blue-600 dark:text-blue-400">/{skill.name}</span> - {skill.description}
                </div>
              ))}
            </div>
          )}
          <form
            onSubmit={handleSubmit}
            className="relative flex items-end gap-2 bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-700 shadow-sm overflow-hidden focus-within:ring-2 focus-within:ring-blue-500 focus-within:border-transparent transition-all p-2"
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
              placeholder={(apiMode === 'cloud' && !apiKey) ? "Please configure API key first" : "Type a message or /skill..."}
              className="flex-1 max-h-48 min-h-[44px] bg-transparent resize-none py-3 px-3 outline-none text-gray-900 dark:text-white placeholder-gray-500"
              rows={1}
              disabled={(apiMode === 'cloud' && !apiKey) || isLoading}
            />
            <button
              type="button"
              onClick={handleVoiceInput}
              className={`p-3 rounded-xl transition-colors flex-shrink-0 mb-1 ${isListening ? 'bg-red-100 text-red-600 dark:bg-red-900/30' : 'text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-800'}`}
              title="Voice Input"
            >
              <Mic size={20} className={isListening ? 'animate-pulse' : ''} />
            </button>
            {isStreaming ? (
              <button
                type="button"
                onClick={handleStop}
                className="p-3 bg-red-500 text-white rounded-xl hover:bg-red-600 transition-colors flex-shrink-0 mb-1"
                aria-label="Stop generation"
              >
                <StopCircle size={20} />
              </button>
            ) : isLoading ? (
              <button
                type="button"
                disabled
                className="p-3 bg-blue-600 text-white rounded-xl disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex-shrink-0 mb-1"
              >
                <Loader2 size={20} className="ml-1 animate-spin" />
              </button>
            ) : (
              <button
                type="submit"
                disabled={!input.trim() || (apiMode === 'cloud' && !apiKey)}
                aria-label="Send message"
                className="p-3 bg-blue-600 text-white rounded-xl hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex-shrink-0 mb-1"
              >
                <Send size={20} className="ml-1" />
              </button>
            )}
          </form>
          <div className="flex flex-wrap items-center justify-center gap-2 mt-2">
            {currentProject && (
              <>
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
                }} className="text-xs px-2 py-1 rounded bg-gray-200 dark:bg-gray-700 text-gray-600 dark:text-gray-300 hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors">Analyze Architecture</button>
                <button onClick={() => {
                  const worker = new Worker(new URL('../workers/eslint.worker.ts', import.meta.url), { type: 'module' });
                  worker.onmessage = (e) => {
                    const results = e.data;
                    if (results.length > 0) {
                      const lintReport = results.map((r: any) => `[${r.severity}] ${r.file}:${r.line} - ${r.message}`).join('\n');
                      setInput(`I ran a linter and found these issues. Please review them and explain how to fix them:\n\n\`\`\`text\n${lintReport}\n\`\`\``);
                    } else {
                      setInput("Please perform a deeper AI code review for any complex logic bugs or anti-patterns, the linter passed completely.");
                    }
                    worker.terminate();
                  };
                  worker.postMessage({ files });
                }} className="text-xs px-2 py-1 rounded bg-gray-200 dark:bg-gray-700 text-gray-600 dark:text-gray-300 hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors">AI Code Review (Lint)</button>
                <button onClick={() => setInput("Create a new full-stack project structure for a [Describe your app] app.")} className="text-xs px-2 py-1 rounded bg-gray-200 dark:bg-gray-700 text-gray-600 dark:text-gray-300 hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors">Generate Project</button>
              </>
            )}
            <span className="text-xs text-gray-400 dark:text-gray-500 w-full text-center mt-1">
              OpenRouter Mobile Chat • {apiMode === 'local' ? 'Local Mode (Ollama)' : 'Cloud Mode (OpenRouter)'}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}