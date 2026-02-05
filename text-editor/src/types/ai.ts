// AI Agents Panel Types and Interfaces

export type AIProviderId = 'openai' | 'anthropic' | 'ollama' | 'custom';
export type AgentCapability = 'query' | 'generate' | 'analyze' | 'transform' | 'explain' | 'visualize';

export interface AIProvider {
  id: AIProviderId;
  name: string;
  baseUrl: string;
  apiKeyRequired: boolean;
  models: string[];
  defaultModel: string;
  description: string;
}

export interface AIProviderConfig {
  provider: AIProviderId;
  apiKey?: string;
  baseUrl?: string;
  model: string;
  temperature: number;
  maxTokens: number;
  contextWindow: number; // Max characters of file content to send
}

export interface Agent {
  id: string;
  name: string;
  description: string;
  systemPrompt: string;
  icon: string;
  capabilities: AgentCapability[];
  color: string;
  defaultProvider: AIProviderId;
  defaultModel: string;
}

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: number;
  agentId?: string;
  actions?: AIAction[];
  isStreaming?: boolean;
  error?: string;
}

export type AIActionType = 'query' | 'insert' | 'replace' | 'explain' | 'transform' | 'visualize';

export interface AIAction {
  type: AIActionType;
  label: string;
  description?: string;
  query?: string;
  code?: string;
  language?: 'sql' | 'python' | 'javascript' | 'json' | 'regex';
  position?: 'cursor' | 'start' | 'end' | 'selection' | 'replace';
}

export interface FileContext {
  filePath: string;
  fileName: string;
  fileExtension: string;
  fileType: 'data' | 'code' | 'text' | 'log' | 'config' | 'unknown';
  content: string;
  contentPreview: string;
  lineCount: number;
  schema?: DataSchema; // For structured data (CSV, JSON)
  selectedText?: string;
  cursorPosition?: { line: number; column: number };
}

export interface DataSchema {
  columns?: string[];
  sampleRows?: any[];
  totalRows?: number;
  inferredTypes?: Record<string, string>;
}

export interface AIRequest {
  messages: { role: 'user' | 'assistant' | 'system'; content: string }[];
  provider: AIProviderConfig;
  stream?: boolean;
}

export interface AIResponse {
  content: string;
  actions?: AIAction[];
  usage?: {
    promptTokens: number;
    completionTokens: number;
    totalTokens: number;
  };
  error?: string;
}

export interface ChatSession {
  id: string;
  name: string;
  agentId: string;
  messages: ChatMessage[];
  createdAt: number;
  updatedAt: number;
  fileContext?: FileContext;
}

// Agent-specific context builders
export interface ContextBuilderOptions {
  maxContentLength: number;
  includeSchema: boolean;
  includeSampleData: boolean;
  sampleRows: number;
}

export const DEFAULT_CONTEXT_OPTIONS: ContextBuilderOptions = {
  maxContentLength: 8000,
  includeSchema: true,
  includeSampleData: true,
  sampleRows: 10,
};

// File type detection
export const getFileType = (extension: string): FileContext['fileType'] => {
  const dataExtensions = ['csv', 'tsv', 'json', 'jsonl', 'parquet', 'xlsx', 'yaml', 'yml', 'xml'];
  const codeExtensions = ['js', 'ts', 'jsx', 'tsx', 'py', 'rs', 'go', 'java', 'cpp', 'c', 'h', 'rb', 'php', 'swift', 'kt'];
  const logExtensions = ['log', 'logs'];
  const configExtensions = ['toml', 'ini', 'conf', 'config', 'env'];
  
  const ext = extension.toLowerCase();
  
  if (dataExtensions.includes(ext)) return 'data';
  if (codeExtensions.includes(ext)) return 'code';
  if (logExtensions.includes(ext)) return 'log';
  if (configExtensions.includes(ext)) return 'config';
  return 'text';
};

// Check if file type supports structured queries
export const supportsQueries = (fileType: FileContext['fileType']): boolean => {
  return fileType === 'data';
};
