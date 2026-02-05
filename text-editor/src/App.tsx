import { useEffect } from 'react';
import { useEditorStore } from './stores/editorStore';
import { useFileSystemStore } from './stores/fileSystemStore';
import { useAIAgentsStore } from './stores/aiAgentsStore';
import { useKeyBinding } from './hooks/useEditor';
import Sidebar from './components/Sidebar';
import TabBar from './components/Tabs';
import Editor from './components/Editor';
import StatusBar from './components/StatusBar';
import CommandPalette from './components/CommandPalette';
import Settings from './components/Settings';
import QueryPanel from './components/QueryPanel';
import AIAgentsPanel from './components/AIAgentsPanel';

function App() {
  const {
    isSidebarOpen,
    isZenMode,
    isSettingsOpen,
    queryPanelOpen,
    toggleSidebar,
    openCommandPalette,
    toggleSettings,
    toggleQueryPanel,
    addTab,
    tabs,
  } = useEditorStore();

  const { togglePanel: toggleAIPanel } = useAIAgentsStore();

  const { openFile, openFolder, getFileLanguage } = useFileSystemStore();

  // Global keyboard shortcuts
  useKeyBinding('mod+o', async () => {
    const file = await openFile();
    if (file) {
      addTab({
        path: file.path,
        name: file.name,
        content: file.content,
        isDirty: false,
        language: getFileLanguage(file.path),
      });
    }
  });

  useKeyBinding('mod+shift+o', openFolder);
  useKeyBinding('mod+b', toggleSidebar);
  useKeyBinding('mod+shift+p', openCommandPalette);
  useKeyBinding('mod+,', toggleSettings);
  useKeyBinding('mod+shift+q', toggleQueryPanel);
  useKeyBinding('mod+shift+a', toggleAIPanel);

  // Apply theme
  useEffect(() => {
    const theme = useEditorStore.getState().theme;
    document.documentElement.classList.remove('dark', 'light');
    if (theme === 'system') {
      const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
      document.documentElement.classList.add(prefersDark ? 'dark' : 'light');
    } else {
      document.documentElement.classList.add(theme);
    }
  }, []);

  return (
    <div className={`flex h-screen w-screen overflow-hidden ${isZenMode ? 'zen-mode' : ''}`}>
      {/* Sidebar */}
      {!isZenMode && isSidebarOpen && <Sidebar />}

      {/* Main Content */}
      <div className="flex flex-col flex-1 min-w-0">
        {/* Tab Bar */}
        {!isZenMode && <TabBar />}

        {/* Editor Area */}
        <div className={`relative ${queryPanelOpen ? 'flex-1 min-h-0' : 'flex-1'}`}>
          {tabs.length === 0 ? (
            <WelcomeScreen onOpenFile={openFile} onOpenFolder={openFolder} />
          ) : (
            <Editor />
          )}
        </div>

        {/* Query Panel */}
        {queryPanelOpen && !isZenMode && <QueryPanel />}

        {/* Status Bar */}
        {!isZenMode && <StatusBar />}
      </div>

      {/* AI Agents Panel */}
      <AIAgentsPanel />

      {/* Modals */}
      <CommandPalette />
      {isSettingsOpen && <Settings onClose={toggleSettings} />}
    </div>
  );
}

function WelcomeScreen({ 
  onOpenFile, 
  onOpenFolder 
}: { 
  onOpenFile: () => Promise<{ path: string; content: string; name: string } | null>;
  onOpenFolder: () => Promise<void>;
}) {
  const { addTab } = useEditorStore();
  const { getFileLanguage } = useFileSystemStore();
  const { recentFiles } = useEditorStore();

  const handleOpenFile = async () => {
    const file = await onOpenFile();
    if (file) {
      addTab({
        path: file.path,
        name: file.name,
        content: file.content,
        isDirty: false,
        language: getFileLanguage(file.path),
      });
    }
  };

  return (
    <div className="flex flex-col items-center justify-center h-full bg-primary">
      <div className="text-center">
        <h1 className="text-5xl font-light mb-4 text-accent">OpenText</h1>
        <p className="text-text-secondary mb-8 text-lg">A modern, fast text editor with AI</p>

        <div className="flex gap-4 mb-12">
          <button
            onClick={handleOpenFile}
            className="px-6 py-3 bg-tertiary hover:bg-active rounded-lg transition-colors flex items-center gap-2"
          >
            <span>📄</span>
            <span>Open File</span>
            <span className="text-text-secondary text-sm ml-2">⌘O</span>
          </button>
          <button
            onClick={onOpenFolder}
            className="px-6 py-3 bg-tertiary hover:bg-active rounded-lg transition-colors flex items-center gap-2"
          >
            <span>📁</span>
            <span>Open Folder</span>
            <span className="text-text-secondary text-sm ml-2">⌘⇧O</span>
          </button>
        </div>

        {recentFiles.length > 0 && (
          <div className="text-left">
            <h3 className="text-text-secondary text-sm uppercase tracking-wider mb-3">Recent Files</h3>
            <div className="space-y-1">
              {recentFiles.slice(0, 5).map((path) => (
                <button
                  key={path}
                  onClick={async () => {
                    const { readTextFile } = await import('@tauri-apps/api/fs');
                    const { basename } = await import('@tauri-apps/api/path');
                    const content = await readTextFile(path);
                    const name = await basename(path);
                    addTab({
                      path,
                      name,
                      content,
                      isDirty: false,
                      language: getFileLanguage(path),
                    });
                  }}
                  className="block w-full text-left px-3 py-2 rounded hover:bg-tertiary text-sm text-text-secondary hover:text-text-primary transition-colors truncate max-w-md"
                  title={path}
                >
                  {path}
                </button>
              ))}
            </div>
          </div>
        )}

        <div className="mt-12 text-text-secondary text-sm">
          <div className="flex gap-6 justify-center flex-wrap">
            <span>⌘P Command Palette</span>
            <span>⌘B Toggle Sidebar</span>
            <span>⌘⇧A AI Agents</span>
            <span>⌘, Settings</span>
            <span>⌘⇧Q Query Panel</span>
          </div>
        </div>
      </div>
    </div>
  );
}

export default App;
