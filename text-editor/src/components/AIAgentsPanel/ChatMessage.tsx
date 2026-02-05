import { useState } from 'react';
import { 
  User, 
  Bot,
  Play, 
  Copy, 
  Check, 
  AlertCircle,
  Code2,
  FileEdit,
  Terminal
} from 'lucide-react';
import { ChatMessage as ChatMessageType, Agent, AIAction } from '../../types/ai';

interface ChatMessageProps {
  message: ChatMessageType;
  agent?: Agent;
  onAction?: (action: AIAction) => void;
}

// Simple syntax highlighting without external dependency
const CodeBlock = ({ code, language }: { code: string; language: string }) => {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    await navigator.clipboard.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const getLanguageLabel = (lang: string) => {
    const labels: Record<string, string> = {
      sql: 'SQL',
      python: 'Python',
      javascript: 'JavaScript',
      typescript: 'TypeScript',
      json: 'JSON',
      regex: 'Regex',
      html: 'HTML',
      css: 'CSS'
    };
    return labels[lang] || lang.toUpperCase();
  };

  return (
    <div className="my-3 rounded-lg overflow-hidden bg-[#1e1e1e] border border-border-color">
      <div className="flex items-center justify-between px-3 py-2 bg-[#2d2d30] border-b border-border-color">
        <div className="flex items-center gap-2">
          <Code2 size={14} className="text-text-secondary" />
          <span className="text-xs text-text-secondary">{getLanguageLabel(language)}</span>
        </div>
        <button
          onClick={handleCopy}
          className="flex items-center gap-1 px-2 py-1 text-xs text-text-secondary hover:text-text-primary hover:bg-hover rounded transition-colors"
        >
          {copied ? <Check size={12} /> : <Copy size={12} />}
          {copied ? 'Copied!' : 'Copy'}
        </button>
      </div>
      <pre className="p-3 overflow-x-auto text-sm font-mono text-text-primary">
        <code>{code}</code>
      </pre>
    </div>
  );
};

// Parse message content and render with code blocks
const ParsedContent = ({ content }: { content: string }) => {
  const parts: JSX.Element[] = [];
  let lastIndex = 0;
  
  // Regex to match code blocks
  const codeBlockRegex = /```(\w+)?\n([\s\S]*?)```/g;
  let match;
  
  while ((match = codeBlockRegex.exec(content)) !== null) {
    // Add text before code block
    if (match.index > lastIndex) {
      const textBefore = content.slice(lastIndex, match.index);
      parts.push(
        <p key={lastIndex} className="whitespace-pre-wrap text-text-primary">
          {parseInlineFormatting(textBefore)}
        </p>
      );
    }
    
    // Add code block
    const language = match[1] || 'text';
    const code = match[2].trim();
    parts.push(<CodeBlock key={match.index} code={code} language={language} />);
    
    lastIndex = match.index + match[0].length;
  }
  
  // Add remaining text
  if (lastIndex < content.length) {
    const textAfter = content.slice(lastIndex);
    parts.push(
      <p key={lastIndex} className="whitespace-pre-wrap text-text-primary">
        {parseInlineFormatting(textAfter)}
      </p>
    );
  }
  
  return <>{parts}</>;
};

// Parse inline formatting (bold, italic, code)
const parseInlineFormatting = (text: string): JSX.Element[] => {
  const parts: JSX.Element[] = [];
  let lastIndex = 0;
  
  // Inline code: `code`
  const inlineCodeRegex = /`([^`]+)`/g;
  let match;
  
  while ((match = inlineCodeRegex.exec(text)) !== null) {
    if (match.index > lastIndex) {
      parts.push(<span key={`text-${lastIndex}`}>{text.slice(lastIndex, match.index)}</span>);
    }
    
    parts.push(
      <code key={`code-${match.index}`} className="px-1.5 py-0.5 bg-primary rounded text-accent text-sm font-mono">
        {match[1]}
      </code>
    );
    
    lastIndex = match.index + match[0].length;
  }
  
  if (lastIndex < text.length) {
    parts.push(<span key={`text-${lastIndex}`}>{text.slice(lastIndex)}</span>);
  }
  
  return parts.length > 0 ? parts : [<span key="text">{text}</span>];
};

const ChatMessage = ({ message, agent, onAction }: ChatMessageProps) => {
  const isUser = message.role === 'user';
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    await navigator.clipboard.writeText(message.content);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleActionClick = (action: AIAction) => {
    onAction?.(action);
  };

  const getActionIcon = (type: string) => {
    switch (type) {
      case 'query':
        return <Terminal size={14} />;
      case 'insert':
        return <FileEdit size={14} />;
      default:
        return <Play size={14} />;
    }
  };

  return (
    <div className={`flex gap-3 ${isUser ? 'flex-row-reverse' : ''}`}>
      {/* Avatar */}
      <div 
        className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 ${
          isUser 
            ? 'bg-accent' 
            : 'bg-tertiary border border-border-color'
        }`}
      >
        {isUser ? (
          <User size={16} className="text-white" />
        ) : agent ? (
          <span className="text-lg">{agent.icon}</span>
        ) : (
          <Bot size={16} className="text-accent" />
        )}
      </div>

      {/* Message Content */}
      <div className={`flex-1 min-w-0 ${isUser ? 'items-end' : 'items-start'} flex flex-col`}>
        <div 
          className={`max-w-[85%] rounded-2xl px-4 py-2.5 ${
            isUser 
              ? 'bg-accent text-white rounded-br-md' 
              : 'bg-primary border border-border-color rounded-bl-md'
          }`}
        >
          {message.error ? (
            <div className="flex items-center gap-2 text-red-400">
              <AlertCircle size={16} />
              <span className="text-sm">{message.error}</span>
            </div>
          ) : (
            <div className={`text-sm leading-relaxed ${isUser ? '' : 'space-y-2'}`}>
              {isUser ? (
                <p className="whitespace-pre-wrap">{message.content}</p>
              ) : (
                <ParsedContent content={message.content} />
              )}
              
              {message.isStreaming && (
                <span className="inline-block w-2 h-4 bg-accent animate-pulse ml-1" />
              )}
            </div>
          )}
        </div>

        {/* Message Actions */}
        {!isUser && !message.error && (
          <div className="flex items-center gap-1 mt-1 px-1">
            <button
              onClick={handleCopy}
              className="flex items-center gap-1 px-2 py-1 text-xs text-text-secondary hover:text-text-primary hover:bg-tertiary rounded transition-colors"
            >
              {copied ? <Check size={12} /> : <Copy size={12} />}
              {copied ? 'Copied' : 'Copy'}
            </button>
            
            {message.actions?.map((action, idx) => (
              <button
                key={idx}
                onClick={() => handleActionClick(action)}
                className="flex items-center gap-1 px-2 py-1 text-xs text-accent hover:text-accent/80 hover:bg-accent/10 rounded transition-colors"
              >
                {getActionIcon(action.type)}
                {action.label}
              </button>
            ))}
          </div>
        )}

        {/* Timestamp */}
        <span className="text-[10px] text-text-secondary mt-1 px-1">
          {new Date(message.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
        </span>
      </div>
    </div>
  );
};

export default ChatMessage;
