import { Plus, Edit2, Trash2, Check } from 'lucide-react';
import { Agent } from '../../types/ai';
import { useState } from 'react';
import { useAIAgentsStore } from '../../stores/aiAgentsStore';

interface AgentSelectorProps {
  agents: Agent[];
  activeAgentId: string;
  onSelect: (agent: Agent) => void;
}

const AgentSelector = ({ agents, activeAgentId, onSelect }: AgentSelectorProps) => {
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [editingAgent, setEditingAgent] = useState<string | null>(null);
  const [newAgent, setNewAgent] = useState<Partial<Agent>>({
    name: '',
    description: '',
    icon: '🤖',
    systemPrompt: ''
  });

  const { addCustomAgent, updateAgent, removeCustomAgent } = useAIAgentsStore();
  const defaultAgentIds = ['data-analyst', 'code-reviewer', 'log-analyzer', 'regex-expert', 'json-wrangler', 'sql-assistant'];
  const isCustomAgent = (id: string) => !defaultAgentIds.includes(id);

  const handleCreateAgent = () => {
    if (newAgent.name && newAgent.description && newAgent.systemPrompt) {
      const agent: Agent = {
        id: `custom-${Date.now()}`,
        name: newAgent.name,
        description: newAgent.description,
        icon: newAgent.icon || '🤖',
        systemPrompt: newAgent.systemPrompt,
        capabilities: ['query', 'generate', 'explain'],
        color: '#6366f1',
        defaultProvider: 'openai',
        defaultModel: 'gpt-4o'
      };
      addCustomAgent(agent);
      setShowCreateForm(false);
      setNewAgent({ name: '', description: '', icon: '🤖', systemPrompt: '' });
      onSelect(agent);
    }
  };

  const handleUpdateAgent = (agentId: string, updates: Partial<Agent>) => {
    updateAgent(agentId, updates);
    setEditingAgent(null);
  };

  const handleDeleteAgent = (agentId: string) => {
    if (confirm('Delete this custom agent?')) {
      removeCustomAgent(agentId);
    }
  };

  if (showCreateForm) {
    return (
      <div className="bg-primary border border-border-color rounded-lg p-3 space-y-3">
        <h4 className="text-sm font-medium text-text-primary">Create Custom Agent</h4>
        
        <div className="space-y-2">
          <input
            type="text"
            placeholder="Agent name"
            value={newAgent.name}
            onChange={(e) => setNewAgent({ ...newAgent, name: e.target.value })}
            className="w-full bg-secondary border border-border-color rounded px-3 py-1.5 text-sm text-text-primary placeholder:text-text-secondary focus:outline-none focus:border-accent"
          />
          
          <input
            type="text"
            placeholder="Description"
            value={newAgent.description}
            onChange={(e) => setNewAgent({ ...newAgent, description: e.target.value })}
            className="w-full bg-secondary border border-border-color rounded px-3 py-1.5 text-sm text-text-primary placeholder:text-text-secondary focus:outline-none focus:border-accent"
          />
          
          <div className="flex items-center gap-2">
            <input
              type="text"
              placeholder="Icon (emoji)"
              value={newAgent.icon}
              onChange={(e) => setNewAgent({ ...newAgent, icon: e.target.value })}
              className="w-16 bg-secondary border border-border-color rounded px-2 py-1.5 text-center text-sm"
              maxLength={2}
            />
            <span className="text-xs text-text-secondary">Use an emoji as icon</span>
          </div>
          
          <textarea
            placeholder="System prompt - define how the agent should behave..."
            value={newAgent.systemPrompt}
            onChange={(e) => setNewAgent({ ...newAgent, systemPrompt: e.target.value })}
            className="w-full bg-secondary border border-border-color rounded px-3 py-2 text-sm text-text-primary placeholder:text-text-secondary resize-none focus:outline-none focus:border-accent"
            rows={4}
          />
        </div>

        <div className="flex gap-2">
          <button
            onClick={handleCreateAgent}
            disabled={!newAgent.name || !newAgent.description || !newAgent.systemPrompt}
            className="flex-1 px-3 py-1.5 bg-accent hover:bg-accent/90 disabled:opacity-50 text-white text-sm rounded transition-colors"
          >
            Create Agent
          </button>
          <button
            onClick={() => setShowCreateForm(false)}
            className="px-3 py-1.5 bg-tertiary hover:bg-hover text-text-primary text-sm rounded transition-colors"
          >
            Cancel
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-1">
      {agents.map((agent) => (
        <div
          key={agent.id}
          className={`group relative flex items-start gap-3 p-2 rounded-lg cursor-pointer transition-colors ${
            agent.id === activeAgentId
              ? 'bg-accent/10 border border-accent/30'
              : 'hover:bg-primary border border-transparent'
          }`}
          onClick={() => editingAgent !== agent.id && onSelect(agent)}
        >
          {editingAgent === agent.id ? (
            <div className="flex-1 space-y-2">
              <input
                type="text"
                defaultValue={agent.name}
                onBlur={(e) => handleUpdateAgent(agent.id, { name: e.target.value })}
                onKeyDown={(e) => e.key === 'Enter' && handleUpdateAgent(agent.id, { name: (e.target as HTMLInputElement).value })}
                autoFocus
                className="w-full bg-secondary border border-accent rounded px-2 py-1 text-sm text-text-primary"
                onClick={(e) => e.stopPropagation()}
              />
            </div>
          ) : (
            <>
              <span className="text-2xl flex-shrink-0">{agent.icon}</span>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="font-medium text-text-primary text-sm">{agent.name}</span>
                  {agent.id === activeAgentId && (
                    <Check size={12} className="text-accent" />
                  )}
                </div>
                <p className="text-xs text-text-secondary line-clamp-2">{agent.description}</p>
              </div>
              
              {isCustomAgent(agent.id) && (
                <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      setEditingAgent(agent.id);
                    }}
                    className="p-1 hover:bg-tertiary rounded"
                  >
                    <Edit2 size={12} className="text-text-secondary" />
                  </button>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleDeleteAgent(agent.id);
                    }}
                    className="p-1 hover:bg-red-500/20 rounded"
                  >
                    <Trash2 size={12} className="text-red-400" />
                  </button>
                </div>
              )}
            </>
          )}
        </div>
      ))}

      {/* Create Custom Agent Button */}
      <button
        onClick={() => setShowCreateForm(true)}
        className="w-full flex items-center gap-3 p-2 rounded-lg hover:bg-primary border border-dashed border-border-color hover:border-accent/50 transition-colors mt-2"
      >
        <div className="w-8 h-8 rounded-full bg-tertiary flex items-center justify-center flex-shrink-0">
          <Plus size={16} className="text-text-secondary" />
        </div>
        <div className="text-left">
          <span className="text-sm text-text-primary">Create Custom Agent</span>
          <p className="text-xs text-text-secondary">Define your own specialized AI</p>
        </div>
      </button>
    </div>
  );
};

export default AgentSelector;
