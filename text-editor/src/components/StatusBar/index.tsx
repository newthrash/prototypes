import { useState, useEffect } from 'react';
import { 
  GitBranch, 
  AlertCircle, 
  Maximize,
  Minimize,
  Zap,
  Bell,
  Database,
  Bot,
} from 'lucide-react';
import { useEditorStore } from '../../stores/editorStore';
import { useFileSystemStore } from '../../stores/fileSystemStore';
import { useAIAgentsStore } from '../../stores/aiAgentsStore';
import { countWords, countLines, formatJson } from '../../utils/helpers';

const StatusBar = () => {
  const { 
    activeTabId, 
    tabs, 
    toggleZenMode, 
    isZenMode,
    theme,
    setTheme,
    lineNumbers,
    setLineNumbers,
    wordWrap,
    setWordWrap,
    queryPanelOpen,
    toggleQueryPanel,
  } = useEditorStore();
  
  const { isPanelOpen: isAIAgentsOpen, togglePanel: toggleAIAgents } = useAIAgentsStore();
  
  const { currentFolder } = useFileSystemStore();
  const [cursorPosition, setCursorPosition] = useState({ line: 1, column: 1 });
  const [editorInstance, setEditorInstance] = useState<any>(null);

  const activeTab = tabs.find(t => t.id === activeTabId);

  // Subscribe to Monaco editor cursor position
  useEffect(() => {
    const checkEditor = () => {
      const editors = (window as any).monaco?.editor?.getEditors?.() || [];
      if (editors.length > 0 && editors[0] !== editorInstance) {
        setEditorInstance(editors[0]);
        editors[0].onDidChangeCursorPosition((e: any) => {
          setCursorPosition({
            line: e.position.lineNumber,
            column: e.position.column,
          });
        });
      }
    };

    const interval = setInterval(checkEditor, 500);
    return () => clearInterval(interval);
  }, [editorInstance, activeTabId]);

  const wordCount = activeTab ? countWords(activeTab.content) : 0;
  const lineCount = activeTab ? countLines(activeTab.content) : 0;

  const handleFormatJson = async () => {
    if (activeTab && activeTab.language === 'json') {
      try {
        const formatted = formatJson(activeTab.content);
        const { updateTabContent } = useEditorStore.getState();
        updateTabContent(activeTab.id, formatted);
        
        // Also save if not dirty
        const { saveFile } = useFileSystemStore.getState();
        await saveFile(activeTab.path, formatted);
      } catch (error) {
        console.error('Error formatting JSON:', error);
      }
    }
  };

  return (
    <div className="h-[22px] bg-accent text-white flex items-center justify-between text-xs px-2 select-none">
      {/* Left Section */}
      <div className="flex items-center gap-4">
        {currentFolder && (
          <div className="flex items-center gap-1.5">
            <GitBranch size={12} />
            <span className="truncate max-w-[150px]">{currentFolder.split('/').pop()}</span>
          </div>
        )}
        
        {activeTab?.isDirty && (
          <div className="flex items-center gap-1.5 text-yellow-300">
            <AlertCircle size={12} />
            <span>Unsaved</span>
          </div>
        )}

        {activeTab?.language === 'json' && (
          <button
            onClick={handleFormatJson}
            className="flex items-center gap-1.5 hover:bg-white hover:bg-opacity-20 px-2 py-0.5 rounded transition-colors"
          >
            <Zap size={12} />
            <span>Format JSON</span>
          </button>
        )}
      </div>

      {/* Right Section */}
      <div className="flex items-center gap-1">
        {/* Cursor Position */}
        {activeTab && (
          <div className="px-2 py-0.5 hover:bg-white hover:bg-opacity-20 rounded cursor-pointer">
            Ln {cursorPosition.line}, Col {cursorPosition.column}
          </div>
        )}

        {/* Encoding */}
        {activeTab && (
          <div className="px-2 py-0.5 hover:bg-white hover:bg-opacity-20 rounded cursor-pointer">
            UTF-8
          </div>
        )}

        {/* Language Mode */}
        {activeTab && (
          <div className="px-2 py-0.5 hover:bg-white hover:bg-opacity-20 rounded cursor-pointer uppercase">
            {activeTab.language}
          </div>
        )}

        {/* Word Count */}
        {activeTab && (
          <div className="px-2 py-0.5 hover:bg-white hover:bg-opacity-20 rounded cursor-pointer" title={`${wordCount} words, ${lineCount} lines`}>
            {wordCount} words
          </div>
        )}

        {/* Line Endings */}
        {activeTab && (
          <div className="px-2 py-0.5 hover:bg-white hover:bg-opacity-20 rounded cursor-pointer">
            LF
          </div>
        )}

        {/* Word Wrap Toggle */}
        <button
          onClick={() => setWordWrap(wordWrap === 'on' ? 'off' : 'on')}
          className={`px-2 py-0.5 rounded transition-colors ${
            wordWrap === 'on' ? 'bg-white bg-opacity-20' : 'hover:bg-white hover:bg-opacity-20'
          }`}
          title="Toggle Word Wrap"
        >
          {wordWrap === 'on' ? 'Wrap' : 'No Wrap'}
        </button>

        {/* Line Numbers Toggle */}
        <button
          onClick={() => setLineNumbers(!lineNumbers)}
          className={`px-2 py-0.5 rounded transition-colors ${
            lineNumbers ? 'bg-white bg-opacity-20' : 'hover:bg-white hover:bg-opacity-20'
          }`}
          title="Toggle Line Numbers"
        >
          {lineNumbers ? 'Lines' : 'No Lines'}
        </button>

        {/* Theme Toggle */}
        <button
          onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
          className="px-2 py-0.5 hover:bg-white hover:bg-opacity-20 rounded transition-colors"
          title="Toggle Theme"
        >
          {theme === 'dark' ? 'Dark' : 'Light'}
        </button>

        {/* Query Panel Toggle */}
        <button
          onClick={toggleQueryPanel}
          className={`px-2 py-0.5 rounded transition-colors flex items-center gap-1 ${
            queryPanelOpen ? 'bg-white bg-opacity-20' : 'hover:bg-white hover:bg-opacity-20'
          }`}
          title="Toggle Query Panel (⌘⇧Q)"
        >
          <Database size={12} />
          Query
        </button>

        {/* AI Agents Toggle */}
        <button
          onClick={toggleAIAgents}
          className={`px-2 py-0.5 rounded transition-colors flex items-center gap-1 ${
            isAIAgentsOpen ? 'bg-white bg-opacity-20' : 'hover:bg-white hover:bg-opacity-20'
          }`}
          title="Toggle AI Agents (⌘⇧A)"
        >
          <Bot size={12} />
          AI
        </button>

        {/* Zen Mode */}
        <button
          onClick={toggleZenMode}
          className="px-2 py-0.5 hover:bg-white hover:bg-opacity-20 rounded transition-colors"
          title="Toggle Zen Mode"
        >
          {isZenMode ? <Minimize size={12} /> : <Maximize size={12} />}
        </button>

        {/* Notifications */}
        <button className="px-2 py-0.5 hover:bg-white hover:bg-opacity-20 rounded transition-colors">
          <Bell size={12} />
        </button>
      </div>
    </div>
  );
};

export default StatusBar;
