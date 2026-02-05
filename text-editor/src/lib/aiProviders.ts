import OpenAI from 'openai';
import { AIProviderConfig, AIRequest, AIResponse, AIAction } from '../types/ai';

// API Key storage using a simple in-memory store (in production, use secure storage)
const apiKeyStore: Record<string, string> = {};

export const setAPIKey = (provider: string, apiKey: string) => {
  apiKeyStore[provider] = apiKey;
};

export const getAPIKey = (provider: string): string | undefined => {
  return apiKeyStore[provider];
};

export const hasAPIKey = (provider: string): boolean => {
  return !!apiKeyStore[provider];
};

// OpenAI Provider
export class OpenAIProvider {
  private client: OpenAI | null = null;
  private config: AIProviderConfig;

  constructor(config: AIProviderConfig) {
    this.config = config;
    const apiKey = apiKeyStore.openai || config.apiKey;
    if (apiKey) {
      this.client = new OpenAI({
        apiKey,
        dangerouslyAllowBrowser: true
      });
    }
  }

  async complete(request: AIRequest): Promise<AIResponse> {
    if (!this.client) {
      return { content: '', error: 'OpenAI API key not configured' };
    }

    try {
      // For non-streaming, explicitly set stream to false
      const response = await this.client.chat.completions.create({
        model: this.config.model,
        messages: request.messages,
        temperature: this.config.temperature,
        max_tokens: this.config.maxTokens,
        stream: false
      });

      const content = response.choices[0]?.message?.content || '';
      const actions = this.extractActions(content);

      return {
        content: this.cleanContent(content),
        actions,
        usage: {
          promptTokens: response.usage?.prompt_tokens || 0,
          completionTokens: response.usage?.completion_tokens || 0,
          totalTokens: response.usage?.total_tokens || 0
        }
      };
    } catch (error) {
      return {
        content: '',
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  async *stream(request: AIRequest): AsyncGenerator<string, void, unknown> {
    if (!this.client) {
      throw new Error('OpenAI API key not configured');
    }

    const response = await this.client.chat.completions.create({
      model: this.config.model,
      messages: request.messages,
      temperature: this.config.temperature,
      max_tokens: this.config.maxTokens,
      stream: true
    });

    for await (const chunk of response) {
      const content = chunk.choices[0]?.delta?.content;
      if (content) {
        yield content;
      }
    }
  }

  private extractActions(content: string): AIAction[] | undefined {
    const actions: AIAction[] = [];
    
    // Extract SQL queries
    const sqlRegex = /```sql\n([\s\S]*?)\n```/g;
    let match;
    while ((match = sqlRegex.exec(content)) !== null) {
      actions.push({
        type: 'query',
        label: 'Run SQL Query',
        query: match[1].trim(),
        language: 'sql'
      });
    }

    // Extract Python code
    const pythonRegex = /```python\n([\s\S]*?)\n```/g;
    while ((match = pythonRegex.exec(content)) !== null) {
      actions.push({
        type: 'query',
        label: 'Run Python Code',
        query: match[1].trim(),
        language: 'python'
      });
    }

    // Extract code snippets for insertion
    const codeRegex = /```(?:javascript|typescript|js|ts|json|regex)?\n([\s\S]*?)\n```/g;
    while ((match = codeRegex.exec(content)) !== null) {
      const code = match[1].trim();
      // Don't add if already added as SQL or Python
      if (!actions.find(a => a.query === code)) {
        actions.push({
          type: 'insert',
          label: 'Insert Code',
          code,
          position: 'cursor'
        });
      }
    }

    return actions.length > 0 ? actions : undefined;
  }

  private cleanContent(content: string): string {
    // Remove action markers from displayed content if needed
    return content;
  }
}

// Anthropic Provider
export class AnthropicProvider {
  private apiKey: string | undefined;
  private config: AIProviderConfig;

  constructor(config: AIProviderConfig) {
    this.config = config;
    this.apiKey = apiKeyStore.anthropic || config.apiKey;
  }

  async complete(request: AIRequest): Promise<AIResponse> {
    if (!this.apiKey) {
      return { content: '', error: 'Anthropic API key not configured' };
    }

    try {
      const response = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': this.apiKey,
          'anthropic-version': '2023-06-01'
        },
        body: JSON.stringify({
          model: this.config.model,
          messages: request.messages.map(m => ({
            role: m.role === 'user' ? 'user' : 'assistant',
            content: m.content
          })),
          max_tokens: this.config.maxTokens,
          temperature: this.config.temperature,
          stream: false
        })
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error?.message || 'Anthropic API error');
      }

      const data = await response.json();
      const content = data.content?.[0]?.text || '';
      const actions = this.extractActions(content);

      return {
        content: this.cleanContent(content),
        actions,
        usage: {
          promptTokens: data.usage?.input_tokens || 0,
          completionTokens: data.usage?.output_tokens || 0,
          totalTokens: (data.usage?.input_tokens || 0) + (data.usage?.output_tokens || 0)
        }
      };
    } catch (error) {
      return {
        content: '',
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  async *stream(request: AIRequest): AsyncGenerator<string, void, unknown> {
    if (!this.apiKey) {
      throw new Error('Anthropic API key not configured');
    }

    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': this.apiKey,
        'anthropic-version': '2023-06-01'
      },
      body: JSON.stringify({
        model: this.config.model,
        messages: request.messages.map(m => ({
          role: m.role === 'user' ? 'user' : 'assistant',
          content: m.content
        })),
        max_tokens: this.config.maxTokens,
        temperature: this.config.temperature,
        stream: true
      })
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error?.message || 'Anthropic API error');
    }

    const reader = response.body?.getReader();
    if (!reader) throw new Error('No response body');

    const decoder = new TextDecoder();
    let buffer = '';

    try {
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() || '';

        for (const line of lines) {
          if (line.startsWith('data: ')) {
            const data = line.slice(6);
            if (data === '[DONE]') return;
            
            try {
              const parsed = JSON.parse(data);
              const content = parsed.delta?.text;
              if (content) {
                yield content;
              }
            } catch {
              // Ignore parse errors
            }
          }
        }
      }
    } finally {
      reader.releaseLock();
    }
  }

  private extractActions(content: string): AIAction[] | undefined {
    const actions: AIAction[] = [];
    
    // Extract SQL queries
    const sqlRegex = /```sql\n([\s\S]*?)\n```/g;
    let match;
    while ((match = sqlRegex.exec(content)) !== null) {
      actions.push({
        type: 'query',
        label: 'Run SQL Query',
        query: match[1].trim(),
        language: 'sql'
      });
    }

    // Extract Python code
    const pythonRegex = /```python\n([\s\S]*?)\n```/g;
    while ((match = pythonRegex.exec(content)) !== null) {
      actions.push({
        type: 'query',
        label: 'Run Python Code',
        query: match[1].trim(),
        language: 'python'
      });
    }

    // Extract code snippets for insertion
    const codeRegex = /```(?:javascript|typescript|js|ts|json|regex)?\n([\s\S]*?)\n```/g;
    while ((match = codeRegex.exec(content)) !== null) {
      const code = match[1].trim();
      if (!actions.find(a => a.query === code)) {
        actions.push({
          type: 'insert',
          label: 'Insert Code',
          code,
          position: 'cursor'
        });
      }
    }

    return actions.length > 0 ? actions : undefined;
  }

  private cleanContent(content: string): string {
    return content;
  }
}

// Ollama Provider (local)
export class OllamaProvider {
  private config: AIProviderConfig;

  constructor(config: AIProviderConfig) {
    this.config = config;
  }

  async complete(request: AIRequest): Promise<AIResponse> {
    const baseUrl = this.config.baseUrl || 'http://localhost:11434';

    try {
      const response = await fetch(`${baseUrl}/api/chat`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          model: this.config.model,
          messages: request.messages,
          stream: false,
          options: {
            temperature: this.config.temperature,
            num_predict: this.config.maxTokens
          }
        })
      });

      if (!response.ok) {
        throw new Error(`Ollama error: ${response.statusText}`);
      }

      const data = await response.json();
      const content = data.message?.content || '';
      const actions = this.extractActions(content);

      return {
        content: this.cleanContent(content),
        actions
      };
    } catch (error) {
      return {
        content: '',
        error: error instanceof Error 
          ? error.message 
          : 'Failed to connect to Ollama. Make sure it\'s running locally.'
      };
    }
  }

  async *stream(request: AIRequest): AsyncGenerator<string, void, unknown> {
    const baseUrl = this.config.baseUrl || 'http://localhost:11434';

    const response = await fetch(`${baseUrl}/api/chat`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: this.config.model,
        messages: request.messages,
        stream: true,
        options: {
          temperature: this.config.temperature,
          num_predict: this.config.maxTokens
        }
      })
    });

    if (!response.ok) {
      throw new Error(`Ollama error: ${response.statusText}`);
    }

    const reader = response.body?.getReader();
    if (!reader) throw new Error('No response body');

    const decoder = new TextDecoder();

    try {
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const chunk = decoder.decode(value);
        const lines = chunk.split('\n').filter(line => line.trim());

        for (const line of lines) {
          try {
            const data = JSON.parse(line);
            if (data.message?.content) {
              yield data.message.content;
            }
            if (data.done) {
              return;
            }
          } catch {
            // Ignore parse errors
          }
        }
      }
    } finally {
      reader.releaseLock();
    }
  }

  async listModels(): Promise<string[]> {
    const baseUrl = this.config.baseUrl || 'http://localhost:11434';
    
    try {
      const response = await fetch(`${baseUrl}/api/tags`);
      if (!response.ok) return [];
      
      const data = await response.json();
      return data.models?.map((m: { name: string }) => m.name) || [];
    } catch {
      return [];
    }
  }

  private extractActions(content: string): AIAction[] | undefined {
    const actions: AIAction[] = [];
    
    const sqlRegex = /```sql\n([\s\S]*?)\n```/g;
    let match;
    while ((match = sqlRegex.exec(content)) !== null) {
      actions.push({
        type: 'query',
        label: 'Run SQL Query',
        query: match[1].trim(),
        language: 'sql'
      });
    }

    const pythonRegex = /```python\n([\s\S]*?)\n```/g;
    while ((match = pythonRegex.exec(content)) !== null) {
      actions.push({
        type: 'query',
        label: 'Run Python Code',
        query: match[1].trim(),
        language: 'python'
      });
    }

    return actions.length > 0 ? actions : undefined;
  }

  private cleanContent(content: string): string {
    return content;
  }
}

// Custom/OpenAI-compatible Provider
export class CustomProvider {
  private config: AIProviderConfig;

  constructor(config: AIProviderConfig) {
    this.config = config;
  }

  async complete(request: AIRequest): Promise<AIResponse> {
    if (!this.config.baseUrl) {
      return { content: '', error: 'Custom provider base URL not configured' };
    }

    try {
      const response = await fetch(`${this.config.baseUrl}/chat/completions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(this.config.apiKey && { 'Authorization': `Bearer ${this.config.apiKey}` })
        },
        body: JSON.stringify({
          model: this.config.model,
          messages: request.messages,
          temperature: this.config.temperature,
          max_tokens: this.config.maxTokens,
          stream: false
        })
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error?.message || 'Custom provider error');
      }

      const data = await response.json();
      const content = data.choices?.[0]?.message?.content || '';

      return {
        content,
        usage: {
          promptTokens: data.usage?.prompt_tokens || 0,
          completionTokens: data.usage?.completion_tokens || 0,
          totalTokens: data.usage?.total_tokens || 0
        }
      };
    } catch (error) {
      return {
        content: '',
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  async *stream(request: AIRequest): AsyncGenerator<string, void, unknown> {
    if (!this.config.baseUrl) {
      throw new Error('Custom provider base URL not configured');
    }

    const response = await fetch(`${this.config.baseUrl}/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(this.config.apiKey && { 'Authorization': `Bearer ${this.config.apiKey}` })
      },
      body: JSON.stringify({
        model: this.config.model,
        messages: request.messages,
        temperature: this.config.temperature,
        max_tokens: this.config.maxTokens,
        stream: true
      })
    });

    if (!response.ok) {
      throw new Error('Custom provider error');
    }

    const reader = response.body?.getReader();
    if (!reader) throw new Error('No response body');

    const decoder = new TextDecoder();
    let buffer = '';

    try {
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() || '';

        for (const line of lines) {
          if (line.startsWith('data: ')) {
            const data = line.slice(6);
            if (data === '[DONE]') return;
            
            try {
              const parsed = JSON.parse(data);
              const content = parsed.choices?.[0]?.delta?.content;
              if (content) {
                yield content;
              }
            } catch {
              // Ignore parse errors
            }
          }
        }
      }
    } finally {
      reader.releaseLock();
    }
  }
}

// Factory function to get the right provider
export const createProvider = (config: AIProviderConfig) => {
  switch (config.provider) {
    case 'openai':
      return new OpenAIProvider(config);
    case 'anthropic':
      return new AnthropicProvider(config);
    case 'ollama':
      return new OllamaProvider(config);
    case 'custom':
      return new CustomProvider(config);
    default:
      throw new Error(`Unknown provider: ${config.provider}`);
  }
};

// Available models for each provider
export const providerModels: Record<string, string[]> = {
  openai: [
    'gpt-4o',
    'gpt-4o-mini',
    'gpt-4-turbo',
    'gpt-4',
    'gpt-3.5-turbo'
  ],
  anthropic: [
    'claude-3-5-sonnet-20241022',
    'claude-3-5-haiku-20241022',
    'claude-3-opus-20240229',
    'claude-3-sonnet-20240229',
    'claude-3-haiku-20240307'
  ],
  ollama: [
    'llama3.2',
    'llama3.1',
    'llama3',
    'mistral',
    'codellama',
    'phi4',
    'qwen2.5'
  ],
  custom: [] // User-defined
};

export const providerInfo: Record<string, { name: string; description: string; requiresKey: boolean; requiresBaseUrl: boolean }> = {
  openai: {
    name: 'OpenAI',
    description: 'GPT-4 and GPT-3.5 models via OpenAI API',
    requiresKey: true,
    requiresBaseUrl: false
  },
  anthropic: {
    name: 'Anthropic',
    description: 'Claude models via Anthropic API',
    requiresKey: true,
    requiresBaseUrl: false
  },
  ollama: {
    name: 'Ollama',
    description: 'Local models via Ollama (runs on your machine)',
    requiresKey: false,
    requiresBaseUrl: true
  },
  custom: {
    name: 'Custom',
    description: 'OpenAI-compatible API endpoint',
    requiresKey: false,
    requiresBaseUrl: true
  }
};
