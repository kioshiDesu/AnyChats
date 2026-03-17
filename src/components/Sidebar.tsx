import { useEffect } from 'react';
import { useStore } from '../store/useStore';
import { useWorkspaceStore } from '../store/useWorkspaceStore';
import { MessageSquare, Plus, Settings, Trash2, X, Upload, Github } from 'lucide-react';
import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { WorkspaceExplorer } from './WorkspaceExplorer';
import { importProjectFromZip, importProjectFromGitHub } from '../utils/projectExport';

export function Sidebar() {
  const loadProjects = useWorkspaceStore((state) => state.loadProjects);
  const projects = useWorkspaceStore((state) => state.projects);
  const currentProjectId = useWorkspaceStore((state) => state.currentProject?.id);
  useEffect(() => { loadProjects() }, [loadProjects]);

  const {
    conversations,
    currentConversationId,
    setCurrentConversation,
    createConversation,
    deleteConversation,
    isSidebarOpen,
    setSidebarOpen,
    setSettingsOpen,
  } = useStore();

  return (
    <>
      {/* Mobile overlay */}
      {isSidebarOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/50 md:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar container */}
      <div
        className={twMerge(
          clsx(
            'fixed inset-y-0 left-0 z-50 flex w-64 flex-col bg-neutral-950 text-white transition-transform duration-250 ease-out md:relative md:translate-x-0',
            !isSidebarOpen && '-translate-x-full'
          )
        )}
      >
        {/* Header */}
        <div className="flex h-14 items-center justify-between px-3 border-b border-white/[0.06]">
          <button
            onClick={() => createConversation()}
            className="flex items-center gap-2 rounded px-3 py-2 text-sm font-medium text-accent hover:bg-accent-muted transition-colors flex-1 text-left"
          >
            <Plus size={16} strokeWidth={2} />
            New chat
          </button>
          <button
            onClick={() => setSidebarOpen(false)}
            aria-label="Close sidebar"
            className="md:hidden ml-2 p-2 text-neutral-500 hover:text-white rounded transition-colors"
          >
            <X size={16} />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto py-3 px-2 custom-scrollbar">

          {/* Workspaces section */}
          <div className="mb-1 px-2">
            <span className="text-[11px] font-semibold text-secondary uppercase tracking-wider">Workspaces</span>
          </div>

          <div className="space-y-0.5 mb-4">
            <button onClick={() => {
              const name = window.prompt("Workspace name:");
              if (name) {
                useWorkspaceStore.getState().createProject(name);
              }
            }} className="flex items-center gap-2 rounded px-2 py-1.5 text-sm text-neutral-400 hover:text-secondary hover:bg-secondary-soft/30 transition-colors w-full text-left">
              <Plus size={14} strokeWidth={2} /> New workspace
            </button>
            <div className="flex items-center gap-1">
              <label className="flex flex-1 items-center gap-2 rounded px-2 py-1.5 text-sm text-neutral-400 hover:text-secondary hover:bg-secondary-soft/30 transition-colors cursor-pointer">
                <Upload size={14} strokeWidth={2} /> Import ZIP
                <input type="file" accept=".zip" className="hidden" onChange={async (e) => {
                  if (e.target.files && e.target.files[0]) {
                    try {
                      await importProjectFromZip(e.target.files[0]);
                    } catch (err: any) {
                      alert(err.message);
                    }
                    e.target.value = '';
                  }
                }} />
              </label>
              <button onClick={async () => {
                const url = window.prompt("GitHub repo (e.g. facebook/react):");
                if (url) {
                  try {
                    await importProjectFromGitHub(url);
                  } catch (err: any) {
                    alert(err.message);
                  }
                }
              }} className="flex flex-1 items-center gap-2 rounded px-2 py-1.5 text-sm text-neutral-400 hover:text-secondary hover:bg-secondary-soft/30 transition-colors w-full text-left">
                <Github size={14} strokeWidth={2} /> Import repo
              </button>
            </div>
          </div>

          {/* Project list */}
          {(projects || []).map((proj) => proj ? (
            <div 
              key={proj.id} 
              onClick={() => useWorkspaceStore.getState().setCurrentProject(proj.id)} 
              className={clsx(
                "group flex items-center justify-between rounded px-2 py-1.5 text-sm cursor-pointer transition-colors", 
                currentProjectId === proj.id 
                  ? "bg-secondary-soft text-secondary" 
                  : "text-neutral-400 hover:bg-secondary-soft/20 hover:text-secondary-muted"
              )}
            >
              <span className="truncate">{proj?.name || 'Untitled'}</span>
              <button 
                onClick={(e) => { 
                  e.stopPropagation(); 
                  if (window.confirm(`Delete "${proj.name}" and all its files?`)) {
                    useWorkspaceStore.getState().deleteProject(proj.id);
                  }
                }} 
                className="opacity-0 group-hover:opacity-100 p-1 text-neutral-500 hover:text-danger transition-opacity"
              >
                <Trash2 size={13} strokeWidth={1.5}/>
              </button>
            </div>
          ) : null)}

          <WorkspaceExplorer />

          {/* Chats section */}
          <div className="mb-1 px-2 mt-6">
            <span className="text-[11px] font-semibold text-accent uppercase tracking-wider">Chats</span>
          </div>

          <div className="space-y-0.5">
            {conversations.map((conv) => (
              <div
                key={conv.id}
                className={clsx(
                  'group flex items-center gap-2.5 rounded px-2 py-2 text-sm cursor-pointer transition-colors',
                  currentConversationId === conv.id
                    ? 'bg-accent-muted text-accent-hover'
                    : 'text-neutral-400 hover:bg-white/[0.04] hover:text-white'
                )}
                onClick={() => setCurrentConversation(conv.id)}
              >
                <MessageSquare size={15} strokeWidth={1.5} className="shrink-0 opacity-60" />
                <div className="flex-1 truncate">{conv.title}</div>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    if (window.confirm('Delete this chat?')) {
                      deleteConversation(conv.id);
                    }
                  }}
                  aria-label="Delete conversation"
                  className="opacity-0 group-hover:opacity-100 p-1 text-neutral-500 hover:text-danger transition-opacity"
                >
                  <Trash2 size={13} strokeWidth={1.5} />
                </button>
              </div>
            ))}
          </div>

          {conversations.length === 0 && (
            <div className="px-2 py-6 text-center text-neutral-500 text-sm">
              No conversations yet
            </div>
          )}
        </div>

        {/* Settings footer */}
        <div className="p-3 border-t border-white/[0.06]">
          <button
            onClick={() => {
              setSettingsOpen(true);
              setSidebarOpen(false);
            }}
            className="flex items-center gap-2.5 w-full rounded px-3 py-2 text-sm text-neutral-400 hover:bg-white/[0.06] hover:text-white transition-colors"
          >
            <Settings size={15} strokeWidth={1.5} />
            Settings
          </button>
        </div>
      </div>
    </>
  );
}
