import { useState } from 'react';
import { X, Eye, EyeOff, Key, Server, Sparkles, ChevronDown } from 'lucide-react';
import { useAIAgentsStore } from '../../stores/aiAgentsStore';
import { providerInfo, providerModels, setAPIKey } from '../../lib/aiProviders';
import { AIProviderId } from '../../types/ai';

interface AISettingsProps {
  onClose: () => void;
}

const AISettings = ({ onClose }: AISettingsProps) => {
  const {
    providers,
    activeProvider,
    setProviderConfig,
    setActiveProvider
  } = useAIAgentsStore();

  const [showKey, setShowKey] = useState<Record<string, boolean>>({});
  const [tempKeys, setTempKeys] = useState<Record<string, string>>({});
  const [ollamaModels, setOllamaModels] = useState<string[]>([]);
  const [testingOllama, setTestingOllama] = useState(false);

  const currentProvider = providers[activeProvider];
  const info = providerInfo[activeProvider];

  const handleSaveKey = (provider: string) => {
    const key = tempKeys[provider];
    if (key) {
      setAPIKey(provider, key);
      setProviderConfig(provider as AIProviderId, { apiKey: key });
      setTempKeys({ ...tempKeys, [provider]: '' });
    }
  };

  const handleTestOllama = async () => {
    setTestingOllama(true);
    try {
      const baseUrl = providers.ollama.baseUrl || 'http://localhost:11434';
      const response = await fetch(`${baseUrl}/api/tags`);
      if (response.ok) {
        const data = await response.json();
        const models = data.models?.map((m: { name: string }) => m.name) || [];
        setOllamaModels(models);
        alert(`Connected! Found ${models.length} models.`);
      } else {
        alert('Failed to connect to Ollama');
      }
    } catch {
      alert('Failed to connect. Make sure Ollama is running.');
    } finally {
      setTestingOllama(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50">
      <div className="w-[600px] max-h-[80vh] bg-secondary rounded-lg shadow-xl flex flex-col overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-border-color">
          <div className="flex items-center gap-2">
            <Sparkles size={20} className="text-accent" />
            <h2 className="text-lg font-semibold text-text-primary">AI Settings</h2>
          </div>
          <button
            onClick={onClose}
            className="p-1 hover:bg-hover rounded text-text-secondary hover:text-text-primary"
          >
            <X size={20} />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-4 space-y-6">
          {/* Provider Selection */}
          <div className="space-y-3">
            <label className="text-sm font-medium text-text-primary flex items-center gap-2">
              <Server size={16} />
              AI Provider
            </label>
            <div className="grid grid-cols-2 gap-2">
              {(Object.keys(providerInfo) as AIProviderId[]).map((providerId) => (
                <button
                  key={providerId}
                  onClick={() => setActiveProvider(providerId)}
                  className={`p-3 rounded-lg border text-left transition-colors ${
                    activeProvider === providerId
                      ? 'border-accent bg-accent/10'
                      : 'border-border-color hover:border-accent/50 hover:bg-tertiary'
                  }`}
                >
                  <div className="font-medium text-text-primary">
                    {providerInfo[providerId].name}
                  </div>
                  <div className="text-xs text-text-secondary mt-1">
                    {providerInfo[providerId].description}
                  </div>
                </button>
              ))}
            </div>
          </div>

          {/* API Key */}
          {info.requiresKey && (
            <div className="space-y-3">
              <label className="text-sm font-medium text-text-primary flex items-center gap-2">
                <Key size={16} />
                API Key
              </label>
              <div className="flex gap-2">
                <div className="flex-1 relative">
                  <input
                    type={showKey[activeProvider] ? 'text' : 'password'}
                    placeholder={`Enter ${info.name} API key`}
                    value={tempKeys[activeProvider] || ''}
                    onChange={(e) => setTempKeys({ ...tempKeys, [activeProvider]: e.target.value })}
                    className="w-full bg-primary border border-border-color rounded-lg px-3 py-2 pr-10 text-sm text-text-primary placeholder:text-text-secondary focus:outline-none focus:border-accent"
                  />
                  <button
                    onClick={() => setShowKey({ ...showKey, [activeProvider]: !showKey[activeProvider] })}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-text-secondary hover:text-text-primary"
                  >
                    {showKey[activeProvider] ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
                <button
                  onClick={() => handleSaveKey(activeProvider)}
                  disabled={!tempKeys[activeProvider]}
                  className="px-4 py-2 bg-accent hover:bg-accent/90 disabled:opacity-50 text-white text-sm rounded-lg transition-colors"
                >
                  Save
                </button>
              </div>
              <p className="text-xs text-text-secondary">
                Your API key is stored locally and never sent to our servers.
              </p>
            </div>
          )}

          {/* Base URL (for Ollama/Custom) */}
          {info.requiresBaseUrl && (
            <div className="space-y-3">
              <label className="text-sm font-medium text-text-primary">Base URL</label>
              <div className="flex gap-2">
                <input
                  type="text"
                  placeholder={activeProvider === 'ollama' ? 'http://localhost:11434' : 'https://api.example.com/v1'}
                  value={currentProvider.baseUrl || ''}
                  onChange={(e) => setProviderConfig(activeProvider, { baseUrl: e.target.value })}
                  className="flex-1 bg-primary border border-border-color rounded-lg px-3 py-2 text-sm text-text-primary placeholder:text-text-secondary focus:outline-none focus:border-accent"
                />
                {activeProvider === 'ollama' && (
                  <button
                    onClick={handleTestOllama}
                    disabled={testingOllama}
                    className="px-4 py-2 bg-tertiary hover:bg-hover disabled:opacity-50 text-text-primary text-sm rounded-lg transition-colors"
                  >
                    {testingOllama ? 'Testing...' : 'Test Connection'}
                  </button>
                )}
              </div>
              {activeProvider === 'ollama' && ollamaModels.length > 0 && (
                <p className="text-xs text-success-color">
                  Connected! Available models: {ollamaModels.slice(0, 5).join(', ')}
                  {ollamaModels.length > 5 && ` and ${ollamaModels.length - 5} more`}
                </p>
              )}
            </div>
          )}

          {/* Model Selection */}
          <div className="space-y-3">
            <label className="text-sm font-medium text-text-primary">Model</label>
            <div className="relative">
              <select
                value={currentProvider.model}
                onChange={(e) => setProviderConfig(activeProvider, { model: e.target.value })}
                className="w-full appearance-none bg-primary border border-border-color rounded-lg px-3 py-2 pr-10 text-sm text-text-primary focus:outline-none focus:border-accent"
              >
                {providerModels[activeProvider].map((model) => (
                  <option key={model} value={model}>{model}</option>
                ))}
                {activeProvider === 'ollama' && ollamaModels.map((model) => (
                  <option key={model} value={model}>{model}</option>
                ))}
                {activeProvider === 'custom' && currentProvider.model && (
                  <option value={currentProvider.model}>{currentProvider.model}</option>
                )}
              </select>
              <ChevronDown size={16} className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-text-secondary" />
            </div>
            {activeProvider === 'custom' && (
              <input
                type="text"
                placeholder="Enter model name"
                value={currentProvider.model}
                onChange={(e) => setProviderConfig(activeProvider, { model: e.target.value })}
                className="w-full bg-primary border border-border-color rounded-lg px-3 py-2 text-sm text-text-primary placeholder:text-text-secondary focus:outline-none focus:border-accent"
              />
            )}
          </div>

          {/* Temperature */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <label className="text-sm font-medium text-text-primary">Temperature</label>
              <span className="text-sm text-text-secondary">{currentProvider.temperature}</span>
            </div>
            <input
              type="range"
              min="0"
              max="2"
              step="0.1"
              value={currentProvider.temperature}
              onChange={(e) => setProviderConfig(activeProvider, { temperature: parseFloat(e.target.value) })}
              className="w-full accent-accent"
            />
            <div className="flex justify-between text-xs text-text-secondary">
              <span>Focused (0)</span>
              <span>Balanced (1)</span>
              <span>Creative (2)</span>
            </div>
          </div>

          {/* Max Tokens */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <label className="text-sm font-medium text-text-primary">Max Tokens</label>
              <span className="text-sm text-text-secondary">{currentProvider.maxTokens}</span>
            </div>
            <input
              type="range"
              min="256"
              max="8192"
              step="256"
              value={currentProvider.maxTokens}
              onChange={(e) => setProviderConfig(activeProvider, { maxTokens: parseInt(e.target.value) })}
              className="w-full accent-accent"
            />
          </div>

          {/* Context Window */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <label className="text-sm font-medium text-text-primary">Context Window</label>
              <span className="text-sm text-text-secondary">{currentProvider.contextWindow} chars</span>
            </div>
            <input
              type="range"
              min="1000"
              max="50000"
              step="1000"
              value={currentProvider.contextWindow}
              onChange={(e) => setProviderConfig(activeProvider, { contextWindow: parseInt(e.target.value) })}
              className="w-full accent-accent"
            />
            <p className="text-xs text-text-secondary">
              Maximum characters of file content to include in the context.
            </p>
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-border-color bg-tertiary flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-accent hover:bg-accent/90 text-white rounded-lg transition-colors"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
};

export default AISettings;
