import { openDB, DBSchema, IDBPDatabase } from 'idb';

const generateId = () => {
  return typeof crypto !== 'undefined' && crypto.randomUUID
    ? crypto.randomUUID()
    : Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
};

export interface WorkspaceProject {
  id: string;
  name: string;
  createdAt: number;
  lastModified: number;
}

export interface WorkspaceFile {
  id: string;
  projectId: string;
  path: string;
  content: string;
  type: 'file' | 'folder';
  createdAt: number;
  updatedAt: number;
}

export interface WorkspaceSetting {
  key: string;
  value: any;
}

export interface FileVersion {
  id: string;
  fileId: string;
  content: string;
  createdAt: number;
}

export interface ProjectWorkspaceDB extends DBSchema {
  projects: {
    key: string;
    value: WorkspaceProject;
  };
  files: {
    key: string;
    value: WorkspaceFile;
    indexes: {
      'by-project': string;
      'by-project-path': [string, string];
    };
  };
  settings: {
    key: string;
    value: WorkspaceSetting;
  };
  fileVersions: {
    key: string;
    value: FileVersion;
    indexes: { 'by-file': string };
  };
}

let dbPromise: Promise<IDBPDatabase<ProjectWorkspaceDB>> | null = null;

export function initDB() {
  if (!dbPromise) {
    dbPromise = openDB<ProjectWorkspaceDB>('ProjectWorkspace', 2, {
      upgrade(db, oldVersion) {
        if (!db.objectStoreNames.contains('projects')) {
          db.createObjectStore('projects', { keyPath: 'id' });
        }
        if (!db.objectStoreNames.contains('files')) {
          const fileStore = db.createObjectStore('files', { keyPath: 'id' });
          fileStore.createIndex('by-project', 'projectId');
          fileStore.createIndex('by-project-path', ['projectId', 'path']);
        }
        if (!db.objectStoreNames.contains('settings')) {
          db.createObjectStore('settings', { keyPath: 'key' });
        }
        if (oldVersion < 2 && !db.objectStoreNames.contains('fileVersions')) {
          const versionStore = db.createObjectStore('fileVersions', { keyPath: 'id' });
          versionStore.createIndex('by-file', 'fileId');
        }
      },
    });
  }
  return dbPromise;
}

  // Virtual File System Database Actions
  export const dbService = {
  async getProjects() {
    const db = await initDB();
    return db.getAll('projects');
  },
  
  async getProject(id: string) {
    const db = await initDB();
    return db.get('projects', id);
  },
  
  async saveProject(project: WorkspaceProject) {
    const db = await initDB();
    try {
      return await db.put('projects', project);
    } catch (error: any) {
      if (error.name === 'QuotaExceededError') {
        throw new Error('Storage quota exceeded. Please delete some projects to free up space.');
      }
      throw error;
    }
  },
  
  async deleteProject(id: string) {
    const db = await initDB();
    const tx = db.transaction(['projects', 'files'], 'readwrite');
    await tx.objectStore('projects').delete(id);
    
    // Delete all files in the project
    const fileStore = tx.objectStore('files');
    const index = fileStore.index('by-project');
    const cursor = await index.openCursor(id);
    let current = cursor;
    while (current) {
      await current.delete();
      current = await current.continue();
    }
    await tx.done;
  },
  
  async getFiles(projectId: string) {
    const db = await initDB();
    return db.getAllFromIndex('files', 'by-project', projectId);
  },
  
  async getFilesMetadata(projectId: string): Promise<Omit<WorkspaceFile, 'content'>[]> {
    const db = await initDB();
    const index = db.transaction('files').store.index('by-project');
    const files: Omit<WorkspaceFile, 'content'>[] = [];
    let cursor = await index.openCursor(projectId);
    while (cursor) {
      const { content, ...metadata } = cursor.value;
      files.push(metadata);
      cursor = await cursor.continue();
    }
    return files;
  },
  
  async getFile(projectId: string, path: string) {
    const db = await initDB();
    return db.getFromIndex('files', 'by-project-path', [projectId, path]);
  },
  
  async saveFile(file: WorkspaceFile) {
    const db = await initDB();
    try {
      return await db.put('files', file);
    } catch (error: any) {
      if (error.name === 'QuotaExceededError') {
        throw new Error('Storage quota exceeded. Please free up some space.');
      }
      throw error;
    }
  },
  
  async deleteFile(id: string) {
    const db = await initDB();
    return db.delete('files', id);
  },
  
  async getSetting(key: string) {
    const db = await initDB();
    return db.get('settings', key);
  },
  
  async saveSetting(setting: WorkspaceSetting) {
    const db = await initDB();
    return db.put('settings', setting);
  },
  
  async getStorageQuota() {
    if (navigator.storage && navigator.storage.estimate) {
      return await navigator.storage.estimate();
    }
    return null;
  },

  async clearAll() {
    const db = await initDB();
    const tx = db.transaction(['projects', 'files', 'settings', 'fileVersions'], 'readwrite');
    await tx.objectStore('projects').clear();
    await tx.objectStore('files').clear();
    await tx.objectStore('settings').clear();
    await tx.objectStore('fileVersions').clear();
    await tx.done;
  },

  async saveFileVersion(fileId: string, content: string) {
    const db = await initDB();
    const version: FileVersion = {
      id: generateId(),
      fileId,
      content,
      createdAt: Date.now(),
    };
    await db.put('fileVersions', version);
    await dbService.cleanupOldVersions(fileId, 5);
  },

  async getFileVersions(fileId: string): Promise<FileVersion[]> {
    const db = await initDB();
    const versions = await db.getAllFromIndex('fileVersions', 'by-file', fileId);
    return versions.sort((a, b) => b.createdAt - a.createdAt);
  },

  async getLatestVersion(fileId: string): Promise<FileVersion | undefined> {
    const versions = await dbService.getFileVersions(fileId);
    return versions[0];
  },

  async cleanupOldVersions(fileId: string, keepCount: number = 5) {
    const db = await initDB();
    const versions = await dbService.getFileVersions(fileId);
    if (versions.length > keepCount) {
      const toDelete = versions.slice(keepCount);
      const tx = db.transaction('fileVersions', 'readwrite');
      for (const v of toDelete) {
        await tx.store.delete(v.id);
      }
      await tx.done;
    }
  },

  async deleteFileVersions(fileId: string) {
    const db = await initDB();
    const versions = await dbService.getFileVersions(fileId);
    const tx = db.transaction('fileVersions', 'readwrite');
    for (const v of versions) {
      await tx.store.delete(v.id);
    }
    await tx.done;
  },
};
