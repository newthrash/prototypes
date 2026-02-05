import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { 
  AIProviderConfig, 
  Agent, 
  ChatMessage, 
  ChatSession, 
  FileContext,
  AIProviderId 
} from '../types/ai';

// Pre-configured default agents
export const defaultAgents: Agent[] = [
  {
    id: 'data-analyst',
    name: 'Data Analyst',
    description: 'Analyzes CSV, JSON, and data files to find patterns and insights',
    icon: '📊',
    systemPrompt: `You are a data analyst specializing in structured data analysis. You help users understand their data files (CSV, JSON, TSV, etc.) by:
- Analyzing data structure and schemas
- Finding patterns, trends, and anomalies
- Suggesting SQL queries or Python code for data exploration
- Explaining data relationships and statistics
- Recommending data cleaning or transformation steps

When responding:
- Provide clear, actionable insights
- Suggest specific queries the user can run
- Format data summaries in readable tables
- Highlight important findings`,
    capabilities: ['analyze', 'query', 'transform', 'explain'],
    color: '#3b82f6',
    defaultProvider: 'openai',
    defaultModel: 'gpt-4o'
  },
  {
    id: 'code-reviewer',
    name: 'Code Reviewer',
    description: 'Reviews code for quality, bugs, and best practices',
    icon: '🔍',
    systemPrompt: `You are a senior software engineer performing code reviews. You help developers by:
- Identifying bugs and potential issues
- Suggesting performance improvements
- Ensuring code follows best practices
- Checking for security vulnerabilities
- Recommending refactoring when appropriate

When reviewing code:
- Be constructive and specific
- Explain the "why" behind suggestions
- Prioritize critical issues
- Suggest concrete fixes with code examples`,
    capabilities: ['analyze', 'explain', 'generate'],
    color: '#10b981',
    defaultProvider: 'openai',
    defaultModel: 'gpt-4o'
  },
  {
    id: 'log-analyzer',
    name: 'Log Analyzer',
    description: 'Parses log files and finds patterns, errors, and insights',
    icon: '📋',
    systemPrompt: `You are a log analysis expert. You help users understand log files by:
- Identifying error patterns and their frequency
- Finding root causes of issues
- Extracting timing and performance metrics
- Parsing structured and unstructured logs
- Suggesting regex patterns for log filtering

When analyzing logs:
- Highlight critical errors first
- Group similar messages together
- Provide timestamps and frequency counts
- Suggest tools or queries for deeper analysis`,
    capabilities: ['analyze', 'query', 'explain'],
    color: '#f59e0b',
    defaultProvider: 'openai',
    defaultModel: 'gpt-4o'
  },
  {
    id: 'regex-expert',
    name: 'Regex Expert',
    description: 'Helps with regex patterns, testing, and explanations',
    icon: '🔤',
    systemPrompt: `You are a regular expression expert. You help users by:
- Building regex patterns for specific needs
- Explaining complex regex in plain English
- Testing patterns against sample data
- Optimizing regex for performance
- Converting between different regex flavors

When working with regex:
- Provide the pattern and a clear explanation
- Include test cases showing matches
- Explain what each part of the pattern does
- Warn about potential edge cases`,
    capabilities: ['generate', 'explain', 'analyze'],
    color: '#8b5cf6',
    defaultProvider: 'openai',
    defaultModel: 'gpt-4o'
  },
  {
    id: 'json-wrangler',
    name: 'JSON Wrangler',
    description: 'Helps transform, query, and manipulate JSON data',
    icon: '🗂️',
    systemPrompt: `You are a JSON data specialist. You help users work with JSON by:
- Transforming JSON structures
- Suggesting jq or JavaScript operations
- Flattening nested data
- Validating and formatting JSON
- Converting between JSON and other formats

When working with JSON:
- Show before/after examples
- Suggest practical transformations
- Provide working code snippets
- Handle edge cases like null values`,
    capabilities: ['transform', 'query', 'generate', 'explain'],
    color: '#06b6d4',
    defaultProvider: 'openai',
    defaultModel: 'gpt-4o'
  },
  {
    id: 'sql-assistant',
    name: 'SQL Assistant',
    description: 'Writes and optimizes SQL queries for data analysis',
    icon: '🗃️',
    systemPrompt: `You are a SQL expert specializing in DuckDB syntax. You help users by:
- Writing queries for data analysis
- Optimizing slow queries
- Explaining query execution plans
- Converting between SQL dialects
- Suggesting indexes and optimizations

When writing SQL:
- Use DuckDB-compatible syntax
- Include comments for complex logic
- Consider performance implications
- Provide alternative approaches when relevant`,
    capabilities: ['query', 'generate', 'explain', 'analyze'],
    color: '#ec4899',
    defaultProvider: 'openai',
    defaultModel: 'gpt-4o'
  }
];

// Default provider configurations
const createDefaultProviderConfig = (provider: AIProviderId): AIProviderConfig => ({
  provider,
  model: provider === 'openai' ? 'gpt-4o' : 
         provider === 'anthropic' ? 'claude-3-5-sonnet-20241022' :
         provider === 'ollama' ? 'llama3.2' : '',
  temperature: 0.7,
  maxTokens: 4096,
  contextWindow: 8000,
  apiKey: '',
  baseUrl: provider === 'ollama' ? 'http://localhost:11434' : undefined
});

// State interface
interface AIAgentsState {
  // Panel state
  isPanelOpen: boolean;
  panelWidth: number;
  showSettings: boolean;
  
  // Providers
  providers: Record<AIProviderId, AIProviderConfig>;
  activeProvider: AIProviderId;
  
  // Agents
  agents: Agent[];
  activeAgentId: string;
  
  // Chat
  sessions: ChatSession[];
  activeSessionId: string | null;
  
  // UI State
  isLoading: boolean;
  streamingMessageId: string | null;
}

// Actions interface
interface AIAgentsActions {
  // Panel actions
  togglePanel: () => void;
  setPanelOpen: (open: boolean) => void;
  setPanelWidth: (width: number) => void;
  
  // Provider actions
  setProviderConfig: (provider: AIProviderId, config: Partial<AIProviderConfig>) => void;
  setActiveProvider: (provider: AIProviderId) => void;
  
  // Agent actions
  setActiveAgent: (agentId: string) => void;
  addCustomAgent: (agent: Agent) => void;
  removeCustomAgent: (agentId: string) => void;
  updateAgent: (agentId: string, updates: Partial<Agent>) => void;
  
  // Session/Chat actions
  createSession: (agentId?: string, fileContext?: FileContext) => string;
  deleteSession: (sessionId: string) => void;
  setActiveSession: (sessionId: string | null) => void;
  renameSession: (sessionId: string, name: string) => void;
  clearAllSessions: () => void;
  
  // Message actions
  addMessage: (sessionId: string, message: Omit<ChatMessage, 'id' | 'timestamp'>) => string;
  updateMessage: (sessionId: string, messageId: string, updates: Partial<ChatMessage>) => void;
  clearSessionMessages: (sessionId: string) => void;
  deleteMessage: (sessionId: string, messageId: string) => void;
  
  // Settings
  toggleSettings: () => void;
  setShowSettings: (show: boolean) => void;
  
  // Loading state
  setIsLoading: (loading: boolean) => void;
  setStreamingMessageId: (messageId: string | null) => void;
}

const generateId = () => Math.random().toString(36).substring(2, 9);

export const useAIAgentsStore = create<AIAgentsState & AIAgentsActions>()(
  persist(
    (set, get) => ({
      // Initial state
      isPanelOpen: false,
      panelWidth: 380,
      showSettings: false,
      
      providers: {
        openai: createDefaultProviderConfig('openai'),
        anthropic: createDefaultProviderConfig('anthropic'),
        ollama: createDefaultProviderConfig('ollama'),
        custom: createDefaultProviderConfig('custom')
      },
      activeProvider: 'openai',
      
      agents: [...defaultAgents],
      activeAgentId: 'data-analyst',
      
      sessions: [],
      activeSessionId: null,
      
      isLoading: false,
      streamingMessageId: null,

      // Panel actions
      togglePanel: () => set(state => ({ isPanelOpen: !state.isPanelOpen })),
      setPanelOpen: (open) => set({ isPanelOpen: open }),
      setPanelWidth: (width) => set({ panelWidth: Math.max(300, Math.min(600, width)) }),
      
      // Provider actions
      setProviderConfig: (provider, config) => {
        set(state => ({
          providers: {
            ...state.providers,
            [provider]: { ...state.providers[provider], ...config }
          }
        }));
      },
      setActiveProvider: (provider) => set({ activeProvider: provider }),
      
      // Agent actions
      setActiveAgent: (agentId) => set({ activeAgentId: agentId }),
      addCustomAgent: (agent) => {
        set(state => ({ agents: [...state.agents, agent] }));
      },
      removeCustomAgent: (agentId) => {
        set(state => ({
          agents: state.agents.filter(a => a.id !== agentId),
          activeAgentId: state.activeAgentId === agentId ? defaultAgents[0].id : state.activeAgentId
        }));
      },
      updateAgent: (agentId, updates) => {
        set(state => ({
          agents: state.agents.map(a => a.id === agentId ? { ...a, ...updates } : a)
        }));
      },
      
      // Session actions
      createSession: (agentId, fileContext) => {
        const id = generateId();
        const agent = get().agents.find(a => a.id === (agentId || get().activeAgentId));
        const newSession: ChatSession = {
          id,
          name: fileContext 
            ? `${agent?.name || 'Chat'} - ${fileContext.fileName}`
            : `${agent?.name || 'Chat'} ${new Date().toLocaleTimeString()}`,
          agentId: agentId || get().activeAgentId,
          messages: [],
          createdAt: Date.now(),
          updatedAt: Date.now(),
          fileContext
        };
        set(state => ({
          sessions: [newSession, ...state.sessions],
          activeSessionId: id
        }));
        return id;
      },
      deleteSession: (sessionId) => {
        set(state => {
          const newSessions = state.sessions.filter(s => s.id !== sessionId);
          return {
            sessions: newSessions,
            activeSessionId: state.activeSessionId === sessionId 
              ? (newSessions[0]?.id || null)
              : state.activeSessionId
          };
        });
      },
      setActiveSession: (sessionId) => set({ activeSessionId: sessionId }),
      renameSession: (sessionId, name) => {
        set(state => ({
          sessions: state.sessions.map(s => 
            s.id === sessionId ? { ...s, name, updatedAt: Date.now() } : s
          )
        }));
      },
      clearAllSessions: () => set({ sessions: [], activeSessionId: null }),
      
      // Message actions
      addMessage: (sessionId, message) => {
        const newMessage: ChatMessage = {
          ...message,
          id: generateId(),
          timestamp: Date.now()
        };
        set(state => ({
          sessions: state.sessions.map(s => 
            s.id === sessionId 
              ? { ...s, messages: [...s.messages, newMessage], updatedAt: Date.now() }
              : s
          )
        }));
        return newMessage.id;
      },
      updateMessage: (sessionId, messageId, updates) => {
        set(state => ({
          sessions: state.sessions.map(s => 
            s.id === sessionId 
              ? {
                  ...s,
                  messages: s.messages.map(m => m.id === messageId ? { ...m, ...updates } : m),
                  updatedAt: Date.now()
                }
              : s
          )
        }));
      },
      clearSessionMessages: (sessionId) => {
        set(state => ({
          sessions: state.sessions.map(s => 
            s.id === sessionId ? { ...s, messages: [], updatedAt: Date.now() } : s
          )
        }));
      },
      deleteMessage: (sessionId, messageId) => {
        set(state => ({
          sessions: state.sessions.map(s => 
            s.id === sessionId 
              ? { ...s, messages: s.messages.filter(m => m.id !== messageId), updatedAt: Date.now() }
              : s
          )
        }));
      },
      
      // Settings
      toggleSettings: () => set(state => ({ showSettings: !state.showSettings })),
      setShowSettings: (show) => set({ showSettings: show }),
      
      // Loading state
      setIsLoading: (loading) => set({ isLoading: loading }),
      setStreamingMessageId: (messageId) => set({ streamingMessageId: messageId })
    }),
    {
      name: 'ai-agents-storage',
      partialize: (state) => ({
        providers: {
          openai: { ...state.providers.openai, apiKey: undefined },
          anthropic: { ...state.providers.anthropic, apiKey: undefined },
          ollama: state.providers.ollama,
          custom: { ...state.providers.custom, apiKey: undefined }
        },
        activeProvider: state.activeProvider,
        agents: state.agents.filter(a => !defaultAgents.find(da => da.id === a.id)),
        activeAgentId: state.activeAgentId,
        panelWidth: state.panelWidth
      })
    }
  )
);
