import { FileContext, DataSchema, ContextBuilderOptions, DEFAULT_CONTEXT_OPTIONS, getFileType } from '../types/ai';
import { useEditorStore } from '../stores/editorStore';

/**
 * Builds file context for AI agents from the currently active file
 */
export const buildFileContext = (
  options: Partial<ContextBuilderOptions> = {}
): FileContext | null => {
  const { tabs, activeTabId } = useEditorStore.getState();
  const activeTab = tabs.find(t => t.id === activeTabId);
  
  if (!activeTab) return null;
  
  const opts = { ...DEFAULT_CONTEXT_OPTIONS, ...options };
  const fileExtension = activeTab.path.split('.').pop() || '';
  const fileType = getFileType(fileExtension);
  
  // Build content preview based on file type and limits
  const content = activeTab.content;
  const contentPreview = buildContentPreview(content, fileType, opts);
  
  // Parse schema for structured data
  let schema: DataSchema | undefined;
  if (opts.includeSchema && fileType === 'data') {
    schema = parseDataSchema(content, fileExtension, opts);
  }
  
  return {
    filePath: activeTab.path,
    fileName: activeTab.name,
    fileExtension,
    fileType,
    content: content.slice(0, opts.maxContentLength),
    contentPreview,
    lineCount: content.split('\n').length,
    schema,
    cursorPosition: activeTab.cursorPosition
  };
};

/**
 * Builds a content preview based on file type and options
 */
const buildContentPreview = (
  content: string,
  _fileType: FileContext['fileType'],
  options: ContextBuilderOptions
): string => {
  const lines = content.split('\n');
  
  // For very large files, take samples from beginning, middle, and end
  if (lines.length > options.sampleRows * 3) {
    const start = lines.slice(0, options.sampleRows).join('\n');
    const middle = lines.slice(Math.floor(lines.length / 2), Math.floor(lines.length / 2) + options.sampleRows).join('\n');
    const end = lines.slice(-options.sampleRows).join('\n');
    return `${start}\n\n... [${lines.length - options.sampleRows * 3} lines omitted] ...\n\n${middle}\n\n... [${lines.length - options.sampleRows * 3} lines omitted] ...\n\n${end}`;
  }
  
  // For medium files, just truncate
  if (content.length > options.maxContentLength) {
    return content.slice(0, options.maxContentLength) + '\n\n... [content truncated] ...';
  }
  
  return content;
};

/**
 * Parse schema from structured data (CSV, JSON, etc.)
 */
const parseDataSchema = (
  content: string,
  extension: string,
  options: ContextBuilderOptions
): DataSchema | undefined => {
  try {
    switch (extension.toLowerCase()) {
      case 'csv':
      case 'tsv':
        return parseCSVSchema(content, options);
      case 'json':
      case 'jsonl':
        return parseJSONSchema(content, options);
      default:
        return undefined;
    }
  } catch (error) {
    console.error('Failed to parse schema:', error);
    return undefined;
  }
};

/**
 * Parse CSV/TSV schema
 */
const parseCSVSchema = (
  content: string,
  options: ContextBuilderOptions
): DataSchema => {
  const delimiter = content.includes('\t') ? '\t' : ',';
  const lines = content.split('\n').filter(line => line.trim());
  
  if (lines.length === 0) {
    return { columns: [], sampleRows: [], totalRows: 0 };
  }
  
  // Parse header
  const headers = parseCSVLine(lines[0], delimiter);
  
  // Parse sample rows
  const sampleRows: Record<string, string>[] = [];
  const inferredTypes: Record<string, string> = {};
  
  for (let i = 1; i < Math.min(lines.length, options.sampleRows + 1); i++) {
    const values = parseCSVLine(lines[i], delimiter);
    const row: Record<string, string> = {};
    headers.forEach((col, idx) => {
      row[col] = values[idx] || '';
    });
    sampleRows.push(row);
  }
  
  // Infer types from sample
  headers.forEach(col => {
    const values = sampleRows.map(r => r[col]).filter(v => v !== '');
    inferredTypes[col] = inferType(values);
  });
  
  return {
    columns: headers,
    sampleRows,
    totalRows: lines.length - 1, // Excluding header
    inferredTypes
  };
};

/**
 * Parse a CSV line handling quoted values
 */
const parseCSVLine = (line: string, delimiter: string): string[] => {
  const values: string[] = [];
  let current = '';
  let inQuotes = false;
  
  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    const nextChar = line[i + 1];
    
    if (char === '"') {
      if (inQuotes && nextChar === '"') {
        current += '"';
        i++; // Skip next quote
      } else {
        inQuotes = !inQuotes;
      }
    } else if (char === delimiter && !inQuotes) {
      values.push(current.trim());
      current = '';
    } else {
      current += char;
    }
  }
  
  values.push(current.trim());
  return values;
};

/**
 * Parse JSON/JSONL schema
 */
const parseJSONSchema = (
  content: string,
  options: ContextBuilderOptions
): DataSchema => {
  // Try to parse as JSON first
  try {
    const parsed = JSON.parse(content);
    
    if (Array.isArray(parsed)) {
      // Array of objects
      const sampleRows = parsed.slice(0, options.sampleRows);
      const columns = sampleRows.length > 0 ? Object.keys(sampleRows[0]) : [];
      
      const inferredTypes: Record<string, string> = {};
      columns.forEach(col => {
        const values = sampleRows.map(r => r[col]).filter(v => v !== undefined && v !== null);
        inferredTypes[col] = inferJSONType(values);
      });
      
      return {
        columns,
        sampleRows,
        totalRows: parsed.length,
        inferredTypes
      };
    } else if (typeof parsed === 'object' && parsed !== null) {
      // Single object - treat as one row
      return {
        columns: Object.keys(parsed),
        sampleRows: [parsed],
        totalRows: 1,
        inferredTypes: Object.fromEntries(
          Object.entries(parsed).map(([k, v]) => [k, inferJSONType([v])])
        )
      };
    }
  } catch {
    // Try JSONL
    const lines = content.split('\n').filter(line => line.trim());
    const sampleRows: any[] = [];
    
    for (const line of lines.slice(0, options.sampleRows)) {
      try {
        sampleRows.push(JSON.parse(line));
      } catch {
        // Skip invalid lines
      }
    }
    
    const columns = sampleRows.length > 0 ? Object.keys(sampleRows[0]) : [];
    const inferredTypes: Record<string, string> = {};
    columns.forEach(col => {
      const values = sampleRows.map(r => r[col]).filter(v => v !== undefined && v !== null);
      inferredTypes[col] = inferJSONType(values);
    });
    
    return {
      columns,
      sampleRows,
      totalRows: lines.length,
      inferredTypes
    };
  }
  
  return { columns: [], sampleRows: [], totalRows: 0 };
};

/**
 * Infer type from a set of string values
 */
const inferType = (values: string[]): string => {
  if (values.length === 0) return 'unknown';
  
  // Check for numbers
  if (values.every(v => !isNaN(Number(v)) && v !== '')) {
    // Check if integer
    if (values.every(v => Number.isInteger(Number(v)))) {
      return 'integer';
    }
    return 'number';
  }
  
  // Check for dates
  if (values.every(v => !isNaN(Date.parse(v)))) {
    return 'datetime';
  }
  
  // Check for booleans
  if (values.every(v => ['true', 'false', '1', '0', 'yes', 'no'].includes(v.toLowerCase()))) {
    return 'boolean';
  }
  
  return 'string';
};

/**
 * Infer type from JSON values
 */
const inferJSONType = (values: any[]): string => {
  if (values.length === 0) return 'unknown';
  
  const firstValue = values[0];
  const type = typeof firstValue;
  
  if (type === 'boolean') return 'boolean';
  if (type === 'number') return Number.isInteger(firstValue) ? 'integer' : 'number';
  if (type === 'string') {
    // Check if it looks like a date
    if (!isNaN(Date.parse(firstValue))) return 'datetime';
    return 'string';
  }
  if (Array.isArray(firstValue)) return 'array';
  if (type === 'object') return 'object';
  
  return 'unknown';
};

/**
 * Build a prompt context string for the AI
 */
export const buildPromptContext = (
  fileContext: FileContext | null,
  agentSystemPrompt: string,
  options: Partial<ContextBuilderOptions> = {}
): string => {
  if (!fileContext) {
    return agentSystemPrompt;
  }
  
  const opts = { ...DEFAULT_CONTEXT_OPTIONS, ...options };
  
  let context = `${agentSystemPrompt}\n\n`;
  context += `=== FILE CONTEXT ===\n`;
  context += `File: ${fileContext.fileName}\n`;
  context += `Type: ${fileContext.fileType}\n`;
  context += `Lines: ${fileContext.lineCount}\n`;
  
  if (fileContext.schema && opts.includeSchema) {
    context += `\n=== SCHEMA ===\n`;
    context += `Columns: ${fileContext.schema.columns?.join(', ')}\n`;
    
    if (fileContext.schema.inferredTypes) {
      context += `Types:\n`;
      Object.entries(fileContext.schema.inferredTypes).forEach(([col, type]) => {
        context += `  ${col}: ${type}\n`;
      });
    }
    
    if (opts.includeSampleData && fileContext.schema.sampleRows) {
      context += `\n=== SAMPLE DATA (${fileContext.schema.sampleRows.length} rows) ===\n`;
      context += JSON.stringify(fileContext.schema.sampleRows, null, 2);
      context += '\n';
    }
    
    if (fileContext.schema.totalRows) {
      context += `\nTotal rows: ${fileContext.schema.totalRows}\n`;
    }
  }
  
  context += `\n=== FILE CONTENT ===\n`;
  context += fileContext.contentPreview;
  
  if (fileContext.cursorPosition) {
    context += `\n\nCursor position: Line ${fileContext.cursorPosition.line}, Column ${fileContext.cursorPosition.column}\n`;
  }
  
  context += '\n=== END FILE CONTEXT ===\n';
  
  return context;
};

/**
 * Estimate token count (rough approximation)
 */
export const estimateTokens = (text: string): number => {
  // Rough estimate: 1 token ≈ 4 characters for English text
  return Math.ceil(text.length / 4);
};

/**
 * Truncate content to fit within token limit
 */
export const truncateToTokenLimit = (
  content: string,
  maxTokens: number,
  preserveLines: boolean = true
): string => {
  const maxChars = maxTokens * 4;
  
  if (content.length <= maxChars) {
    return content;
  }
  
  if (preserveLines) {
    const lines = content.split('\n');
    let result = '';
    let charCount = 0;
    
    for (const line of lines) {
      if (charCount + line.length + 1 > maxChars) {
        result += '\n\n... [content truncated due to size limits] ...';
        break;
      }
      result += line + '\n';
      charCount += line.length + 1;
    }
    
    return result;
  }
  
  return content.slice(0, maxChars) + '\n\n... [content truncated] ...';
};
