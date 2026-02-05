import { create } from 'zustand';
import { readDir, readTextFile, writeTextFile, createDir, removeDir, removeFile, renameFile } from '@tauri-apps/api/fs';
import { open as openDialog, save as saveDialog } from '@tauri-apps/api/dialog';
import { join, dirname } from '@tauri-apps/api/path';

export interface FileNode {
  name: string;
  path: string;
  type: 'file' | 'directory';
  children?: FileNode[];
  isExpanded?: boolean;
  isLoading?: boolean;
}

interface FileSystemState {
  // Current folder
  currentFolder: string | null;
  fileTree: FileNode[];
  isLoading: boolean;
  expandedFolders: Set<string>;
  selectedPath: string | null;
  
  // Actions
  openFolder: () => Promise<void>;
  loadFolder: (path: string) => Promise<void>;
  refreshFolder: () => Promise<void>;
  toggleFolder: (path: string) => Promise<void>;
  selectPath: (path: string | null) => void;
  createNewFile: (parentPath: string, name: string) => Promise<void>;
  createNewFolder: (parentPath: string, name: string) => Promise<void>;
  deleteItem: (path: string) => Promise<void>;
  renameItem: (oldPath: string, newName: string) => Promise<void>;
  openFile: () => Promise<{ path: string; content: string; name: string } | null>;
  saveFile: (path: string, content: string) => Promise<void>;
  saveFileAs: (content: string, defaultName?: string) => Promise<{ path: string; name: string } | null>;
  getFileLanguage: (path: string) => string;
}

const getLanguageFromExtension = (ext: string): string => {
  const mapping: Record<string, string> = {
    'js': 'javascript',
    'jsx': 'javascript',
    'ts': 'typescript',
    'tsx': 'typescript',
    'py': 'python',
    'html': 'html',
    'htm': 'html',
    'css': 'css',
    'scss': 'scss',
    'sass': 'sass',
    'less': 'less',
    'json': 'json',
    'xml': 'xml',
    'md': 'markdown',
    'java': 'java',
    'c': 'c',
    'cpp': 'cpp',
    'cc': 'cpp',
    'cxx': 'cpp',
    'h': 'c',
    'hpp': 'cpp',
    'cs': 'csharp',
    'go': 'go',
    'rs': 'rust',
    'rb': 'ruby',
    'php': 'php',
    'sql': 'sql',
    'sh': 'shell',
    'bash': 'shell',
    'zsh': 'shell',
    'ps1': 'powershell',
    'yaml': 'yaml',
    'yml': 'yaml',
    'toml': 'toml',
    'lua': 'lua',
    'r': 'r',
    'swift': 'swift',
    'kt': 'kotlin',
    'dart': 'dart',
    'vue': 'vue',
    'svelte': 'svelte',
    'graphql': 'graphql',
    'gql': 'graphql',
    'dockerfile': 'dockerfile',
    'makefile': 'makefile',
    'vim': 'vim',
    'elm': 'elm',
    'erl': 'erlang',
    'ex': 'elixir',
    'fs': 'fsharp',
    'hs': 'haskell',
    'jl': 'julia',
    'ml': 'ocaml',
    'nim': 'nim',
    'scala': 'scala',
    'clj': 'clojure',
    'cljs': 'clojure',
    'coffee': 'coffeescript',
    'pl': 'perl',
    'pm': 'perl',
  };
  return mapping[ext.toLowerCase()] || 'plaintext';
};

const shouldShowFile = (name: string): boolean => {
  const hiddenPatterns = ['.git', '.svn', '.hg', 'node_modules', '.DS_Store', 'Thumbs.db'];
  return !hiddenPatterns.some(pattern => name.startsWith(pattern));
};

export const useFileSystemStore = create<FileSystemState>((set, get) => ({
  currentFolder: null,
  fileTree: [],
  isLoading: false,
  expandedFolders: new Set(),
  selectedPath: null,

  openFolder: async () => {
    try {
      const selected = await openDialog({
        directory: true,
        multiple: false,
        title: 'Open Folder'
      });
      
      if (selected && typeof selected === 'string') {
        await get().loadFolder(selected);
      }
    } catch (error) {
      console.error('Error opening folder:', error);
    }
  },

  loadFolder: async (path: string) => {
    set({ isLoading: true, currentFolder: path });
    
    try {
      const entries = await readDir(path);
      const nodes: FileNode[] = [];
      
      for (const entry of entries) {
        if (!shouldShowFile(entry.name || '')) continue;
        
        const fullPath = await join(path, entry.name || '');
        
        if (entry.children) {
          nodes.push({
            name: entry.name || '',
            path: fullPath,
            type: 'directory',
            children: [],
            isExpanded: false,
          });
        } else {
          nodes.push({
            name: entry.name || '',
            path: fullPath,
            type: 'file',
          });
        }
      }
      
      // Sort: directories first, then files
      nodes.sort((a, b) => {
        if (a.type !== b.type) {
          return a.type === 'directory' ? -1 : 1;
        }
        return a.name.localeCompare(b.name);
      });
      
      set({ fileTree: nodes, isLoading: false });
    } catch (error) {
      console.error('Error loading folder:', error);
      set({ isLoading: false });
    }
  },

  refreshFolder: async () => {
    const { currentFolder } = get();
    if (currentFolder) {
      await get().loadFolder(currentFolder);
    }
  },

  toggleFolder: async (path: string) => {
    const { expandedFolders, fileTree } = get();
    const newExpanded = new Set(expandedFolders);
    
    if (newExpanded.has(path)) {
      newExpanded.delete(path);
    } else {
      newExpanded.add(path);
      
      // Load children if not loaded
      const updateTree = async (nodes: FileNode[]): Promise<FileNode[]> => {
        return Promise.all(nodes.map(async (node) => {
          if (node.path === path && node.type === 'directory' && (!node.children || node.children.length === 0)) {
            try {
              const entries = await readDir(path);
              const children: FileNode[] = [];
              
              for (const entry of entries) {
                if (!shouldShowFile(entry.name || '')) continue;
                
                const fullPath = await join(path, entry.name || '');
                
                if (entry.children) {
                  children.push({
                    name: entry.name || '',
                    path: fullPath,
                    type: 'directory',
                    children: [],
                    isExpanded: false,
                  });
                } else {
                  children.push({
                    name: entry.name || '',
                    path: fullPath,
                    type: 'file',
                  });
                }
              }
              
              children.sort((a, b) => {
                if (a.type !== b.type) {
                  return a.type === 'directory' ? -1 : 1;
                }
                return a.name.localeCompare(b.name);
              });
              
              return { ...node, children, isExpanded: true };
            } catch (error) {
              return { ...node, isExpanded: true };
            }
          }
          
          if (node.children) {
            return { ...node, children: await updateTree(node.children) };
          }
          
          return node;
        }));
      };
      
      const newTree = await updateTree(fileTree);
      set({ fileTree: newTree });
    }
    
    set({ expandedFolders: newExpanded });
  },

  selectPath: (path) => set({ selectedPath: path }),

  createNewFile: async (parentPath: string, name: string) => {
    try {
      const filePath = await join(parentPath, name);
      await writeTextFile(filePath, '');
      await get().refreshFolder();
    } catch (error) {
      console.error('Error creating file:', error);
      throw error;
    }
  },

  createNewFolder: async (parentPath: string, name: string) => {
    try {
      const folderPath = await join(parentPath, name);
      await createDir(folderPath);
      await get().refreshFolder();
    } catch (error) {
      console.error('Error creating folder:', error);
      throw error;
    }
  },

  deleteItem: async (path: string) => {
    try {
      // Try to read as dir first
      try {
        await readDir(path);
        await removeDir(path, { recursive: true });
      } catch {
        await removeFile(path);
      }
      
      await get().refreshFolder();
    } catch (error) {
      console.error('Error deleting item:', error);
      throw error;
    }
  },

  renameItem: async (oldPath: string, newName: string) => {
    try {
      const parentDir = await dirname(oldPath);
      const newPath = await join(parentDir, newName);
      await renameFile(oldPath, newPath);
      await get().refreshFolder();
    } catch (error) {
      console.error('Error renaming item:', error);
      throw error;
    }
  },

  openFile: async () => {
    try {
      const selected = await openDialog({
        multiple: false,
        title: 'Open File',
        filters: [
          { name: 'All Files', extensions: ['*'] },
          { name: 'Text Files', extensions: ['txt', 'md', 'json', 'xml', 'yaml', 'yml'] },
          { name: 'Code Files', extensions: ['js', 'ts', 'jsx', 'tsx', 'py', 'html', 'css', 'java', 'cpp', 'c', 'h', 'go', 'rs', 'rb', 'php'] },
        ]
      });
      
      if (selected && typeof selected === 'string') {
        const content = await readTextFile(selected);
        const name = selected.split('/').pop() || selected;
        return { path: selected, content, name };
      }
      
      return null;
    } catch (error) {
      console.error('Error opening file:', error);
      return null;
    }
  },

  saveFile: async (path: string, content: string) => {
    try {
      await writeTextFile(path, content);
    } catch (error) {
      console.error('Error saving file:', error);
      throw error;
    }
  },

  saveFileAs: async (content: string, defaultName?: string) => {
    try {
      const selected = await saveDialog({
        defaultPath: defaultName || 'untitled',
        filters: [
          { name: 'All Files', extensions: ['*'] },
          { name: 'Text', extensions: ['txt'] },
          { name: 'JavaScript', extensions: ['js'] },
          { name: 'TypeScript', extensions: ['ts'] },
          { name: 'JSON', extensions: ['json'] },
          { name: 'HTML', extensions: ['html', 'htm'] },
          { name: 'CSS', extensions: ['css'] },
          { name: 'Python', extensions: ['py'] },
          { name: 'Markdown', extensions: ['md'] },
        ]
      });
      
      if (selected && typeof selected === 'string') {
        await writeTextFile(selected, content);
        const name = selected.split('/').pop() || selected;
        return { path: selected, name };
      }
      
      return null;
    } catch (error) {
      console.error('Error saving file:', error);
      return null;
    }
  },

  getFileLanguage: (path: string) => {
    const ext = path.split('.').pop() || '';
    return getLanguageFromExtension(ext);
  },
}));
