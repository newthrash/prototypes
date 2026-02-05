import { useState, useRef, useEffect } from 'react';
import { 
  MessageSquare, 
  Settings, 
  Send, 
  Plus, 
  Bot,
  ChevronDown,
  MoreVertical,
  Loader2,
  PanelRight,
  Sparkles
} from 'lucide-react';
import { useAIAgentsStore } from '../../stores/aiAgentsStore';
import { useEditorStore } from '../../stores/editorStore';
import { buildFileContext, buildPromptContext } from '../../lib/contextBuilder';
import { createProvider } from '../../lib/aiProviders';
import AgentSelector from './AgentSelector';
import ChatMessage from './ChatMessage';
import AISettings from './AISettings';

const AIAgentsPanel = () => {
  const {
    isPanelOpen,
    panelWidth,
    togglePanel,
    setPanelWidth,
    agents,
    activeAgentId,
    sessions,
    activeSessionId,
    isLoading,
    showSettings,
    providers,
    activeProvider,
    toggleSettings,
    setActiveSession,
    createSession,
    deleteSession,
    renameSession,
    addMessage,
    updateMessage,
    setIsLoading,
    setStreamingMessageId
  } = useAIAgentsStore();

  const { tabs, activeTabId, setQueryPanelOpen, setQueryLanguage } = useEditorStore();
  
  const [input, setInput] = useState('');
  const [showAgentSelector, setShowAgentSelector] = useState(false);
  const [showSessionMenu, setShowSessionMenu] = useState<string | null>(null);
  const [editingSessionName, setEditingSessionName] = useState<string | null>(null);
  const [editName, setEditName] = useState('');
  
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const resizeRef = useRef<HTMLDivElement>(null);

  const activeAgent = agents.find(a => a.id === activeAgentId) || agents[0];
  const activeSession = sessions.find(s => s.id === activeSessionId);
  const activeTab = tabs.find(t => t.id === activeTabId);

  // Auto-scroll to bottom of messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [activeSession?.messages, isLoading]);

  // Focus input when panel opens
  useEffect(() => {
    if (isPanelOpen) {
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  }, [isPanelOpen, activeSessionId]);

  // Handle resize
  useEffect(() => {
    const handleResize = (e: MouseEvent) => {
      if (!resizeRef.current || !panelRef.current) return;
      const newWidth = window.innerWidth - e.clientX;
      setPanelWidth(newWidth);
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
    return () => resizeRef.current?.removeEventListener('mousedown', handleResizeStart);
  }, [setPanelWidth]);

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Ctrl+Shift+A - Toggle AI panel
      if ((e.ctrlKey || e.metaKey) && e.shiftKey && (e.key === 'a' || e.key === 'A')) {
        e.preventDefault();
        togglePanel();
      }
      
      // Escape - Close panel
      if (e.key === 'Escape' && isPanelOpen && !showSettings) {
        togglePanel();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isPanelOpen, togglePanel, showSettings]);

  // Restore API keys from memory on mount
  useEffect(() => {
    // Try to get API keys from secure storage
    // Note: Environment variables are not available in the browser
    // API keys should be set via the settings UI
  }, []);

  const handleSend = async () => {
    if (!input.trim() || isLoading) return;

    const messageContent = input.trim();
    setInput('');

    // Create session if none exists
    let sessionId = activeSessionId;
    if (!sessionId) {
      const fileContext = buildFileContext() || undefined;
      sessionId = createSession(activeAgentId, fileContext);
    }

    // Add user message
    addMessage(sessionId, {
      role: 'user',
      content: messageContent
    });

    // Start AI response
    setIsLoading(true);
    const assistantMessageId = addMessage(sessionId, {
      role: 'assistant',
      content: '',
      agentId: activeAgentId,
      isStreaming: true
    });
    setStreamingMessageId(assistantMessageId);

    try {
      const fileContext = activeTab ? buildFileContext() : null;
      const systemPrompt = buildPromptContext(fileContext, activeAgent.systemPrompt);
      
      const provider = createProvider(providers[activeProvider]);
      
      // Build messages array
      const session = useAIAgentsStore.getState().sessions.find(s => s.id === sessionId);
      const messageHistory = session?.messages.slice(0, -1).map(m => ({
        role: m.role,
        content: m.content
      })) || [];

      const request = {
        messages: [
          { role: 'system' as const, content: systemPrompt },
          ...messageHistory,
          { role: 'user' as const, content: messageContent }
        ],
        provider: providers[activeProvider],
        stream: true
      };

      // Stream the response
      let fullContent = '';
      for await (const chunk of provider.stream(request)) {
        fullContent += chunk;
        updateMessage(sessionId, assistantMessageId, {
          content: fullContent
        });
      }

      // Extract actions from final content
      const actions = extractActions(fullContent);
      
      updateMessage(sessionId, assistantMessageId, {
        content: fullContent,
        isStreaming: false,
        actions
      });

    } catch (error) {
      updateMessage(sessionId, assistantMessageId, {
        content: '',
        isStreaming: false,
        error: error instanceof Error ? error.message : 'Failed to get response'
      });
    } finally {
      setIsLoading(false);
      setStreamingMessageId(null);
    }
  };

  const extractActions = (content: string) => {
    const actions = [];
    
    // Extract SQL queries
    const sqlRegex = /```sql\n([\s\S]*?)\n```/g;
    let match;
    while ((match = sqlRegex.exec(content)) !== null) {
      actions.push({
        type: 'query' as const,
        label: 'Run SQL Query',
        query: match[1].trim(),
        language: 'sql' as const
      });
    }

    // Extract Python code
    const pythonRegex = /```python\n([\s\S]*?)\n```/g;
    while ((match = pythonRegex.exec(content)) !== null) {
      actions.push({
        type: 'query' as const,
        label: 'Run Python Code',
        query: match[1].trim(),
        language: 'python' as const
      });
    }

    // Extract code snippets for insertion
    const codeRegex = /```(?:javascript|typescript|js|ts|json|regex|html|css)?\n([\s\S]*?)\n```/g;
    while ((match = codeRegex.exec(content)) !== null) {
      const code = match[1].trim();
      if (!actions.find(a => a.query === code)) {
        actions.push({
          type: 'insert' as const,
          label: 'Insert Code',
          code,
          position: 'cursor' as const
        });
      }
    }

    return actions.length > 0 ? actions : undefined;
  };

  const handleAction = (action: any) => {
    switch (action.type) {
      case 'query':
        setQueryLanguage(action.language);
        setQueryPanelOpen(true);
        // The query will be loaded by the QueryPanel component
        // We'll store it temporarily
        (window as any).__pendingQuery = action.query;
        break;
      case 'insert':
        if (activeTab) {
          const { updateTabContent } = useEditorStore.getState();
          const newContent = activeTab.content + '\n' + action.code;
          updateTabContent(activeTab.id, newContent);
        }
        break;
    }
  };

  const handleNewChat = () => {
    const fileContext = buildFileContext() || undefined;
    createSession(activeAgentId, fileContext);
  };

  const startRenameSession = (session: typeof sessions[0]) => {
    setEditingSessionName(session.id);
    setEditName(session.name);
    setShowSessionMenu(null);
  };

  const saveRenameSession = () => {
    if (editingSessionName && editName.trim()) {
      renameSession(editingSessionName, editName.trim());
    }
    setEditingSessionName(null);
    setEditName('');
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
      e.preventDefault();
      handleSend();
    }
  };

  if (!isPanelOpen) {
    return (
      <button
        onClick={togglePanel}
        className="fixed right-4 top-4 z-40 p-2 bg-secondary hover:bg-tertiary rounded-lg shadow-lg border border-border-color transition-colors"
        title="Open AI Agents Panel (Ctrl+Shift+A)"
      >
        <Bot size={20} className="text-accent" />
      </button>
    );
  }

  return (
    <>
      <div
        ref={panelRef}
        className="fixed right-0 top-0 h-full bg-secondary border-l border-border-color flex flex-col z-50 shadow-xl"
        style={{ width: panelWidth }}
      >
        {/* Resize Handle */}
        <div
          ref={resizeRef}
          className="absolute left-0 top-0 bottom-0 w-1 cursor-col-resize hover:bg-accent transition-colors flex items-center justify-center z-10"
        >
          <div className="h-8 w-0.5 bg-border-color rounded-full" />
        </div>

        {/* Header */}
        <div className="flex items-center justify-between p-3 border-b border-border-color bg-tertiary">
          <div className="flex items-center gap-2">
            <Bot size={20} className="text-accent" />
            <span className="font-medium text-text-primary">AI Agents</span>
          </div>
          <div className="flex items-center gap-1">
            <button
              onClick={toggleSettings}
              className="p-1.5 hover:bg-hover rounded transition-colors"
              title="Settings"
            >
              <Settings size={16} className="text-text-secondary" />
            </button>
            <button
              onClick={togglePanel}
              className="p-1.5 hover:bg-hover rounded transition-colors"
              title="Close (Esc)"
            >
              <PanelRight size={16} className="text-text-secondary" />
            </button>
          </div>
        </div>

        {/* Agent Selector */}
        <div className="p-3 border-b border-border-color">
          <button
            onClick={() => setShowAgentSelector(!showAgentSelector)}
            className="w-full flex items-center justify-between p-2 bg-primary hover:bg-hover rounded-lg transition-colors"
          >
            <div className="flex items-center gap-2">
              <span className="text-xl">{activeAgent.icon}</span>
              <div className="text-left">
                <div className="text-sm font-medium text-text-primary">{activeAgent.name}</div>
                <div className="text-xs text-text-secondary truncate max-w-[180px]">
                  {activeAgent.description}
                </div>
              </div>
            </div>
            <ChevronDown size={16} className={`text-text-secondary transition-transform ${showAgentSelector ? 'rotate-180' : ''}`} />
          </button>

          {showAgentSelector && (
            <div className="mt-2 max-h-64 overflow-y-auto">
              <AgentSelector
                agents={agents}
                activeAgentId={activeAgentId}
                onSelect={(agent) => {
                  useAIAgentsStore.getState().setActiveAgent(agent.id);
                  setShowAgentSelector(false);
                }}
              />
            </div>
          )}
        </div>

        {/* Session List */}
        {sessions.length > 0 && (
          <div className="max-h-32 overflow-y-auto border-b border-border-color bg-primary/50">
            <div className="px-3 py-2 text-xs font-medium text-text-secondary uppercase tracking-wider flex items-center justify-between">
              <span>Recent Chats</span>
              <span className="text-[10px] bg-tertiary px-1.5 py-0.5 rounded">{sessions.length}</span>
            </div>
            {sessions.slice(0, 5).map(session => (
              <div
                key={session.id}
                onClick={() => setActiveSession(session.id)}
                className={`group px-3 py-2 cursor-pointer flex items-center justify-between hover:bg-hover ${
                  session.id === activeSessionId ? 'bg-accent/10' : ''
                }`}
              >
                {editingSessionName === session.id ? (
                  <input
                    type="text"
                    value={editName}
                    onChange={(e) => setEditName(e.target.value)}
                    onBlur={saveRenameSession}
                    onKeyDown={(e) => e.key === 'Enter' && saveRenameSession()}
                    autoFocus
                    className="flex-1 bg-primary border border-accent rounded px-2 py-0.5 text-sm"
                    onClick={(e) => e.stopPropagation()}
                  />
                ) : (
                  <>
                    <div className="flex items-center gap-2 flex-1 min-w-0">
                      <MessageSquare size={14} className="text-text-secondary flex-shrink-0" />
                      <span className="text-sm text-text-primary truncate">{session.name}</span>
                    </div>
                    <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setShowSessionMenu(showSessionMenu === session.id ? null : session.id);
                        }}
                        className="p-1 hover:bg-tertiary rounded"
                      >
                        <MoreVertical size={12} className="text-text-secondary" />
                      </button>
                    </div>
                  </>
                )}
                
                {showSessionMenu === session.id && (
                  <div className="absolute right-4 mt-16 w-32 bg-secondary border border-border-color rounded-lg shadow-lg z-20">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        startRenameSession(session);
                      }}
                      className="w-full px-3 py-2 text-sm text-left hover:bg-hover text-text-primary"
                    >
                      Rename
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        deleteSession(session.id);
                        setShowSessionMenu(null);
                      }}
                      className="w-full px-3 py-2 text-sm text-left hover:bg-hover text-red-400"
                    >
                      Delete
                    </button>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}

        {/* Messages Area */}
        <div className="flex-1 overflow-y-auto p-3 space-y-4">
          {!activeSession ? (
            <div className="h-full flex flex-col items-center justify-center text-center p-4">
              <Sparkles size={48} className="text-accent/50 mb-4" />
              <h3 className="text-lg font-medium text-text-primary mb-2">
                Start a conversation
              </h3>
              <p className="text-sm text-text-secondary mb-6">
                Ask questions about your files, get help with code, or analyze data.
              </p>
              {activeTab && (
                <div className="text-xs text-text-secondary bg-primary px-3 py-2 rounded">
                  Current file: <span className="text-accent">{activeTab.name}</span>
                </div>
              )}
            </div>
          ) : (
            <>
              {activeSession.messages.map((message) => (
                <ChatMessage
                  key={message.id}
                  message={message}
                  agent={message.agentId ? agents.find(a => a.id === message.agentId) : undefined}
                  onAction={handleAction}
                />
              ))}
              {isLoading && !activeSession.messages.find(m => m.isStreaming) && (
                <div className="flex items-center gap-2 text-text-secondary">
                  <Loader2 size={16} className="animate-spin" />
                  <span className="text-sm">Thinking...</span>
                </div>
              )}
              <div ref={messagesEndRef} />
            </>
          )}
        </div>

        {/* Input Area */}
        <div className="p-3 border-t border-border-color bg-tertiary">
          <div className="flex items-end gap-2">
            <button
              onClick={handleNewChat}
              className="p-2 hover:bg-hover rounded-lg transition-colors flex-shrink-0"
              title="New Chat"
            >
              <Plus size={18} className="text-text-secondary" />
            </button>
            <div className="flex-1 relative">
              <textarea
                ref={inputRef}
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder={activeTab ? `Ask about ${activeTab.name}...` : "Ask anything..."}
                className="w-full bg-primary border border-border-color rounded-lg px-3 py-2 pr-10 text-sm text-text-primary placeholder:text-text-secondary resize-none focus:outline-none focus:border-accent"
                rows={Math.min(5, input.split('\n').length || 1)}
                style={{ minHeight: '40px', maxHeight: '120px' }}
              />
              <button
                onClick={handleSend}
                disabled={!input.trim() || isLoading}
                className="absolute right-2 bottom-2 p-1.5 bg-accent hover:bg-accent/90 disabled:opacity-50 disabled:cursor-not-allowed rounded-md transition-colors"
              >
                <Send size={14} className="text-white" />
              </button>
            </div>
          </div>
          <div className="flex items-center justify-between mt-2 text-xs text-text-secondary">
            <span>Ctrl+Enter to send</span>
            <span>{activeProvider === 'openai' ? 'GPT-4' : activeProvider === 'anthropic' ? 'Claude' : activeProvider}</span>
          </div>
        </div>
      </div>

      {/* Settings Modal */}
      {showSettings && <AISettings onClose={toggleSettings} />}
    </>
  );
};

export default AIAgentsPanel;
