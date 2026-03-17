import { useEffect, useState } from 'react';
import { useWorkspaceStore } from '../store/useWorkspaceStore';
import { dbService, WorkspaceFile } from '../services/db';

export function useFileSystem() {
  const { 
    files, 
    createFile, 
    updateFile, 
    deleteFile, 
    deleteFolder,
    isLoading,
    error 
  } = useWorkspaceStore();

  const currentProject = useWorkspaceStore((state) => state.currentProject);

  return {
    files,
    isLoading,
    error,
    createFile: (path: string, type: 'file' | 'folder', content: string = '') => {
      if (!currentProject) throw new Error('No current project');
      return createFile(currentProject.id, path, type, content);
    },
    updateFile: (id: string, content: string) => updateFile(id, content),
    deleteFile: (id: string) => deleteFile(id),
    deleteFolder: (path: string) => {
      if (!currentProject) throw new Error('No current project');
      return deleteFolder(currentProject.id, path);
    },
    getFile: (path: string) => files.find(f => f.path === path),
    listContents: (dirPath: string) => files.filter(f => f.path.startsWith(`${dirPath}/`) && f.path.split('/').length === dirPath.split('/').length + 1),
    resolvePath: (basePath: string, relativePath: string) => {
      // Very basic path resolution logic
      if (relativePath.startsWith('/')) return relativePath;
      const parts = basePath.split('/');
      parts.pop(); // Remove the filename from base
      const relParts = relativePath.split('/');
      
      for (const part of relParts) {
        if (part === '..') {
          parts.pop();
        } else if (part !== '.') {
          parts.push(part);
        }
      }
      return parts.join('/');
    }
  };
}

export function useCurrentProject() {
  const { 
    currentProject, 
    projects, 
    loadProjects, 
    createProject, 
    setCurrentProject, 
    deleteProject 
  } = useWorkspaceStore();

  useEffect(() => {
    loadProjects();
  }, [loadProjects]);

  return {
    projects,
    currentProject,
    createProject,
    setCurrentProject,
    deleteProject
  };
}

export function useFileWatcher(path: string) {
  const files = useWorkspaceStore((state) => state.files);
  const [file, setFile] = useState<WorkspaceFile | undefined>(undefined);

  useEffect(() => {
    const foundFile = files.find(f => f.path === path);
    setFile(foundFile);
  }, [files, path]);

  return file;
}

export function useStorageQuota() {
  const [quota, setQuota] = useState<{ usage: number; quota: number } | null>(null);

  useEffect(() => {
    const checkQuota = async () => {
      try {
        const estimate = await dbService.getStorageQuota();
        if (estimate && estimate.usage !== undefined && estimate.quota !== undefined) {
          setQuota({
            usage: estimate.usage,
            quota: estimate.quota
          });
        }
      } catch (error) {
        console.error('Failed to get storage quota', error);
      }
    };

    checkQuota();
    // Refresh periodically
    const interval = setInterval(checkQuota, 60000);
    return () => clearInterval(interval);
  }, []);

  const formatBytes = (bytes: number) => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  return {
    ...quota,
    formattedUsage: quota ? formatBytes(quota.usage) : 'Unknown',
    formattedQuota: quota ? formatBytes(quota.quota) : 'Unknown',
    percentUsed: quota && quota.quota > 0 ? (quota.usage / quota.quota) * 100 : 0
  };
}
