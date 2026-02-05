import { useState } from 'react';
import { 
  FolderOpen, 
  Search, 
  GitBranch, 
  Settings, 
  FileJson,
  ChevronRight,
  ChevronDown,
  Plus,
  RefreshCw,
} from 'lucide-react';
import { useEditorStore } from '../../stores/editorStore';
import { useFileSystemStore, FileNode } from '../../stores/fileSystemStore';
import { getFileIcon } from '../../utils/helpers';

interface SidebarProps {
  width?: number;
}

const Sidebar = ({ width = 250 }: SidebarProps) => {
  const { sidebarView, setSidebarView } = useEditorStore();

  const views = [
    { id: 'explorer', icon: FolderOpen, label: 'Explorer' },
    { id: 'search', icon: Search, label: 'Search' },
    { id: 'json-viewer', icon: FileJson, label: 'JSON' },
    { id: 'git', icon: GitBranch, label: 'Source Control' },
  ] as const;

  return (
    <div className="flex h-full" style={{ width }}>
      {/* Activity Bar */}
      <div className="w-12 bg-secondary border-r border-border-color flex flex-col items-center py-2 gap-1">
        {views.map((view) => (
          <button
            key={view.id}
            onClick={() => setSidebarView(view.id)}
            className={`p-2 rounded transition-colors ${
              sidebarView === view.id
                ? 'text-white border-l-2 border-accent bg-active'
                : 'text-text-secondary hover:text-text-primary hover:bg-hover'
            }`}
            title={view.label}
          >
            <view.icon size={24} />
          </button>
        ))}
        <div className="flex-1" />
        <button
          onClick={() => useEditorStore.getState().toggleSettings()}
          className="p-2 rounded text-text-secondary hover:text-text-primary hover:bg-hover transition-colors"
          title="Settings"
        >
          <Settings size={24} />
        </button>
      </div>

      {/* Sidebar Content */}
      <div className="flex-1 bg-secondary flex flex-col min-w-0">
        {sidebarView === 'explorer' && <FileExplorer />}
        {sidebarView === 'search' && <SearchPanel />}
        {sidebarView === 'json-viewer' && <JsonViewerPanel />}
        {sidebarView === 'git' && <GitPanel />}
      </div>
    </div>
  );
};

// File Explorer Component
const FileExplorer = () => {
  const { 
    currentFolder, 
    fileTree, 
    isLoading, 
    expandedFolders, 
    selectedPath,
    openFolder, 
    loadFolder,
    refreshFolder,
    toggleFolder, 
    selectPath,
    createNewFile,
    createNewFolder,
    deleteItem,
    renameItem,
  } = useFileSystemStore();
  
  const { addTab, recentFolders } = useEditorStore();
  const [contextMenu, setContextMenu] = useState<{ x: number; y: number; node: FileNode | null } | null>(null);
  const [isCreating, setIsCreating] = useState<'file' | 'folder' | null>(null);
  const [newItemName, setNewItemName] = useState('');
  const [renamingNode, setRenamingNode] = useState<FileNode | null>(null);
  const [renameValue, setRenameValue] = useState('');

  const handleFileClick = async (node: FileNode) => {
    if (node.type === 'directory') {
      toggleFolder(node.path);
    } else {
      selectPath(node.path);
      try {
        const { readTextFile } = await import('@tauri-apps/api/fs');
        const content = await readTextFile(node.path);
        const name = node.path.split('/').pop() || node.path;
        const { useFileSystemStore } = await import('../../stores/fileSystemStore');
        const language = useFileSystemStore.getState().getFileLanguage(node.path);
        
        addTab({
          path: node.path,
          name,
          content,
          isDirty: false,
          language,
        });
      } catch (error) {
        console.error('Error opening file:', error);
      }
    }
  };

  const handleContextMenu = (e: React.MouseEvent, node: FileNode) => {
    e.preventDefault();
    e.stopPropagation();
    setContextMenu({ x: e.clientX, y: e.clientY, node });
  };

  const handleCreateNew = async (type: 'file' | 'folder') => {
    if (!newItemName.trim()) return;
    
    try {
      const parentPath = contextMenu?.node?.type === 'directory' 
        ? contextMenu.node.path 
        : currentFolder!;
      
      if (type === 'file') {
        await createNewFile(parentPath, newItemName);
      } else {
        await createNewFolder(parentPath, newItemName);
      }
      
      setIsCreating(null);
      setNewItemName('');
      setContextMenu(null);
    } catch (error) {
      console.error('Error creating item:', error);
    }
  };

  const handleRename = async () => {
    if (!renamingNode || !renameValue.trim()) return;
    
    try {
      await renameItem(renamingNode.path, renameValue);
      setRenamingNode(null);
      setRenameValue('');
    } catch (error) {
      console.error('Error renaming item:', error);
    }
  };

  const handleDelete = async () => {
    if (!contextMenu?.node) return;
    
    if (confirm(`Are you sure you want to delete "${contextMenu.node.name}"?`)) {
      try {
        await deleteItem(contextMenu.node.path);
        setContextMenu(null);
      } catch (error) {
        console.error('Error deleting item:', error);
      }
    }
  };

  const renderNode = (node: FileNode, depth: number = 0) => {
    const isExpanded = expandedFolders.has(node.path);
    const isSelected = selectedPath === node.path;
    const paddingLeft = depth * 12 + 8;

    if (renamingNode?.path === node.path) {
      return (
        <div 
          key={node.path}
          className="flex items-center py-1 px-2"
          style={{ paddingLeft }}
        >
          <span className="mr-1">{node.type === 'directory' ? '📁' : getFileIcon(node.name)}</span>
          <input
            type="text"
            value={renameValue}
            onChange={(e) => setRenameValue(e.target.value)}
            onBlur={handleRename}
            onKeyDown={(e) => e.key === 'Enter' && handleRename()}
            autoFocus
            className="flex-1 bg-primary text-text-primary text-sm px-2 py-0.5 rounded outline-none border border-accent"
          />
        </div>
      );
    }

    return (
      <div key={node.path}>
        <div
          className={`flex items-center py-1 px-2 cursor-pointer text-sm ${
            isSelected ? 'bg-accent text-white' : 'hover:bg-hover text-text-primary'
          }`}
          style={{ paddingLeft }}
          onClick={() => handleFileClick(node)}
          onContextMenu={(e) => handleContextMenu(e, node)}
        >
          {node.type === 'directory' && (
            <span className="mr-1 text-text-secondary">
              {isExpanded ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
            </span>
          )}
          <span className="mr-2">{node.type === 'directory' ? (isExpanded ? '📂' : '📁') : getFileIcon(node.name)}</span>
          <span className="truncate">{node.name}</span>
        </div>
        
        {node.type === 'directory' && isExpanded && node.children && (
          <div>
            {node.children.map(child => renderNode(child, depth + 1))}
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center justify-between px-3 py-2 border-b border-border-color">
        <span className="text-xs font-semibold text-text-secondary uppercase tracking-wider">Explorer</span>
        <div className="flex gap-1">
          <button 
            onClick={() => setIsCreating('file')}
            className="p-1 hover:bg-hover rounded text-text-secondary"
            title="New File"
          >
            <Plus size={16} />
          </button>
          <button 
            onClick={refreshFolder}
            className="p-1 hover:bg-hover rounded text-text-secondary"
            title="Refresh"
          >
            <RefreshCw size={16} />
          </button>
        </div>
      </div>

      {/* Folder Info or No Folder */}
      {currentFolder ? (
        <div className="flex-1 overflow-y-auto">
          <div className="px-3 py-2 text-sm font-medium text-text-secondary uppercase truncate">
            {currentFolder.split('/').pop()}
          </div>
          {isLoading ? (
            <div className="flex items-center justify-center py-8 text-text-secondary">
              <RefreshCw className="animate-spin mr-2" size={16} />
              Loading...
            </div>
          ) : (
            <div>
              {fileTree.map(node => renderNode(node))}
            </div>
          )}
        </div>
      ) : (
        <div className="flex-1 flex flex-col items-center justify-center p-4 text-center">
          <p className="text-text-secondary mb-4 text-sm">You have not yet opened a folder.</p>
          <button
            onClick={openFolder}
            className="px-4 py-2 bg-accent hover:bg-accent-hover text-white rounded text-sm transition-colors"
          >
            Open Folder
          </button>
          {recentFolders.length > 0 && (
            <div className="mt-4 w-full">
              <p className="text-text-secondary text-xs mb-2">Recent Folders:</p>
              {recentFolders.slice(0, 5).map(folder => (
                <button
                  key={folder}
                  onClick={() => loadFolder(folder)}
                  className="block w-full text-left px-2 py-1 text-xs text-text-secondary hover:text-text-primary hover:bg-hover rounded truncate"
                >
                  {folder}
                </button>
              ))}
            </div>
          )}
        </div>
      )}

      {/* New File/Folder Input */}
      {isCreating && (
        <div className="px-3 py-2 border-t border-border-color bg-tertiary">
          <div className="flex items-center gap-2">
            <span>{isCreating === 'file' ? '📄' : '📁'}</span>
            <input
              type="text"
              placeholder={`New ${isCreating} name...`}
              value={newItemName}
              onChange={(e) => setNewItemName(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') handleCreateNew(isCreating);
                if (e.key === 'Escape') {
                  setIsCreating(null);
                  setNewItemName('');
                }
              }}
              autoFocus
              className="flex-1 bg-primary text-text-primary text-sm px-2 py-1 rounded outline-none border border-border-color"
            />
          </div>
        </div>
      )}

      {/* Context Menu */}
      {contextMenu && (
        <>
          <div 
            className="fixed inset-0 z-40"
            onClick={() => setContextMenu(null)}
          />
          <div
            className="fixed z-50 bg-tertiary border border-border-color rounded shadow-lg py-1 min-w-[150px]"
            style={{ top: contextMenu.y, left: contextMenu.x }}
          >
            <button
              onClick={() => {
                setIsCreating('file');
                setContextMenu(null);
              }}
              className="w-full text-left px-3 py-1.5 text-sm hover:bg-hover text-text-primary"
            >
              New File
            </button>
            <button
              onClick={() => {
                setIsCreating('folder');
                setContextMenu(null);
              }}
              className="w-full text-left px-3 py-1.5 text-sm hover:bg-hover text-text-primary"
            >
              New Folder
            </button>
            <div className="border-t border-border-color my-1" />
            <button
              onClick={() => {
                if (contextMenu.node) {
                  setRenamingNode(contextMenu.node);
                  setRenameValue(contextMenu.node.name);
                  setContextMenu(null);
                }
              }}
              className="w-full text-left px-3 py-1.5 text-sm hover:bg-hover text-text-primary"
            >
              Rename
            </button>
            <button
              onClick={handleDelete}
              className="w-full text-left px-3 py-1.5 text-sm hover:bg-hover text-red-400"
            >
              Delete
            </button>
          </div>
        </>
      )}
    </div>
  );
};

// Search Panel Component
const SearchPanel = () => {
  const { 
    searchQuery, 
    setSearchQuery, 
    searchResults,
    clearSearch,
  } = useEditorStore();
  
  const [replaceQuery, setReplaceQuery] = useState('');
  const [caseSensitive, setCaseSensitive] = useState(false);
  const [wholeWord, setWholeWord] = useState(false);
  const [useRegex, setUseRegex] = useState(false);

  const handleSearch = async () => {
    if (!searchQuery) return;
    
    // Implement search across files
    // This is a placeholder - full implementation would search actual files
    console.log('Searching for:', searchQuery);
  };

  return (
    <div className="flex flex-col h-full p-3">
      <div className="text-xs font-semibold text-text-secondary uppercase tracking-wider mb-3">Search</div>
      
      <div className="space-y-2">
        <div className="relative">
          <Search className="absolute left-2 top-2 text-text-secondary" size={14} />
          <input
            type="text"
            placeholder="Search"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
            className="w-full bg-primary text-text-primary text-sm pl-8 pr-2 py-1.5 rounded outline-none border border-border-color focus:border-accent"
          />
        </div>
        
        <div className="relative">
          <input
            type="text"
            placeholder="Replace"
            value={replaceQuery}
            onChange={(e) => setReplaceQuery(e.target.value)}
            className="w-full bg-primary text-text-primary text-sm px-2 py-1.5 rounded outline-none border border-border-color focus:border-accent"
          />
        </div>

        <div className="flex flex-wrap gap-1">
          <button
            onClick={() => setCaseSensitive(!caseSensitive)}
            className={`px-2 py-1 text-xs rounded ${caseSensitive ? 'bg-accent text-white' : 'bg-tertiary text-text-secondary'}`}
            title="Match Case"
          >
            Aa
          </button>
          <button
            onClick={() => setWholeWord(!wholeWord)}
            className={`px-2 py-1 text-xs rounded ${wholeWord ? 'bg-accent text-white' : 'bg-tertiary text-text-secondary'}`}
            title="Match Whole Word"
          >
            ab
          </button>
          <button
            onClick={() => setUseRegex(!useRegex)}
            className={`px-2 py-1 text-xs rounded ${useRegex ? 'bg-accent text-white' : 'bg-tertiary text-text-secondary'}`}
            title="Use Regular Expression"
          >
            .*
          </button>
        </div>

        <div className="flex gap-2 pt-2">
          <button
            onClick={handleSearch}
            className="flex-1 px-3 py-1.5 bg-accent hover:bg-accent-hover text-white text-sm rounded transition-colors"
          >
            Find All
          </button>
          <button
            onClick={() => { clearSearch(); setReplaceQuery(''); }}
            className="px-3 py-1.5 bg-tertiary hover:bg-hover text-text-primary text-sm rounded transition-colors"
          >
            Clear
          </button>
        </div>
      </div>

      {/* Results */}
      {searchResults.length > 0 && (
        <div className="flex-1 mt-4 overflow-y-auto">
          <div className="text-xs text-text-secondary mb-2">
            {searchResults.length} results
          </div>
          {searchResults.map((result, idx) => (
            <div
              key={idx}
              className="p-2 hover:bg-hover cursor-pointer text-sm border-l-2 border-transparent hover:border-accent"
            >
              <div className="text-text-secondary text-xs truncate">{result.filePath}</div>
              <div className="text-text-primary truncate">{result.preview}</div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

// JSON Viewer Panel
const JsonViewerPanel = () => {
  return (
    <div className="flex flex-col h-full p-3">
      <div className="text-xs font-semibold text-text-secondary uppercase tracking-wider mb-3">JSON Viewer</div>
      <p className="text-sm text-text-secondary">
        Open a JSON file and press <kbd className="px-1 py-0.5 bg-tertiary rounded">Ctrl+Shift+J</kbd> to toggle JSON view mode.
      </p>
    </div>
  );
};

// Git Panel
const GitPanel = () => {
  return (
    <div className="flex flex-col h-full p-3">
      <div className="text-xs font-semibold text-text-secondary uppercase tracking-wider mb-3">Source Control</div>
      <p className="text-sm text-text-secondary">
        Git integration coming soon. Open a folder with a Git repository to see changes.
      </p>
    </div>
  );
};

export default Sidebar;
