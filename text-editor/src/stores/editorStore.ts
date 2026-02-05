import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export interface FileTab {
  id: string;
  path: string;
  name: string;
  content: string;
  isDirty: boolean;
  language: string;
  isJsonView?: boolean;
  cursorPosition?: { line: number; column: number };
  scrollPosition?: { top: number; left: number };
}

export interface EditorState {
  // Tabs
  tabs: FileTab[];
  activeTabId: string | null;
  
  // Editor
  splitMode: 'none' | 'horizontal' | 'vertical';
  activeSplitTabId: string | null;
  
  // UI State
  isSidebarOpen: boolean;
  sidebarView: 'explorer' | 'search' | 'git' | 'json-viewer';
  isCommandPaletteOpen: boolean;
  isSettingsOpen: boolean;
  isZenMode: boolean;
  
  // Search
  searchQuery: string;
  searchResults: SearchResult[];
  isSearching: boolean;
  
  // Settings
  theme: 'dark' | 'light' | 'system';
  fontSize: number;
  fontFamily: string;
  wordWrap: 'on' | 'off' | 'wordWrapColumn';
  tabSize: number;
  insertSpaces: boolean;
  autoSave: boolean;
  autoSaveDelay: number;
  minimap: boolean;
  lineNumbers: boolean;
  renderWhitespace: 'none' | 'boundary' | 'selection' | 'all';
  
  // Recent files
  recentFiles: string[];
  recentFolders: string[];
  
  // Session
  lastSession: {
    openFiles: string[];
    activeFile: string | null;
    openFolder: string | null;
  } | null;
  
  // Query Panel
  queryPanelOpen: boolean;
  queryLanguage: 'sql' | 'python';
  queryPanelHeight: number;
  isQueryRunning: boolean;
}

export interface SearchResult {
  filePath: string;
  line: number;
  column: number;
  text: string;
  preview: string;
}

interface EditorActions {
  // Tab actions
  addTab: (tab: Omit<FileTab, 'id'>) => void;
  closeTab: (id: string) => void;
  closeAllTabs: () => void;
  closeOtherTabs: (id: string) => void;
  setActiveTab: (id: string) => void;
  updateTabContent: (id: string, content: string) => void;
  markTabClean: (id: string) => void;
  markTabDirty: (id: string) => void;
  updateTabPosition: (id: string, position: { line: number; column: number }) => void;
  updateTabScroll: (id: string, scroll: { top: number; left: number }) => void;
  toggleJsonView: (id: string) => void;
  
  // Split actions
  setSplitMode: (mode: 'none' | 'horizontal' | 'vertical') => void;
  setActiveSplitTab: (id: string | null) => void;
  
  // UI actions
  toggleSidebar: () => void;
  setSidebarView: (view: EditorState['sidebarView']) => void;
  openCommandPalette: () => void;
  closeCommandPalette: () => void;
  toggleSettings: () => void;
  toggleZenMode: () => void;
  
  // Search actions
  setSearchQuery: (query: string) => void;
  setSearchResults: (results: SearchResult[]) => void;
  clearSearch: () => void;
  
  // Settings actions
  setTheme: (theme: EditorState['theme']) => void;
  setFontSize: (size: number) => void;
  setFontFamily: (family: string) => void;
  setWordWrap: (wrap: EditorState['wordWrap']) => void;
  setTabSize: (size: number) => void;
  setInsertSpaces: (insert: boolean) => void;
  setAutoSave: (enabled: boolean) => void;
  setMinimap: (enabled: boolean) => void;
  setLineNumbers: (enabled: boolean) => void;
  
  // Recent files
  addRecentFile: (path: string) => void;
  addRecentFolder: (path: string) => void;
  clearRecentFiles: () => void;
  
  // Session
  saveSession: () => void;
  restoreSession: () => void;
  
  // Query Panel actions
  toggleQueryPanel: () => void;
  setQueryPanelOpen: (open: boolean) => void;
  setQueryLanguage: (lang: 'sql' | 'python') => void;
  setQueryPanelHeight: (height: number) => void;
  setIsQueryRunning: (running: boolean) => void;
}

const generateId = () => Math.random().toString(36).substr(2, 9);

export const useEditorStore = create<EditorState & EditorActions>()(
  persist(
    (set, get) => ({
      // Initial state
      tabs: [],
      activeTabId: null,
      splitMode: 'none',
      activeSplitTabId: null,
      isSidebarOpen: true,
      sidebarView: 'explorer',
      isCommandPaletteOpen: false,
      isSettingsOpen: false,
      isZenMode: false,
      searchQuery: '',
      searchResults: [],
      isSearching: false,
      theme: 'dark',
      fontSize: 14,
      fontFamily: 'Menlo, Monaco, "Courier New", monospace',
      wordWrap: 'on',
      tabSize: 2,
      insertSpaces: true,
      autoSave: false,
      autoSaveDelay: 1000,
      minimap: true,
      lineNumbers: true,
      renderWhitespace: 'selection',
      recentFiles: [],
      recentFolders: [],
      lastSession: null,
      
      // Query Panel initial state
      queryPanelOpen: false,
      queryLanguage: 'sql',
      queryPanelHeight: 300,
      isQueryRunning: false,

      // Tab actions
      addTab: (tab) => {
        const { tabs } = get();
        const existingTab = tabs.find(t => t.path === tab.path);
        
        if (existingTab) {
          set({ activeTabId: existingTab.id });
          return;
        }
        
        const newTab: FileTab = { ...tab, id: generateId() };
        set({ 
          tabs: [...tabs, newTab],
          activeTabId: newTab.id 
        });
      },

      closeTab: (id) => {
        const { tabs, activeTabId } = get();
        const newTabs = tabs.filter(t => t.id !== id);
        
        if (activeTabId === id) {
          const closedIndex = tabs.findIndex(t => t.id === id);
          const newActiveId = newTabs[closedIndex] || newTabs[closedIndex - 1];
          set({ 
            tabs: newTabs,
            activeTabId: newActiveId?.id || null 
          });
        } else {
          set({ tabs: newTabs });
        }
      },

      closeAllTabs: () => set({ tabs: [], activeTabId: null }),

      closeOtherTabs: (id) => {
        const { tabs } = get();
        const keepTab = tabs.find(t => t.id === id);
        set({ 
          tabs: keepTab ? [keepTab] : [],
          activeTabId: id 
        });
      },

      setActiveTab: (id) => set({ activeTabId: id }),

      updateTabContent: (id, content) => {
        const { tabs } = get();
        set({
          tabs: tabs.map(t => 
            t.id === id ? { ...t, content, isDirty: true } : t
          )
        });
      },

      markTabClean: (id) => {
        const { tabs } = get();
        set({
          tabs: tabs.map(t => 
            t.id === id ? { ...t, isDirty: false } : t
          )
        });
      },

      markTabDirty: (id) => {
        const { tabs } = get();
        set({
          tabs: tabs.map(t => 
            t.id === id ? { ...t, isDirty: true } : t
          )
        });
      },

      updateTabPosition: (id, position) => {
        const { tabs } = get();
        set({
          tabs: tabs.map(t => 
            t.id === id ? { ...t, cursorPosition: position } : t
          )
        });
      },

      updateTabScroll: (id, scroll) => {
        const { tabs } = get();
        set({
          tabs: tabs.map(t => 
            t.id === id ? { ...t, scrollPosition: scroll } : t
          )
        });
      },

      toggleJsonView: (id) => {
        const { tabs } = get();
        set({
          tabs: tabs.map(t => 
            t.id === id ? { ...t, isJsonView: !t.isJsonView } : t
          )
        });
      },

      // Split actions
      setSplitMode: (mode) => set({ splitMode: mode }),
      setActiveSplitTab: (id) => set({ activeSplitTabId: id }),

      // UI actions
      toggleSidebar: () => set(state => ({ isSidebarOpen: !state.isSidebarOpen })),
      setSidebarView: (view) => set({ sidebarView: view, isSidebarOpen: true }),
      openCommandPalette: () => set({ isCommandPaletteOpen: true }),
      closeCommandPalette: () => set({ isCommandPaletteOpen: false }),
      toggleSettings: () => set(state => ({ isSettingsOpen: !state.isSettingsOpen })),
      toggleZenMode: () => set(state => ({ isZenMode: !state.isZenMode })),

      // Search actions
      setSearchQuery: (query) => set({ searchQuery: query, isSearching: !!query }),
      setSearchResults: (results) => set({ searchResults: results }),
      clearSearch: () => set({ searchQuery: '', searchResults: [], isSearching: false }),

      // Settings actions
      setTheme: (theme) => set({ theme }),
      setFontSize: (fontSize) => set({ fontSize }),
      setFontFamily: (fontFamily) => set({ fontFamily }),
      setWordWrap: (wordWrap) => set({ wordWrap }),
      setTabSize: (tabSize) => set({ tabSize }),
      setInsertSpaces: (insertSpaces) => set({ insertSpaces }),
      setAutoSave: (autoSave) => set({ autoSave }),
      setMinimap: (minimap) => set({ minimap }),
      setLineNumbers: (lineNumbers) => set({ lineNumbers }),

      // Recent files
      addRecentFile: (path) => {
        const { recentFiles } = get();
        const filtered = recentFiles.filter(f => f !== path);
        set({ recentFiles: [path, ...filtered].slice(0, 20) });
      },

      addRecentFolder: (path) => {
        const { recentFolders } = get();
        const filtered = recentFolders.filter(f => f !== path);
        set({ recentFolders: [path, ...filtered].slice(0, 10) });
      },

      clearRecentFiles: () => set({ recentFiles: [], recentFolders: [] }),

      // Session
      saveSession: () => {
        const { tabs, activeTabId } = get();
        set({
          lastSession: {
            openFiles: tabs.map(t => t.path),
            activeFile: activeTabId,
            openFolder: null
          }
        });
      },

      restoreSession: () => {
        // This will be implemented with file system operations
      },
      
      // Query Panel actions
      toggleQueryPanel: () => set(state => ({ queryPanelOpen: !state.queryPanelOpen })),
      setQueryPanelOpen: (open) => set({ queryPanelOpen: open }),
      setQueryLanguage: (lang) => set({ queryLanguage: lang }),
      setQueryPanelHeight: (height) => set({ queryPanelHeight: height }),
      setIsQueryRunning: (running) => set({ isQueryRunning: running }),
    }),
    {
      name: 'opentext-storage',
      partialize: (state) => ({
        theme: state.theme,
        fontSize: state.fontSize,
        fontFamily: state.fontFamily,
        wordWrap: state.wordWrap,
        tabSize: state.tabSize,
        insertSpaces: state.insertSpaces,
        autoSave: state.autoSave,
        autoSaveDelay: state.autoSaveDelay,
        minimap: state.minimap,
        lineNumbers: state.lineNumbers,
        renderWhitespace: state.renderWhitespace,
        recentFiles: state.recentFiles,
        recentFolders: state.recentFolders,
        lastSession: state.lastSession,
      }),
    }
  )
);
