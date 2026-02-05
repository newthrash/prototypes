import { useState, useEffect, useRef, useMemo } from 'react';
import { 
  Search, 
  File, 
  Folder, 
  Settings, 
  Sun,
  Moon,
  Layout,
  Save,
  FilePlus,
  Maximize,
} from 'lucide-react';
import { useEditorStore } from '../../stores/editorStore';
import { useFileSystemStore } from '../../stores/fileSystemStore';

interface CommandItem {
  id: string;
  label: string;
  icon: React.ReactNode;
  shortcut?: string;
  action: () => void;
  category: string;
}

const CommandPalette = () => {
  const { 
    isCommandPaletteOpen, 
    closeCommandPalette, 
    tabs, 
    activeTabId, 
    setActiveTab,
    setTheme,
    theme,
    toggleZenMode,
    toggleSettings,
    addTab,
  } = useEditorStore();
  
  const { openFile, openFolder, getFileLanguage } = useFileSystemStore();
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);

  const commands: CommandItem[] = useMemo(() => {
    const list: CommandItem[] = [
      // File Commands
      {
        id: 'open-file',
        label: 'Open File...',
        icon: <File size={18} />,
        shortcut: '⌘O',
        category: 'File',
        action: async () => {
          closeCommandPalette();
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
        },
      },
      {
        id: 'open-folder',
        label: 'Open Folder...',
        icon: <Folder size={18} />,
        shortcut: '⌘⇧O',
        category: 'File',
        action: () => {
          closeCommandPalette();
          openFolder();
        },
      },
      {
        id: 'new-file',
        label: 'New File',
        icon: <FilePlus size={18} />,
        shortcut: '⌘N',
        category: 'File',
        action: () => {
          closeCommandPalette();
          // Create untitled file
          addTab({
            path: `untitled-${Date.now()}`,
            name: 'Untitled',
            content: '',
            isDirty: false,
            language: 'plaintext',
          });
        },
      },
      {
        id: 'save',
        label: 'Save',
        icon: <Save size={18} />,
        shortcut: '⌘S',
        category: 'File',
        action: async () => {
          closeCommandPalette();
          const activeTab = tabs.find(t => t.id === activeTabId);
          if (activeTab) {
            const { writeTextFile } = await import('@tauri-apps/api/fs');
            await writeTextFile(activeTab.path, activeTab.content);
          }
        },
      },
      
      // View Commands
      {
        id: 'toggle-sidebar',
        label: 'Toggle Sidebar',
        icon: <Layout size={18} />,
        shortcut: '⌘B',
        category: 'View',
        action: () => {
          useEditorStore.getState().toggleSidebar();
          closeCommandPalette();
        },
      },
      {
        id: 'zen-mode',
        label: 'Toggle Zen Mode',
        icon: <Maximize size={18} />,
        shortcut: '⌘K Z',
        category: 'View',
        action: () => {
          toggleZenMode();
          closeCommandPalette();
        },
      },
      
      // Preferences
      {
        id: 'settings',
        label: 'Settings',
        icon: <Settings size={18} />,
        shortcut: '⌘,',
        category: 'Preferences',
        action: () => {
          toggleSettings();
          closeCommandPalette();
        },
      },
      {
        id: 'toggle-theme',
        label: `Switch to ${theme === 'dark' ? 'Light' : 'Dark'} Theme`,
        icon: theme === 'dark' ? <Sun size={18} /> : <Moon size={18} />,
        category: 'Preferences',
        action: () => {
          setTheme(theme === 'dark' ? 'light' : 'dark');
          closeCommandPalette();
        },
      },
      
      // Open Tabs
      ...tabs.map((tab, index) => ({
        id: `tab-${tab.id}`,
        label: `Open: ${tab.name}${tab.isDirty ? ' (modified)' : ''}`,
        icon: <File size={18} />,
        shortcut: index < 9 ? `⌘${index + 1}` : undefined,
        category: 'Open Editors',
        action: () => {
          setActiveTab(tab.id);
          closeCommandPalette();
        },
      })),
    ];

    return list;
  }, [tabs, activeTabId, theme, closeCommandPalette, openFile, openFolder, addTab, getFileLanguage, setActiveTab, setTheme, toggleZenMode, toggleSettings]);

  const filteredCommands = useMemo(() => {
    if (!searchQuery) return commands;
    const query = searchQuery.toLowerCase();
    return commands.filter(
      cmd =>
        cmd.label.toLowerCase().includes(query) ||
        cmd.category.toLowerCase().includes(query)
    );
  }, [commands, searchQuery]);

  // Group commands by category
  const groupedCommands = useMemo(() => {
    const groups: Record<string, CommandItem[]> = {};
    filteredCommands.forEach(cmd => {
      if (!groups[cmd.category]) {
        groups[cmd.category] = [];
      }
      groups[cmd.category].push(cmd);
    });
    return groups;
  }, [filteredCommands]);

  useEffect(() => {
    if (isCommandPaletteOpen) {
      setSearchQuery('');
      setSelectedIndex(0);
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  }, [isCommandPaletteOpen]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!isCommandPaletteOpen) return;

      switch (e.key) {
        case 'Escape':
          closeCommandPalette();
          break;
        case 'ArrowDown':
          e.preventDefault();
          setSelectedIndex(prev => 
            prev < filteredCommands.length - 1 ? prev + 1 : prev
          );
          break;
        case 'ArrowUp':
          e.preventDefault();
          setSelectedIndex(prev => (prev > 0 ? prev - 1 : 0));
          break;
        case 'Enter':
          e.preventDefault();
          if (filteredCommands[selectedIndex]) {
            filteredCommands[selectedIndex].action();
          }
          break;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isCommandPaletteOpen, filteredCommands, selectedIndex, closeCommandPalette]);

  if (!isCommandPaletteOpen) return null;

  let currentIndex = 0;

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center pt-[100px] bg-black bg-opacity-50">
      <div className="w-[600px] bg-secondary rounded-lg shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        {/* Search Input */}
        <div className="flex items-center gap-3 px-4 py-3 border-b border-border-color">
          <Search size={20} className="text-text-secondary" />
          <input
            ref={inputRef}
            type="text"
            placeholder="Type a command or search..."
            value={searchQuery}
            onChange={(e) => {
              setSearchQuery(e.target.value);
              setSelectedIndex(0);
            }}
            className="flex-1 bg-transparent text-text-primary text-lg outline-none placeholder-text-secondary"
          />
          <kbd className="px-2 py-1 bg-tertiary rounded text-xs text-text-secondary">ESC</kbd>
        </div>

        {/* Results */}
        <div className="max-h-[400px] overflow-y-auto py-2">
          {filteredCommands.length === 0 ? (
            <div className="px-4 py-8 text-center text-text-secondary">
              No commands found
            </div>
          ) : (
            Object.entries(groupedCommands).map(([category, items]) => (
              <div key={category}>
                <div className="px-4 py-1.5 text-xs font-semibold text-text-secondary uppercase tracking-wider">
                  {category}
                </div>
                {items.map((command) => {
                  const index = currentIndex++;
                  const isSelected = index === selectedIndex;
                  
                  return (
                    <button
                      key={command.id}
                      onClick={() => command.action()}
                      onMouseEnter={() => setSelectedIndex(index)}
                      className={`w-full flex items-center gap-3 px-4 py-2.5 text-left transition-colors ${
                        isSelected ? 'bg-accent text-white' : 'text-text-primary hover:bg-hover'
                      }`}
                    >
                      <span className={isSelected ? 'text-white' : 'text-text-secondary'}>
                        {command.icon}
                      </span>
                      <span className="flex-1">{command.label}</span>
                      {command.shortcut && (
                        <kbd className={`px-2 py-0.5 rounded text-xs ${
                          isSelected ? 'bg-white bg-opacity-20' : 'bg-tertiary'
                        }`}>
                          {command.shortcut}
                        </kbd>
                      )}
                    </button>
                  );
                })}
              </div>
            ))
          )}
        </div>

        {/* Footer */}
        <div className="px-4 py-2 bg-tertiary border-t border-border-color flex items-center justify-between text-xs text-text-secondary">
          <div className="flex items-center gap-4">
            <span className="flex items-center gap-1">
              <kbd className="px-1.5 py-0.5 bg-secondary rounded">↑↓</kbd>
              <span>Navigate</span>
            </span>
            <span className="flex items-center gap-1">
              <kbd className="px-1.5 py-0.5 bg-secondary rounded">↵</kbd>
              <span>Select</span>
            </span>
          </div>
          <span>{filteredCommands.length} commands</span>
        </div>
      </div>
    </div>
  );
};

export default CommandPalette;
