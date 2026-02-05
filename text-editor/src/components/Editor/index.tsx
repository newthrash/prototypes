import { useRef, useCallback, useEffect } from 'react';
import Editor from '@monaco-editor/react';
import type { editor as MonacoEditor } from 'monaco-editor';
import { useEditorStore } from '../../stores/editorStore';
import { useFileSystemStore } from '../../stores/fileSystemStore';
import { debounce } from '../../utils/helpers';

const EditorComponent = () => {
  const {
    tabs,
    activeTabId,
    splitMode,
    activeSplitTabId,
    fontSize,
    fontFamily,
    wordWrap,
    tabSize,
    insertSpaces,
    minimap,
    lineNumbers,
    renderWhitespace,
    updateTabContent,
    markTabClean,
    updateTabPosition,
    updateTabScroll,
    toggleJsonView,
  } = useEditorStore();

  const { saveFile } = useFileSystemStore();
  const editorRef = useRef<MonacoEditor.IStandaloneCodeEditor | null>(null);

  const activeTab = tabs.find((t: typeof tabs[0]) => t.id === activeTabId);

  // Auto-save debounced
  const debouncedSave = useCallback(
    debounce(async (tabId: string, content: string, path: string) => {
      try {
        await saveFile(path, content);
        markTabClean(tabId);
      } catch (error) {
        console.error('Auto-save failed:', error);
      }
    }, 1000) as (tabId: string, content: string, path: string) => void,
    []
  );

  const handleEditorChange = (value: string | undefined) => {
    if (!activeTab || value === undefined) return;
    
    updateTabContent(activeTab.id, value);
    
    // Auto-save if enabled
    if (useEditorStore.getState().autoSave) {
      debouncedSave(activeTab.id, value, activeTab.path);
    }
  };

  const handleEditorMount = (editor: MonacoEditor.IStandaloneCodeEditor, monaco: typeof import('monaco-editor')) => {
    editorRef.current = editor;

    // Configure editor
    monaco.editor.defineTheme('opentext-dark', {
      base: 'vs-dark',
      inherit: true,
      rules: [],
      colors: {
        'editor.background': '#1e1e1e',
        'editor.lineHighlightBackground': '#2d2d30',
        'editorLineNumber.foreground': '#858585',
        'editorLineNumber.activeForeground': '#cccccc',
      }
    });

    monaco.editor.defineTheme('opentext-light', {
      base: 'vs',
      inherit: true,
      rules: [],
      colors: {
        'editor.background': '#ffffff',
        'editor.lineHighlightBackground': '#f0f0f0',
        'editorLineNumber.foreground': '#237893',
        'editorLineNumber.activeForeground': '#0b216f',
      }
    });

    const theme = useEditorStore.getState().theme;
    monaco.editor.setTheme(theme === 'light' ? 'opentext-light' : 'opentext-dark');

    // Track cursor position
    editor.onDidChangeCursorPosition(() => {
      const position = editor.getPosition();
      if (position && activeTab) {
        updateTabPosition(activeTab.id, {
          line: position.lineNumber,
          column: position.column,
        });
      }
    });

    // Track scroll position
    editor.onDidScrollChange(() => {
      const scroll = editor.getScrollTop();
      const left = editor.getScrollLeft();
      if (activeTab) {
        updateTabScroll(activeTab.id, { top: scroll, left });
      }
    });

    // Add command for JSON view
    editor.addCommand(monaco.KeyMod.CtrlCmd | monaco.KeyMod.Shift | monaco.KeyCode.KeyJ, () => {
      if (activeTab && activeTab.language === 'json') {
        toggleJsonView(activeTab.id);
      }
    });
  };

  // Restore cursor position when tab changes
  useEffect(() => {
    if (editorRef.current && activeTab?.cursorPosition) {
      editorRef.current.setPosition({
        lineNumber: activeTab.cursorPosition.line,
        column: activeTab.cursorPosition.column,
      });
      editorRef.current.revealPositionInCenterIfOutsideViewport({
        lineNumber: activeTab.cursorPosition.line,
        column: activeTab.cursorPosition.column,
      });
    }
  }, [activeTabId]);

  // Update theme when it changes
  useEffect(() => {
  }, []);

  if (!activeTab) {
    return (
      <div className="flex items-center justify-center h-full bg-primary text-text-secondary">
        <p>No file open</p>
      </div>
    );
  }

  const editorOptions: MonacoEditor.IStandaloneEditorConstructionOptions = {
    fontSize,
    fontFamily,
    wordWrap: wordWrap as 'on' | 'off' | 'wordWrapColumn',
    tabSize,
    insertSpaces,
    minimap: { enabled: minimap },
    lineNumbers: lineNumbers ? 'on' : 'off',
    renderWhitespace,
    automaticLayout: true,
    scrollBeyondLastLine: false,
    smoothScrolling: true,
    cursorBlinking: 'smooth',
    cursorSmoothCaretAnimation: 'on',
    bracketPairColorization: { enabled: true },
    guides: {
      bracketPairs: true,
      indentation: true,
    },
    folding: true,
    foldingHighlight: true,
    foldingImportsByDefault: false,
    showFoldingControls: 'always',
    unfoldOnClickAfterEndOfLine: true,
    dragAndDrop: true,
    links: true,
    quickSuggestions: true,
    suggestOnTriggerCharacters: true,
    acceptSuggestionOnEnter: 'on',
    snippetSuggestions: 'inline',
    formatOnPaste: true,
    formatOnType: true,
    autoIndent: 'full',
    detectIndentation: true,
    trimAutoWhitespace: true,
  };

  return (
    <div className="h-full w-full flex">
      {/* Main Editor */}
      <div className={`flex-1 ${splitMode !== 'none' ? 'border-r border-border-color' : ''}`}>
        <Editor
          height="100%"
          language={activeTab.language}
          value={activeTab.content}
          theme={useEditorStore.getState().theme === 'light' ? 'opentext-light' : 'opentext-dark'}
          options={editorOptions}
          onChange={handleEditorChange}
          onMount={handleEditorMount}
          loading={
            <div className="flex items-center justify-center h-full bg-primary text-text-secondary">
              <span className="animate-pulse">Loading editor...</span>
            </div>
          }
        />
      </div>

      {/* Split Editor */}
      {splitMode !== 'none' && activeSplitTabId && (
        <div className="flex-1">
          <SplitEditor 
            tabId={activeSplitTabId}
            options={editorOptions}
          />
        </div>
      )}
    </div>
  );
};

interface SplitEditorProps {
  tabId: string;
  options: MonacoEditor.IStandaloneEditorConstructionOptions;
}

const SplitEditor = ({ tabId, options }: SplitEditorProps) => {
  const { tabs, updateTabContent } = useEditorStore();
  const tab = tabs.find((t: typeof tabs[0]) => t.id === tabId);
  const editorRef = useRef<MonacoEditor.IStandaloneCodeEditor | null>(null);

  if (!tab) return null;

  const handleChange = (value: string | undefined) => {
    if (value !== undefined) {
      updateTabContent(tabId, value);
    }
  };

  return (
    <Editor
      height="100%"
      language={tab.language}
      value={tab.content}
      theme={useEditorStore.getState().theme === 'light' ? 'opentext-light' : 'opentext-dark'}
      options={options}
      onChange={handleChange}
      onMount={(editor) => {
        editorRef.current = editor;
      }}
    />
  );
};

export default EditorComponent;
