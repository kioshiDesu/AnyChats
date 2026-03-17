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
            'fixed inset-y-0 left-0 z-50 flex w-72 flex-col bg-gray-900 text-white transition-transform duration-300 ease-in-out md:relative md:translate-x-0',
            !isSidebarOpen && '-translate-x-full'
          )
        )}
      >
        <div className="flex h-16 items-center justify-between px-4 border-b border-gray-800">
          <button
            onClick={() => createConversation()}
            className="flex items-center gap-2 rounded-lg bg-gray-800 px-4 py-2 text-sm font-medium hover:bg-gray-700 transition-colors flex-1"
          >
            <Plus size={18} />
            New Chat
          </button>
          <button
            onClick={() => setSidebarOpen(false)}
            aria-label="Close sidebar"
            className="md:hidden ml-4 p-2 text-gray-400 hover:text-white"
          >
            <X size={20} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto py-2 px-3 space-y-1">
          <div className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2 mt-4 px-2">Workspaces</div>
          <div className="flex flex-col gap-1 px-1">
            <button onClick={() => {
              const name = window.prompt("Enter new workspace name:");
              if (name) {
                useWorkspaceStore.getState().createProject(name);
              }
            }} className="flex items-center gap-2 rounded-lg px-2 py-1.5 text-sm text-gray-400 hover:text-white hover:bg-gray-800 transition-colors w-full">
              <Plus size={16} /> Create Workspace
            </button>
            <div className="flex items-center gap-1">
              <label className="flex flex-1 items-center gap-2 rounded-lg px-2 py-1.5 text-sm text-gray-400 hover:text-white hover:bg-gray-800 transition-colors cursor-pointer">
                <Upload size={14} /> Import ZIP
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
                const url = window.prompt("Enter GitHub Repo URL (e.g. facebook/react):");
                if (url) {
                  try {
                    await importProjectFromGitHub(url);
                  } catch (err: any) {
                    alert(err.message);
                  }
                }
              }} className="flex flex-1 items-center gap-2 rounded-lg px-2 py-1.5 text-sm text-gray-400 hover:text-white hover:bg-gray-800 transition-colors w-full">
                <Github size={14} /> Import Repo
              </button>
            </div>
          </div>
          {(projects || []).map((proj) => proj ? (
            <div 
              key={proj.id} 
              onClick={() => useWorkspaceStore.getState().setCurrentProject(proj.id)} 
              className={clsx(
                "group flex items-center justify-between rounded-lg px-3 py-2 text-sm cursor-pointer transition-colors", 
                currentProjectId === proj.id ? "bg-purple-900/50 text-purple-300" : "text-gray-300 hover:bg-gray-800"
              )}
            >
              <span className="truncate">{proj?.name || 'Unnamed Project'}</span>
              <button 
                onClick={(e) => { 
                  e.stopPropagation(); 
                  if (window.confirm(`Are you sure you want to delete "${proj.name}"? This will delete all files in the workspace.`)) {
                    useWorkspaceStore.getState().deleteProject(proj.id);
                  }
                }} 
                className="opacity-0 group-hover:opacity-100 p-1 text-gray-500 hover:text-red-400"
              >
                <Trash2 size={14}/>
              </button>
            </div>
          ) : null)}

          <WorkspaceExplorer />

          <div className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2 mt-6 px-2">Chats</div>
          {conversations.map((conv) => (
            <div
              key={conv.id}
              className={clsx(
                'group flex items-center gap-3 rounded-lg px-3 py-3 text-sm cursor-pointer transition-colors',
                currentConversationId === conv.id
                  ? 'bg-gray-800 text-white'
                  : 'text-gray-300 hover:bg-gray-800/50 hover:text-white'
              )}
              onClick={() => setCurrentConversation(conv.id)}
            >
              <MessageSquare size={18} className="shrink-0" />
              <div className="flex-1 truncate">{conv.title}</div>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  if (window.confirm('Are you sure you want to delete this chat?')) {
                    deleteConversation(conv.id);
                  }
                }}
                aria-label="Delete conversation"
                className="opacity-0 group-hover:opacity-100 p-1 text-gray-500 hover:text-red-400 transition-opacity"
              >
                <Trash2 size={16} />
              </button>
            </div>
          ))}
          {conversations.length === 0 && (
            <div className="text-center text-gray-500 text-sm mt-8">
              No conversations yet
            </div>
          )}
        </div>

        <div className="p-4 border-t border-gray-800">
          <button
            onClick={() => {
              setSettingsOpen(true);
              setSidebarOpen(false);
            }}
            className="flex items-center gap-3 w-full rounded-lg px-3 py-3 text-sm text-gray-300 hover:bg-gray-800 hover:text-white transition-colors"
          >
            <Settings size={18} />
            Settings
          </button>
        </div>
      </div>
    </>
  );
}