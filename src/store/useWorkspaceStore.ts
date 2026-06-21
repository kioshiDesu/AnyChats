import { create } from 'zustand';
import { WorkspaceProject, WorkspaceFile, FileVersion, dbService } from '../services/db';

const generateId = () => {
  return typeof crypto !== 'undefined' && crypto.randomUUID
    ? crypto.randomUUID()
    : Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
};

interface WorkspaceState {
  projects: WorkspaceProject[];
  currentProject: WorkspaceProject | null;
  files: WorkspaceFile[];
  activeFileId: string | null;
  isLoading: boolean;
  error: string | null;
  
  // UI actions
  setActiveFileId: (id: string | null) => void;

  // Project actions
  loadProjects: () => Promise<void>;
  createProject: (name: string) => Promise<WorkspaceProject>;
  setCurrentProject: (id: string | null) => Promise<void>;
  deleteProject: (id: string) => Promise<void>;
  
  // File actions
  loadFiles: (projectId: string) => Promise<void>;
  createFile: (projectId: string, path: string, type: 'file' | 'folder', content?: string) => Promise<WorkspaceFile>;
  updateFile: (id: string, content: string, saveVersion?: boolean) => Promise<void>;
  deleteFile: (id: string) => Promise<void>;
  deleteFolder: (projectId: string, path: string) => Promise<void>;

  // Version actions
  getFileVersions: (fileId: string) => Promise<FileVersion[]>;
  restoreVersion: (versionId: string) => Promise<void>;
}

export const useWorkspaceStore = create<WorkspaceState>((set, get) => ({
  projects: [],
  currentProject: null,
  files: [],
  activeFileId: null,
  isLoading: false,
  error: null,

  setActiveFileId: (id: string | null) => set({ activeFileId: id }),

  loadProjects: async () => {
    set({ isLoading: true, error: null });
    try {
      const projects = await dbService.getProjects();
      set({ projects, isLoading: false });
    } catch (error: any) {
      set({ error: error.message, isLoading: false });
    }
  },

  createProject: async (name: string) => {
    set({ isLoading: true, error: null });
    try {
      const newProject: WorkspaceProject = {
        id: generateId(),
        name,
        createdAt: Date.now(),
        lastModified: Date.now(),
      };
      await dbService.saveProject(newProject);
      
      // Optimized: Single state update instead of reloading from DB
      set((state) => ({ 
        projects: [...state.projects, newProject],
        isLoading: false 
      }));
      return newProject;
    } catch (error: any) {
      set({ error: error.message, isLoading: false });
      throw error;
    }
  },

  setCurrentProject: async (id: string | null) => {
    if (!id) {
      set({ currentProject: null, files: [] });
      return;
    }
    
    set({ isLoading: true, error: null });
    try {
      const [project, files] = await Promise.all([
        dbService.getProject(id),
        dbService.getFiles(id)
      ]);
      
      if (project) {
        set({ currentProject: project, files, isLoading: false });
      } else {
        set({ currentProject: null, files: [], error: 'Project not found', isLoading: false });
      }
    } catch (error: any) {
      set({ error: error.message, isLoading: false });
    }
  },

  deleteProject: async (id: string) => {
    set({ isLoading: true, error: null });
    try {
      await dbService.deleteProject(id);
      
      // Optimized: Update state directly instead of reloading
      set((state) => {
        const projects = state.projects.filter(p => p.id !== id);
        let updateState: Partial<WorkspaceState> = { projects, isLoading: false };
        
        if (state.currentProject?.id === id) {
          updateState.currentProject = null;
          updateState.files = [];
        }
        
        return updateState;
      });
    } catch (error: any) {
      set({ error: error.message, isLoading: false });
    }
  },

  loadFiles: async (projectId: string) => {
    set({ isLoading: true, error: null });
    try {
      const files = await dbService.getFiles(projectId);
      set({ files, isLoading: false });
    } catch (error: any) {
      set({ error: error.message, isLoading: false });
    }
  },

  createFile: async (projectId: string, path: string, type: 'file' | 'folder', content: string = '') => {
    set({ isLoading: true, error: null });
    try {
      const existing = await dbService.getFile(projectId, path);
      if (existing) {
        throw new Error(`Path ${path} already exists`);
      }

      const newFile: WorkspaceFile = {
        id: generateId(),
        projectId,
        path,
        type,
        content,
        createdAt: Date.now(),
        updatedAt: Date.now(),
      };
      
      await dbService.saveFile(newFile);
      
      // Optimized: Update project timestamp and add file to state in one operation
      const project = get().currentProject;
      if (project && project.id === projectId) {
        const updatedProject = { ...project, lastModified: Date.now() };
        await dbService.saveProject(updatedProject);
        set((state) => ({
          files: [...state.files, newFile],
          currentProject: updatedProject,
          isLoading: false
        }));
      } else {
        set({ isLoading: false });
      }
      return newFile;
    } catch (error: any) {
      set({ error: error.message, isLoading: false });
      throw error;
    }
  },

  updateFile: async (id: string, content: string, saveVersion: boolean = true) => {
    set({ isLoading: true, error: null });
    try {
      const files = get().files;
      const fileIndex = files.findIndex(f => f.id === id);
      
      if (fileIndex === -1) {
        throw new Error('File not found in state');
      }
      
      const file = files[fileIndex];

      // Optimized: Parallel operations
      const promises: Promise<any>[] = [];
      
      if (saveVersion && file.content !== content) {
        promises.push(dbService.saveFileVersion(id, file.content));
      }

      const updatedFile = {
        ...file,
        content,
        updatedAt: Date.now()
      };
      
      promises.push(dbService.saveFile(updatedFile));
      
      // Update project timestamp
      const project = get().currentProject;
      if (project) {
        const updatedProject = { ...project, lastModified: Date.now() };
        promises.push(dbService.saveProject(updatedProject));
        promises.push(Promise.resolve(updatedProject));
      }
      
      await Promise.all(promises);
      
      // Update state with new file content
      const newFiles = [...files];
      newFiles[fileIndex] = updatedFile;
      set({ files: newFiles, isLoading: false });
    } catch (error: any) {
      set({ error: error.message, isLoading: false });
      throw error;
    }
  },

  deleteFile: async (id: string) => {
    set({ isLoading: true, error: null });
    try {
      const files = get().files;
      const file = files.find(f => f.id === id);
      if (!file) return;

      // Optimized: Parallel operations
      await Promise.all([
        dbService.deleteFileVersions(id),
        dbService.deleteFile(id)
      ]);
      
      // Update project timestamp and remove file from state directly
      const project = get().currentProject;
      if (project) {
        const updatedProject = { ...project, lastModified: Date.now() };
        await dbService.saveProject(updatedProject);
      }
      
      // Update state directly instead of reloading
      set((state) => ({
        files: state.files.filter(f => f.id !== id),
        isLoading: false
      }));
    } catch (error: any) {
      set({ error: error.message, isLoading: false });
    }
  },

  deleteFolder: async (projectId: string, path: string) => {
    set({ isLoading: true, error: null });
    try {
      const files = await dbService.getFiles(projectId);
      const toDelete = files.filter(f => f.path === path || f.path.startsWith(`${path}/`));
      
      // Optimized: Parallel deletion
      await Promise.all(toDelete.map(file => 
        Promise.all([
          dbService.deleteFileVersions(file.id),
          dbService.deleteFile(file.id)
        ])
      ));
      
      // Update project timestamp
      const project = await dbService.getProject(projectId);
      if (project) {
        project.lastModified = Date.now();
        await dbService.saveProject(project);
      }
      
      // Update state directly
      set((state) => ({
        files: state.files.filter(f => !toDelete.find(d => d.id === f.id)),
        isLoading: false
      }));
    } catch (error: any) {
      set({ error: error.message, isLoading: false });
    }
  },

  getFileVersions: async (fileId: string) => {
    try {
      return await dbService.getFileVersions(fileId);
    } catch (error: any) {
      set({ error: error.message });
      return [];
    }
  },

  restoreVersion: async (versionId: string) => {
    set({ isLoading: true, error: null });
    try {
      const files = get().files;
      let targetFile: WorkspaceFile | undefined;
      let targetVersion: FileVersion | undefined;

      // Optimized: Parallel version fetching
      const versionPromises = files.map(async file => {
        const versions = await dbService.getFileVersions(file.id);
        const version = versions.find(v => v.id === versionId);
        if (version) {
          targetFile = file;
          targetVersion = version;
        }
      });
      
      await Promise.all(versionPromises);

      if (!targetFile || !targetVersion) {
        throw new Error('Version not found');
      }

      // Optimized: Parallel save operations
      await Promise.all([
        dbService.saveFileVersion(targetFile.id, targetFile.content),
        (async () => {
          const updatedFile = {
            ...targetFile,
            content: targetVersion.content,
            updatedAt: Date.now()
          };
          
          await dbService.saveFile(updatedFile);
          
          const project = get().currentProject;
          if (project) {
            const updatedProject = { ...project, lastModified: Date.now() };
            await dbService.saveProject(updatedProject);
          }
          
          // Update state directly
          set((state) => ({
            files: state.files.map(f => f.id === targetFile!.id ? {
              ...f,
              content: targetVersion!.content,
              updatedAt: Date.now()
            } : f),
            isLoading: false
          }));
        })()
      ]);
    } catch (error: any) {
      set({ error: error.message, isLoading: false });
      throw error;
    }
  }
}));
