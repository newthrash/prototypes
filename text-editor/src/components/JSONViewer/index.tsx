import { useState, useMemo } from 'react';
import { 
  ChevronRight, 
  ChevronDown, 
  Search, 
  Copy, 
  Check, 
  Braces,
  Minimize2,
  Maximize2,
} from 'lucide-react';
import { formatJson, minifyJson } from '../../utils/helpers';

interface JsonTreeNode {
  key: string;
  value: unknown;
  type: 'object' | 'array' | 'string' | 'number' | 'boolean' | 'null';
  path: string;
  children?: JsonTreeNode[];
}

interface JSONViewerProps {
  content: string;
  onChange?: (content: string) => void;
}

const JSONViewer = ({ content, onChange }: JSONViewerProps) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [expandedPaths, setExpandedPaths] = useState<Set<string>>(new Set(['root']));
  const [copied, setCopied] = useState(false);
  const [viewMode, setViewMode] = useState<'tree' | 'text'>('tree');

  const parsedData = useMemo(() => {
    try {
      return JSON.parse(content);
    } catch {
      return null;
    }
  }, [content]);

  const isValid = parsedData !== null;

  const buildTree = (data: unknown, key: string, path: string): JsonTreeNode => {
    const type = Array.isArray(data) 
      ? 'array' 
      : data === null 
        ? 'null' 
        : typeof data as JsonTreeNode['type'];

    const node: JsonTreeNode = {
      key,
      value: data,
      type,
      path,
    };

    if (type === 'object' && data !== null) {
      node.children = Object.entries(data as Record<string, unknown>).map(([k, v]) =>
        buildTree(v, k, `${path}.${k}`)
      );
    } else if (type === 'array') {
      node.children = (data as unknown[]).map((v, i) =>
        buildTree(v, `[${i}]`, `${path}[${i}]`)
      );
    }

    return node;
  };

  const treeData = useMemo(() => {
    if (!isValid) return null;
    return buildTree(parsedData, 'root', 'root');
  }, [parsedData, isValid]);

  const toggleExpand = (path: string) => {
    const newExpanded = new Set(expandedPaths);
    if (newExpanded.has(path)) {
      newExpanded.delete(path);
    } else {
      newExpanded.add(path);
    }
    setExpandedPaths(newExpanded);
  };

  const expandAll = () => {
    if (!treeData) return;
    const allPaths = new Set<string>();
    const collectPaths = (node: JsonTreeNode) => {
      allPaths.add(node.path);
      node.children?.forEach(collectPaths);
    };
    collectPaths(treeData);
    setExpandedPaths(allPaths);
  };

  const collapseAll = () => {
    setExpandedPaths(new Set(['root']));
  };

  const copyToClipboard = () => {
    navigator.clipboard.writeText(content);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleFormat = () => {
    if (onChange) {
      onChange(formatJson(content));
    }
  };

  const handleMinify = () => {
    if (onChange) {
      onChange(minifyJson(content));
    }
  };

  const renderNode = (node: JsonTreeNode, depth: number = 0): React.ReactNode => {
    const isExpanded = expandedPaths.has(node.path);
    const hasChildren = node.children && node.children.length > 0;
    const isMatch = searchQuery && 
      (node.key.toLowerCase().includes(searchQuery.toLowerCase()) ||
       String(node.value).toLowerCase().includes(searchQuery.toLowerCase()));

    const getValuePreview = (value: unknown, type: string): string => {
      if (type === 'object') return `{${Object.keys(value as object).length}}`;
      if (type === 'array') return `[${(value as unknown[]).length}]`;
      if (type === 'string') return `"${String(value).slice(0, 50)}${String(value).length > 50 ? '...' : ''}"`;
      if (type === 'null') return 'null';
      return String(value);
    };

    const getTypeColor = (type: string): string => {
      const colors: Record<string, string> = {
        object: '#4ec9b0',
        array: '#4ec9b0',
        string: '#ce9178',
        number: '#b5cea8',
        boolean: '#569cd6',
        null: '#569cd6',
      };
      return colors[type] || '#cccccc';
    };

    return (
      <div key={node.path}>
        <div
          className={`flex items-center py-0.5 hover:bg-hover cursor-pointer ${
            isMatch ? 'bg-yellow-500 bg-opacity-20' : ''
          }`}
          style={{ paddingLeft: depth * 16 + 8 }}
          onClick={() => hasChildren && toggleExpand(node.path)}
        >
          {hasChildren ? (
            <span className="mr-1 text-text-secondary">
              {isExpanded ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
            </span>
          ) : (
            <span className="mr-1 w-[14px]" />
          )}
          
          <span className="text-text-primary mr-2">{node.key}:</span>
          
          {!hasChildren && (
            <span style={{ color: getTypeColor(node.type) }}>
              {getValuePreview(node.value, node.type)}
            </span>
          )}
          
          {hasChildren && !isExpanded && (
            <span className="text-text-secondary ml-2">
              {node.type === 'object' 
                ? `{${node.children?.length}}` 
                : `[${node.children?.length}]`}
            </span>
          )}
        </div>
        
        {hasChildren && isExpanded && (
          <div>
            {node.children?.map(child => renderNode(child, depth + 1))}
          </div>
        )}
      </div>
    );
  };

  if (!isValid) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-text-secondary">
        <Braces size={48} className="mb-4 opacity-50" />
        <p>Invalid JSON</p>
        <p className="text-sm mt-2">The content is not valid JSON</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full bg-primary">
      {/* Toolbar */}
      <div className="flex items-center justify-between px-3 py-2 border-b border-border-color bg-secondary">
        <div className="flex items-center gap-2">
          <button
            onClick={() => setViewMode(viewMode === 'tree' ? 'text' : 'tree')}
            className="px-2 py-1 bg-tertiary hover:bg-hover rounded text-sm text-text-primary transition-colors"
          >
            {viewMode === 'tree' ? 'Text View' : 'Tree View'}
          </button>
          {viewMode === 'tree' && (
            <>
              <button
                onClick={expandAll}
                className="px-2 py-1 bg-tertiary hover:bg-hover rounded text-sm text-text-primary transition-colors"
              >
                <Maximize2 size={14} className="inline mr-1" />
                Expand
              </button>
              <button
                onClick={collapseAll}
                className="px-2 py-1 bg-tertiary hover:bg-hover rounded text-sm text-text-primary transition-colors"
              >
                <Minimize2 size={14} className="inline mr-1" />
                Collapse
              </button>
            </>
          )}
        </div>
        
        <div className="flex items-center gap-2">
          <button
            onClick={handleFormat}
            className="px-2 py-1 bg-tertiary hover:bg-hover rounded text-sm text-text-primary transition-colors"
          >
            Format
          </button>
          <button
            onClick={handleMinify}
            className="px-2 py-1 bg-tertiary hover:bg-hover rounded text-sm text-text-primary transition-colors"
          >
            Minify
          </button>
          <button
            onClick={copyToClipboard}
            className="px-2 py-1 bg-tertiary hover:bg-hover rounded text-sm text-text-primary transition-colors"
          >
            {copied ? <Check size={14} className="inline" /> : <Copy size={14} className="inline" />}
          </button>
        </div>
      </div>

      {/* Search Bar */}
      <div className="px-3 py-2 border-b border-border-color">
        <div className="relative">
          <Search size={14} className="absolute left-2 top-2 text-text-secondary" />
          <input
            type="text"
            placeholder="Search in JSON..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-tertiary text-text-primary text-sm pl-8 pr-3 py-1.5 rounded outline-none border border-border-color focus:border-accent"
          />
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-auto">
        {viewMode === 'tree' ? (
          <div className="py-2 font-mono text-sm">
            {treeData && renderNode(treeData)}
          </div>
        ) : (
          <pre className="p-4 font-mono text-sm text-text-primary whitespace-pre-wrap">
            {formatJson(content)}
          </pre>
        )}
      </div>

      {/* Status */}
      <div className="px-3 py-1.5 border-t border-border-color bg-secondary text-xs text-text-secondary flex items-center justify-between">
        <span>
          {typeof parsedData === 'object' && parsedData !== null
            ? `${Object.keys(parsedData).length} root properties`
            : 'Root value'}
        </span>
        <span>{content.length} characters</span>
      </div>
    </div>
  );
};

export default JSONViewer;
