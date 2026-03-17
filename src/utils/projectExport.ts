import JSZip from 'jszip';
import { dbService, WorkspaceFile } from '../services/db';
import { useWorkspaceStore } from '../store/useWorkspaceStore';

const generateId = () => {
  return typeof crypto !== 'undefined' && crypto.randomUUID
    ? crypto.randomUUID()
    : Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
};

export async function exportProjectAsZip(projectId: string, projectName: string) {
  const files = await dbService.getFiles(projectId);
  
  const zip = new JSZip();
  
  files.forEach((file) => {
    if (file.type === 'file' && file.content) {
      zip.file(file.path, file.content);
    } else if (file.type === 'folder') {
      zip.folder(file.path);
    }
  });

  const content = await zip.generateAsync({ type: 'blob' });
  const url = URL.createObjectURL(content);
  
  const a = document.createElement('a');
  a.href = url;
  a.download = `${projectName.toLowerCase().replace(/\s+/g, '-')}.zip`;
  a.click();
  
  URL.revokeObjectURL(url);
}

export async function exportProjectAsSingleFile(projectId: string, projectName: string) {
  const files = await dbService.getFiles(projectId);
  
  let result = `Project: ${projectName}\n\n`;
  
  files.forEach((file) => {
    if (file.type === 'file' && file.content) {
      result += `--- ${file.path} ---\n`;
      result += `${file.content}\n\n`;
    }
  });

  const blob = new Blob([result], { type: 'text/plain' });
  const url = URL.createObjectURL(blob);
  
  const a = document.createElement('a');
  a.href = url;
  a.download = `${projectName.toLowerCase().replace(/\s+/g, '-')}.txt`;
  a.click();
  
  URL.revokeObjectURL(url);
}

export async function importProjectFromZip(file: File) {
  try {
    const zip = new JSZip();
    const contents = await zip.loadAsync(file);
    
    const projectName = file.name.replace(/\.zip$/i, '');
    const { createProject } = useWorkspaceStore.getState();
    const project = await createProject(projectName);
    const projectId = project.id;
    
    // Process files
    const fileOperations: Promise<any>[] = [];
    
    contents.forEach((relativePath, zipEntry) => {
      if (!zipEntry.dir) {
        fileOperations.push(
          zipEntry.async('text').then((content) => {
            const newFile: WorkspaceFile = {
              id: generateId(),
              projectId,
              path: relativePath,
              type: 'file',
              content,
              createdAt: Date.now(),
              updatedAt: Date.now(),
            };
            return dbService.saveFile(newFile);
          })
        );
      }
    });
    
    await Promise.all(fileOperations);
    
    // Refresh current project files
    useWorkspaceStore.getState().setCurrentProject(projectId);
    
    return true;
  } catch (error) {
    console.error("Error importing ZIP:", error);
    throw new Error("Failed to import ZIP file.");
  }
}

export async function importProjectFromGitHub(repoUrl: string) {
  try {
    let repoPath = repoUrl;
    if (repoUrl.includes('github.com')) {
      const urlObj = new URL(repoUrl);
      repoPath = urlObj.pathname.slice(1);
    }
    repoPath = repoPath.replace(/\.git$/, '');
    
    if (!repoPath || repoPath.split('/').length < 2) {
      throw new Error("Invalid GitHub repository URL. Expected format: user/repo");
    }

    const [owner, repo] = repoPath.split('/');
    const zipUrl = `https://corsproxy.io/?https://github.com/${owner}/${repo}/archive/refs/heads/main.zip`;
    
    let response = await fetch(zipUrl);
    if (!response.ok) {
      const masterUrl = `https://corsproxy.io/?https://github.com/${owner}/${repo}/archive/refs/heads/master.zip`;
      response = await fetch(masterUrl);
      if (!response.ok) {
        throw new Error("Could not fetch repository archive. Is it public?");
      }
    }
    
    return await importZipFromBuffer(await response.arrayBuffer(), repo);
    
  } catch (error: any) {
    console.error("Error importing from GitHub:", error);
    throw new Error(error.message || "Failed to import from GitHub.");
  }
}

async function importZipFromBuffer(buffer: ArrayBuffer, projectName: string) {
  const zip = new JSZip();
  const contents = await zip.loadAsync(buffer);
  
  const { createProject } = useWorkspaceStore.getState();
  const project = await createProject(projectName);
  const projectId = project.id;
  
  const fileOperations: Promise<any>[] = [];
  
  let rootDir = "";
  for (const relativePath in contents.files) {
    if (contents.files[relativePath].dir) {
       rootDir = relativePath;
       break;
    }
  }

  contents.forEach((relativePath, zipEntry) => {
    if (!zipEntry.dir) {
      let finalPath = relativePath;
      if (rootDir && relativePath.startsWith(rootDir)) {
        finalPath = relativePath.slice(rootDir.length);
      }
      
      fileOperations.push(
        zipEntry.async('text').then((content) => {
          const newFile: WorkspaceFile = {
            id: generateId(),
            projectId,
            path: finalPath,
            type: 'file',
            content,
            createdAt: Date.now(),
            updatedAt: Date.now(),
          };
          return dbService.saveFile(newFile);
        })
      );
    }
  });
  
  await Promise.all(fileOperations);
  useWorkspaceStore.getState().setCurrentProject(projectId);
  return true;
}