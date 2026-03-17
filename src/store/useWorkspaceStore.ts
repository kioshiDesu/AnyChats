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
      
      const projects = await dbService.getProjects();
      set({ projects, isLoading: false });
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
      const project = await dbService.getProject(id);
      if (project) {
        set({ currentProject: project });
        await get().loadFiles(id);
      } else {
        set({ currentProject: null, files: [], error: 'Project not found' });
      }
    } catch (error: any) {
      set({ error: error.message, isLoading: false });
    } finally {
      set({ isLoading: false });
    }
  },

  deleteProject: async (id: string) => {
    set({ isLoading: true, error: null });
    try {
      await dbService.deleteProject(id);
      const projects = await dbService.getProjects();
      
      let updateState: Partial<WorkspaceState> = { projects, isLoading: false };
      
      if (get().currentProject?.id === id) {
        updateState.currentProject = null;
        updateState.files = [];
      }
      
      set(updateState);
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
      // Check if file already exists
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
      
      // Update project last modified
      const project = await dbService.getProject(projectId);
      if (project) {
        project.lastModified = Date.now();
        await dbService.saveProject(project);
      }

      await get().loadFiles(projectId);
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

      if (saveVersion && file.content !== content) {
        await dbService.saveFileVersion(id, file.content);
      }

      const updatedFile = {
        ...file,
        content,
        updatedAt: Date.now()
      };
      
      await dbService.saveFile(updatedFile);
      
      // Update project last modified
      const project = await dbService.getProject(file.projectId);
      if (project) {
        project.lastModified = Date.now();
        await dbService.saveProject(project);
      }
      
      await get().loadFiles(file.projectId);
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

      await dbService.deleteFileVersions(id);
      await dbService.deleteFile(id);
      
      // Update project last modified
      const project = await dbService.getProject(file.projectId);
      if (project) {
        project.lastModified = Date.now();
        await dbService.saveProject(project);
      }

      await get().loadFiles(file.projectId);
    } catch (error: any) {
      set({ error: error.message, isLoading: false });
    }
  },

  deleteFolder: async (projectId: string, path: string) => {
    set({ isLoading: true, error: null });
    try {
      const files = await dbService.getFiles(projectId);
      const toDelete = files.filter(f => f.path === path || f.path.startsWith(`${path}/`));
      
      for (const file of toDelete) {
        await dbService.deleteFile(file.id);
      }
      
      // Update project last modified
      const project = await dbService.getProject(projectId);
      if (project) {
        project.lastModified = Date.now();
        await dbService.saveProject(project);
      }
      
      await get().loadFiles(projectId);
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

      for (const file of files) {
        const versions = await dbService.getFileVersions(file.id);
        const version = versions.find(v => v.id === versionId);
        if (version) {
          targetFile = file;
          targetVersion = version;
          break;
        }
      }

      if (!targetFile || !targetVersion) {
        throw new Error('Version not found');
      }

      await dbService.saveFileVersion(targetFile.id, targetFile.content);

      const updatedFile = {
        ...targetFile,
        content: targetVersion.content,
        updatedAt: Date.now()
      };
      
      await dbService.saveFile(updatedFile);
      
      const project = await dbService.getProject(targetFile.projectId);
      if (project) {
        project.lastModified = Date.now();
        await dbService.saveProject(project);
      }
      
      await get().loadFiles(targetFile.projectId);
    } catch (error: any) {
      set({ error: error.message, isLoading: false });
      throw error;
    }
  }
}));
