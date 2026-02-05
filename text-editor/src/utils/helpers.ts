export const debounce = (
  fn: (...args: string[]) => Promise<void> | void,
  delay: number
): ((...args: string[]) => void) => {
  let timeoutId: ReturnType<typeof setTimeout>;
  return (...args: string[]) => {
    clearTimeout(timeoutId);
    timeoutId = setTimeout(() => fn(...args), delay);
  };
};

export const throttle = <T extends (...args: unknown[]) => unknown>(
  fn: T,
  limit: number
): ((...args: Parameters<T>) => void) => {
  let inThrottle = false;
  return (...args: Parameters<T>) => {
    if (!inThrottle) {
      fn(...args);
      inThrottle = true;
      setTimeout(() => (inThrottle = false), limit);
    }
  };
};

export const formatFileSize = (bytes: number): string => {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
};

export const countWords = (text: string): number => {
  return text.trim().split(/\s+/).filter(word => word.length > 0).length;
};

export const countLines = (text: string): number => {
  return text.split('\n').length;
};

export const formatDuration = (ms: number): string => {
  if (ms < 1000) return `${ms}ms`;
  if (ms < 60000) return `${Math.round(ms / 1000)}s`;
  return `${Math.round(ms / 60000)}m`;
};

export const escapeRegExp = (string: string): string => {
  return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
};

export const isValidJson = (str: string): boolean => {
  try {
    JSON.parse(str);
    return true;
  } catch {
    return false;
  }
};

export const formatJson = (str: string, indent: number = 2): string => {
  try {
    const obj = JSON.parse(str);
    return JSON.stringify(obj, null, indent);
  } catch {
    return str;
  }
};

export const minifyJson = (str: string): string => {
  try {
    const obj = JSON.parse(str);
    return JSON.stringify(obj);
  } catch {
    return str;
  }
};

export const getFileIcon = (filename: string): string => {
  const ext = filename.split('.').pop()?.toLowerCase();
  
  const iconMap: Record<string, string> = {
    'js': '📜',
    'jsx': '⚛️',
    'ts': '📘',
    'tsx': '⚛️',
    'py': '🐍',
    'html': '🌐',
    'css': '🎨',
    'scss': '🎨',
    'json': '📋',
    'md': '📝',
    'java': '☕',
    'c': '🔧',
    'cpp': '🔧',
    'go': '🐹',
    'rs': '⚙️',
    'rb': '💎',
    'php': '🐘',
    'sql': '🗄️',
    'sh': '📟',
    'yml': '⚙️',
    'yaml': '⚙️',
    'dockerfile': '🐳',
    'gitignore': '👁️',
  };
  
  return iconMap[ext || ''] || '📄';
};

export const generateKeyBinding = (key: string): string => {
  const isMac = navigator.platform.toUpperCase().indexOf('MAC') >= 0;
  
  const keyMap: Record<string, string> = {
    'mod': isMac ? '⌘' : 'Ctrl',
    'alt': isMac ? '⌥' : 'Alt',
    'shift': isMac ? '⇧' : 'Shift',
    'ctrl': isMac ? '⌃' : 'Ctrl',
  };
  
  return key.split('+').map(k => keyMap[k.toLowerCase()] || k.toUpperCase()).join('+');
};
