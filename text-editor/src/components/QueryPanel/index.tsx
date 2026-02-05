import { useState, useEffect, useRef } from 'react';
import Editor from '@monaco-editor/react';
import type { editor as MonacoEditor } from 'monaco-editor';
import { 
  Play, 
  ChevronDown, 
  History, 
  Bookmark,
  X,
  Loader2,
  Save,
  Trash2
} from 'lucide-react';
import { useEditorStore } from '../../stores/editorStore';
import ResultsViewer, { QueryResults } from './ResultsViewer';
import { executeSQL, getDefaultSQLQuery } from '../../lib/duckdb';
import { executePython, getDefaultPythonCode, initPyodide, isPyodideReady } from '../../lib/pyodide';

interface QueryHistoryItem {
  id: string;
  query: string;
  language: 'sql' | 'python';
  timestamp: number;
  filePath: string;
}

interface QueryBookmark {
  id: string;
  name: string;
  query: string;
  language: 'sql' | 'python';
}

const QueryPanel = () => {
  const { 
    activeTabId, 
    tabs, 
    queryPanelOpen, 
    queryLanguage, 
    queryPanelHeight,
    toggleQueryPanel,
    setQueryLanguage,
    setQueryPanelHeight
  } = useEditorStore();

  const [query, setQuery] = useState('');
  const [results, setResults] = useState<QueryResults | null>(null);
  const [isRunning, setIsRunning] = useState(false);
  const [history, setHistory] = useState<QueryHistoryItem[]>([]);
  const [bookmarks, setBookmarks] = useState<QueryBookmark[]>([]);
  const [showHistory, setShowHistory] = useState(false);
  const [showBookmarks, setShowBookmarks] = useState(false);
  const [pyodideLoading, setPyodideLoading] = useState(false);
  const editorRef = useRef<MonacoEditor.IStandaloneCodeEditor | null>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const resizeRef = useRef<HTMLDivElement>(null);

  const activeTab = tabs.find(t => t.id === activeTabId);
  
  // Initialize Pyodide on mount if needed
  useEffect(() => {
    if (queryLanguage === 'python' && !isPyodideReady() && !pyodideLoading) {
      setPyodideLoading(true);
      initPyodide()
        .then(() => {
          setPyodideLoading(false);
        })
        .catch((err) => {
          console.error('Failed to load Pyodide:', err);
          setPyodideLoading(false);
        });
    }
  }, [queryLanguage, pyodideLoading]);

  // Load default query when tab changes
  useEffect(() => {
    if (activeTab && queryPanelOpen) {
      // Check for pending query from AI panel
      const pendingQuery = (window as any).__pendingQuery;
      if (pendingQuery) {
        setQuery(pendingQuery);
        (window as any).__pendingQuery = null;
      } else {
        const defaultQuery = queryLanguage === 'sql' 
          ? getDefaultSQLQuery(activeTab.path)
          : getDefaultPythonCode(activeTab.path);
        setQuery(defaultQuery);
      }
      setResults(null);
    }
  }, [activeTabId, queryLanguage, queryPanelOpen]);

  // Handle resize
  useEffect(() => {
    const handleResize = (e: MouseEvent) => {
      if (!resizeRef.current || !panelRef.current) return;
      
      const newHeight = window.innerHeight - e.clientY;
      const clampedHeight = Math.max(150, Math.min(600, newHeight));
      setQueryPanelHeight(clampedHeight);
    };

    const handleResizeEnd = () => {
      document.removeEventListener('mousemove', handleResize);
      document.removeEventListener('mouseup', handleResizeEnd);
    };

    const handleResizeStart = () => {
      document.addEventListener('mousemove', handleResize);
      document.addEventListener('mouseup', handleResizeEnd);
    };

    resizeRef.current?.addEventListener('mousedown', handleResizeStart);
    
    return () => {
      resizeRef.current?.removeEventListener('mousedown', handleResizeStart);
    };
  }, [setQueryPanelHeight]);

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Ctrl+Shift+Q - Toggle query panel
      if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key === 'Q') {
        e.preventDefault();
        toggleQueryPanel();
      }
      
      // Ctrl+Enter - Run query
      if ((e.ctrlKey || e.metaKey) && e.key === 'Enter' && queryPanelOpen) {
        e.preventDefault();
        handleRunQuery();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [queryPanelOpen, toggleQueryPanel, query, activeTab, queryLanguage]);

  const handleRunQuery = async () => {
    if (!activeTab || !query.trim() || isRunning) return;

    setIsRunning(true);
    setResults(null);

    try {
      let result: QueryResults;

      if (queryLanguage === 'sql') {
        const sqlResult = await executeSQL(query, activeTab.path, activeTab.content);
        result = {
          type: 'sql',
          ...sqlResult,
          rowCount: sqlResult.data?.length
        };
      } else {
        // Python execution
        if (!isPyodideReady() && !pyodideLoading) {
          setPyodideLoading(true);
          await initPyodide();
          setPyodideLoading(false);
        }

        const pythonResult = await executePython(
          query, 
          activeTab.path, 
          activeTab.content,
          (newContent) => {
            // Save callback - update file content
            const { updateTabContent } = useEditorStore.getState();
            updateTabContent(activeTab.id, newContent);
          }
        );
        result = {
          type: 'python',
          ...pythonResult
        };
      }

      setResults(result);

      // Add to history if successful
      if (result.success) {
        addToHistory(query, queryLanguage, activeTab.path);
      }
    } catch (error) {
      setResults({
        type: queryLanguage,
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        executionTime: 0
      });
    } finally {
      setIsRunning(false);
    }
  };

  const addToHistory = (queryText: string, lang: 'sql' | 'python', filePath: string) => {
    const newItem: QueryHistoryItem = {
      id: Date.now().toString(),
      query: queryText,
      language: lang,
      timestamp: Date.now(),
      filePath
    };
    setHistory(prev => [newItem, ...prev].slice(0, 50)); // Keep last 50
  };

  const saveBookmark = () => {
    if (!query.trim()) return;
    
    const name = prompt('Enter a name for this query:');
    if (name) {
      const newBookmark: QueryBookmark = {
        id: Date.now().toString(),
        name,
        query: query,
        language: queryLanguage
      };
      setBookmarks(prev => [...prev, newBookmark]);
    }
  };

  const deleteBookmark = (id: string) => {
    setBookmarks(prev => prev.filter(b => b.id !== id));
  };

  const loadFromHistory = (item: QueryHistoryItem) => {
    setQuery(item.query);
    setQueryLanguage(item.language);
    setShowHistory(false);
  };

  const loadFromBookmark = (bookmark: QueryBookmark) => {
    setQuery(bookmark.query);
    setQueryLanguage(bookmark.language);
    setShowBookmarks(false);
  };

  const clearHistory = () => {
    if (confirm('Clear all query history?')) {
      setHistory([]);
    }
  };

  if (!queryPanelOpen) return null;

  const isQueryRunnable = activeTab && (
    queryLanguage === 'sql' 
      ? ['csv', 'tsv', 'json', 'jsonl', 'parquet'].includes(activeTab.path.split('.').pop()?.toLowerCase() || '')
      : true
  );

  return (
    <div 
      ref={panelRef}
      className="border-t border-border-color bg-primary flex flex-col"
      style={{ height: queryPanelHeight }}
    >
      {/* Resize Handle */}
      <div 
        ref={resizeRef}
        className="h-1 cursor-row-resize hover:bg-accent transition-colors flex items-center justify-center"
      >
        <div className="w-8 h-0.5 bg-border-color rounded-full" />
      </div>

      <div className="flex-1 flex overflow-hidden">
        {/* Query Input Section */}
        <div className="w-1/2 min-w-[300px] flex flex-col border-r border-border-color">
          {/* Toolbar */}
          <div className="flex items-center justify-between p-2 border-b border-border-color bg-secondary">
            <div className="flex items-center gap-2">
              {/* Language Selector */}
              <div className="relative">
                <select
                  value={queryLanguage}
                  onChange={(e) => setQueryLanguage(e.target.value as 'sql' | 'python')}
                  className="appearance-none bg-tertiary text-xs px-3 py-1.5 pr-8 rounded cursor-pointer outline-none focus:ring-1 focus:ring-accent"
                >
                  <option value="sql">SQL (DuckDB)</option>
                  <option value="python">Python</option>
                </select>
                <ChevronDown size={12} className="absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none text-text-secondary" />
              </div>

              {/* History Button */}
              <button
                onClick={() => setShowHistory(!showHistory)}
                className={`p-1.5 rounded transition-colors relative ${showHistory ? 'bg-accent text-white' : 'hover:bg-tertiary'}`}
                title="Query History"
              >
                <History size={14} />
                {history.length > 0 && (
                  <span className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 rounded-full text-[10px] flex items-center justify-center">
                    {history.length}
                  </span>
                )}
              </button>

              {/* Bookmarks Button */}
              <button
                onClick={() => setShowBookmarks(!showBookmarks)}
                className={`p-1.5 rounded transition-colors relative ${showBookmarks ? 'bg-accent text-white' : 'hover:bg-tertiary'}`}
                title="Saved Queries"
              >
                <Bookmark size={14} />
                {bookmarks.length > 0 && (
                  <span className="absolute -top-1 -right-1 w-4 h-4 bg-accent rounded-full text-[10px] flex items-center justify-center">
                    {bookmarks.length}
                  </span>
                )}
              </button>
            </div>

            <div className="flex items-center gap-2">
              {/* Save Bookmark */}
              <button
                onClick={saveBookmark}
                disabled={!query.trim()}
                className="flex items-center gap-1 px-2 py-1 text-xs rounded hover:bg-tertiary disabled:opacity-30 transition-colors"
                title="Save Query"
              >
                <Save size={12} />
              </button>

              {/* Run Button */}
              <button
                onClick={handleRunQuery}
                disabled={!isQueryRunnable || isRunning}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-accent hover:bg-accent/90 disabled:opacity-50 text-white text-xs rounded transition-colors"
              >
                {isRunning ? (
                  <Loader2 size={14} className="animate-spin" />
                ) : (
                  <Play size={14} />
                )}
                Run
                <span className="text-white/70">⌘↵</span>
              </button>
            </div>
          </div>

          {/* Editor */}
          <div className="flex-1 relative">
            {pyodideLoading && (
              <div className="absolute inset-0 bg-primary/90 z-10 flex items-center justify-center">
                <div className="text-center">
                  <Loader2 size={24} className="animate-spin mx-auto mb-2 text-accent" />
                  <p className="text-sm text-text-secondary">Loading Python environment...</p>
                </div>
              </div>
            )}
            
            <Editor
              height="100%"
              language={queryLanguage === 'sql' ? 'sql' : 'python'}
              value={query}
              onChange={(value) => setQuery(value || '')}
              theme={useEditorStore.getState().theme === 'light' ? 'light' : 'vs-dark'}
              options={{
                minimap: { enabled: false },
                lineNumbers: 'on',
                fontSize: 13,
                wordWrap: 'on',
                automaticLayout: true,
                scrollBeyondLastLine: false,
                suggestOnTriggerCharacters: true,
                quickSuggestions: true,
              }}
              onMount={(editor) => {
                editorRef.current = editor;
                
                // Add command for running query
                editor.addCommand(
                  (window as any).monaco?.KeyMod?.CtrlCmd | (window as any).monaco?.KeyCode?.Enter,
                  handleRunQuery
                );
              }}
            />
          </div>

          {/* History/Bookmarks Panel */}
          {(showHistory || showBookmarks) && (
            <div className="absolute left-0 top-[41px] w-80 max-h-96 bg-secondary border border-border-color rounded-lg shadow-lg z-20 overflow-hidden flex flex-col">
              <div className="flex items-center justify-between p-2 border-b border-border-color">
                <span className="text-sm font-medium">
                  {showHistory ? 'Query History' : 'Saved Queries'}
                </span>
                <button
                  onClick={() => showHistory ? setShowHistory(false) : setShowBookmarks(false)}
                  className="p-1 hover:bg-tertiary rounded"
                >
                  <X size={14} />
                </button>
              </div>
              
              <div className="flex-1 overflow-y-auto">
                {showHistory ? (
                  history.length === 0 ? (
                    <div className="p-4 text-center text-text-secondary text-sm">
                      No queries yet
                    </div>
                  ) : (
                    <>
                      <div className="flex justify-end p-2">
                        <button
                          onClick={clearHistory}
                          className="text-xs text-red-400 hover:text-red-300 flex items-center gap-1"
                        >
                          <Trash2 size={12} />
                          Clear All
                        </button>
                      </div>
                      {history.map((item) => (
                        <button
                          key={item.id}
                          onClick={() => loadFromHistory(item)}
                          className="w-full text-left p-2 hover:bg-tertiary border-b border-border-color last:border-0"
                        >
                          <div className="flex items-center gap-2 mb-1">
                            <span className={`text-[10px] px-1.5 rounded ${
                              item.language === 'sql' ? 'bg-blue-500/20 text-blue-400' : 'bg-yellow-500/20 text-yellow-400'
                            }`}>
                              {item.language.toUpperCase()}
                            </span>
                            <span className="text-xs text-text-secondary">
                              {new Date(item.timestamp).toLocaleString()}
                            </span>
                          </div>
                          <pre className="text-xs truncate font-mono">{item.query}</pre>
                        </button>
                      ))}
                    </>
                  )
                ) : (
                  bookmarks.length === 0 ? (
                    <div className="p-4 text-center text-text-secondary text-sm">
                      No saved queries
                    </div>
                  ) : (
                    bookmarks.map((bookmark) => (
                      <div
                        key={bookmark.id}
                        className="p-2 hover:bg-tertiary border-b border-border-color last:border-0 group"
                      >
                        <div className="flex items-center justify-between mb-1">
                          <button
                            onClick={() => loadFromBookmark(bookmark)}
                            className="flex-1 text-left font-medium text-sm"
                          >
                            {bookmark.name}
                          </button>
                          <button
                            onClick={() => deleteBookmark(bookmark.id)}
                            className="opacity-0 group-hover:opacity-100 p-1 hover:bg-red-500/20 rounded text-red-400 transition-opacity"
                          >
                            <Trash2 size={12} />
                          </button>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className={`text-[10px] px-1.5 rounded ${
                            bookmark.language === 'sql' ? 'bg-blue-500/20 text-blue-400' : 'bg-yellow-500/20 text-yellow-400'
                          }`}>
                            {bookmark.language.toUpperCase()}
                          </span>
                          <pre className="text-xs truncate font-mono text-text-secondary">{bookmark.query}</pre>
                        </div>
                      </div>
                    ))
                  )
                )}
              </div>
            </div>
          )}
        </div>

        {/* Results Section */}
        <div className="flex-1 flex flex-col min-w-0">
          <ResultsViewer results={results} />
        </div>
      </div>
    </div>
  );
};

export default QueryPanel;