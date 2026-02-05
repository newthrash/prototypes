# OpenText Editor - Features & Implementation

## Overview
OpenText is a modern, cross-platform text editor built with **Tauri + React**. It combines the performance of native desktop applications with the flexibility of web technologies.

## Research Summary

Based on research of 12 major text editors (Notepad++, Sublime Text, VS Code, Atom, Vim, Emacs, TextMate, BBEdit, UltraEdit, Kate, Geany, Brackets), the following key features were identified as essential for a modern text editor:

### Core Features from Research:
- **Syntax Highlighting** (all editors) - Monaco Editor provides 50+ languages
- **Code Folding** (Notepad++, VS Code, Sublime) - Collapsible code blocks
- **Multi-cursor Editing** (VS Code, Sublime) - Alt+click for multiple cursors
- **Find/Replace with Regex** (all editors) - Pattern matching
- **Split View** (VS Code, Sublime) - Multiple editor panes
- **File Explorer** (VS Code, Atom) - Tree view navigation
- **Tabs** (all editors) - Multiple files open
- **Minimap** (Sublime, VS Code) - Code overview
- **Command Palette** (VS Code, Sublime) - Quick command access
- **Themes** (all editors) - Dark/light modes
- **Auto-save** (VS Code) - Automatic file saving
- **Session Restore** (Notepad++, Sublime) - Remember open files

## Implemented Features

### Tier 1 - Essential (All Implemented ✅)

#### 1. Monaco Editor Integration
- **File**: `src/components/Editor/index.tsx`
- VS Code's powerful editor component
- Syntax highlighting for 50+ languages:
  - JavaScript, TypeScript, JSX, TSX
  - Python, Java, C, C++, C#, Go, Rust
  - Ruby, PHP, SQL, Shell, PowerShell
  - HTML, CSS, SCSS, Less
  - JSON, XML, YAML, TOML
  - Markdown, Lua, Swift, Kotlin
  - Dart, Vue, Svelte, GraphQL
  - And many more...
- Line numbers
- Bracket matching
- Auto-indentation
- Code folding

#### 2. File Management
- **File**: `src/components/Sidebar/index.tsx`
- File explorer tree view
- Open folder/workspace
- Create new files and folders
- Rename and delete files
- Recent folders tracking
- File type icons

#### 3. Tabs System
- **File**: `src/components/Tabs/index.tsx`
- Tabbed interface for multiple files
- Tab reordering and closing
- Dirty file indicators (dot)
- File type icons in tabs
- Split editor support

#### 4. Search & Replace
- **File**: `src/components/Sidebar/index.tsx` (SearchPanel)
- Find in current file (Ctrl+F)
- Find and replace (Ctrl+H)
- Regex support toggle
- Case sensitive toggle
- Whole word toggle
- Find in files (UI placeholder - ready for implementation)

#### 5. Command Palette
- **File**: `src/components/CommandPalette/index.tsx`
- Quick access to all commands (Ctrl+Shift+P)
- Fuzzy search through commands
- Keyboard shortcut display
- Recently opened files quick access
- Command categories

#### 6. Status Bar
- **File**: `src/components/StatusBar/index.tsx`
- Line and column position
- File language mode
- Word count
- Encoding (UTF-8)
- Line ending (LF)
- Word wrap toggle
- Line numbers toggle
- Theme toggle
- Zen mode toggle

### Tier 2 - Important (All Implemented ✅)

#### 7. JSON Viewer (Special Feature)
- **File**: `src/components/JSONViewer/index.tsx`
- Tree view for JSON navigation
- Text view for raw JSON
- Expand/collapse all nodes
- Search within JSON
- Format/beautify JSON
- Minify JSON
- Copy to clipboard
- Shows character count and property count

#### 8. Split View
- **File**: `src/components/Editor/index.tsx`
- Split editor horizontally
- Split editor vertically
- Multiple editor groups
- Synchronized editing

#### 9. Themes
- **File**: `src/components/Settings/index.tsx`
- Dark theme
- Light theme
- System theme (auto-detect)
- Custom Monaco Editor themes

#### 10. Auto-save
- **File**: `src/stores/editorStore.ts`
- Toggle auto-save in settings
- 1-second delay debounce
- Dirty file tracking

#### 11. Session Persistence
- **File**: `src/stores/editorStore.ts`
- Persists settings to localStorage
- Recent files and folders tracking
- Theme and editor preferences saved

#### 12. Settings Panel
- **File**: `src/components/Settings/index.tsx`
- Editor settings (font size, font family, tab size)
- Appearance settings (themes)
- File settings (auto-save, recent files)
- Keyboard shortcuts reference
- About section

### Tier 3 - Nice to Have (Most Implemented ✅)

#### 13. Keyboard Shortcuts
- **File**: `src/hooks/useEditor.ts`
- `Cmd/Ctrl+O` - Open File
- `Cmd/Ctrl+Shift+O` - Open Folder
- `Cmd/Ctrl+S` - Save
- `Cmd/Ctrl+Shift+S` - Save As
- `Cmd/Ctrl+W` - Close Tab
- `Cmd/Ctrl+B` - Toggle Sidebar
- `Cmd/Ctrl+Shift+P` - Command Palette
- `Cmd/Ctrl+F` - Find
- `Cmd/Ctrl+H` - Replace
- `Cmd/Ctrl+Shift+F` - Find in Files
- `Cmd/Ctrl+,` - Settings
- `Cmd/Ctrl+K Z` - Zen Mode

#### 14. Zen Mode
- **File**: `src/App.tsx`
- Distraction-free editing
- Hides all UI chrome
- Full-screen editor

#### 15. Large File Handling
- Monaco Editor handles large files efficiently
- No artificial file size limits
- Performance optimized

#### 16. Word Count
- **File**: `src/utils/helpers.ts`
- Word count for current document
- Line count
- Displayed in status bar

### NEW: Query Panel - Data Analysis Inside Your Editor 🚀

#### 17. SQL Query Support (DuckDB)
- **File**: `src/components/QueryPanel/index.tsx`, `src/lib/duckdb.ts`
- Run SQL queries directly on open files
- Powered by DuckDB WebAssembly
- Supports CSV, JSON, JSONL, Parquet files
- Auto-detects file types and creates temp tables
- Query execution time tracking
- Results displayed in sortable table

**Example queries:**
```sql
-- Query CSV data
SELECT * FROM 'data.csv' LIMIT 100;

-- Count rows
SELECT COUNT(*) FROM 'data.csv';

-- Describe schema
DESCRIBE 'data.csv';

-- Query JSON
SELECT * FROM 'data.json';
```

#### 18. Python Script Support (Pyodide)
- **File**: `src/components/QueryPanel/index.tsx`, `src/lib/pyodide.ts`
- Execute Python code on file content
- Powered by Pyodide (Python in WebAssembly)
- Pre-loaded packages: pandas, numpy, pyyaml
- Auto-injected variables: `content`, `data`, `file_path`
- Helper functions: `load_json()`, `load_csv()`, `load_yaml()`, `save()`
- Display matplotlib plots inline

**Example scripts:**
```python
# Access file content
print(f"Type: {type(data)}")
print(f"Keys: {data.keys() if isinstance(data, dict) else 'N/A'}")

# For CSV files - data is a pandas DataFrame
print(f"Shape: {data.shape}")
print(data.head())

# Filter and analyze
filtered = data[data['age'] > 30]
print(f"Filtered rows: {len(filtered)}")

# Create visualizations
import matplotlib.pyplot as plt
plt.figure(figsize=(8, 4))
data['column'].hist()
plt  # Display inline

# Save changes back to file
save(data.to_json())
```

#### 19. Results Viewer
- **File**: `src/components/QueryPanel/ResultsViewer.tsx`
- Table view with sorting and filtering
- JSON tree view for Python dict/list results
- Text output for print statements
- Pagination (100 rows per page)
- Export to CSV or JSON
- Execution time display
- Error display with syntax highlighting

#### 20. Query History & Bookmarks
- **File**: `src/components/QueryPanel/index.tsx`
- Automatic history tracking (last 50 queries)
- Per-file query history
- Save frequently used queries as bookmarks
- Named bookmarks for organization
- Quick re-run from history

#### 21. Query Panel UI
- Collapsible panel (VS Code terminal-style)
- Resizable height
- Monaco editor for SQL/Python input with syntax highlighting
- Language selector dropdown (SQL/Python)
- Run button with loading state
- Keyboard shortcuts: Ctrl/Cmd+Shift+Q (toggle), Ctrl/Cmd+Enter (run)

### Supported File Types for Querying

| File Type | SQL Support | Python Support | Default Action |
|-----------|-------------|----------------|----------------|
| CSV/TSV | ✅ Native | ✅ pandas DataFrame | Load as table |
| JSON | ✅ Native | ✅ Auto-parsed | Load as object/dict |
| JSONL | ✅ Native | ✅ Line-by-line | Load as array |
| Parquet | ✅ Native | ✅ pandas DataFrame | Load as table |
| TXT/LOG | ❌ | ✅ Text content | Raw text analysis |
| XML | ❌ | ✅ ElementTree | Parse XML tree |
| YAML/YML | ❌ | ✅ pyyaml | Parse YAML |

### Query Panel Keyboard Shortcuts

| Action | macOS | Windows/Linux |
|--------|-------|---------------|
| Toggle Query Panel | ⌘⇧Q | Ctrl+Shift+Q |
| Run Query | ⌘↵ | Ctrl+Enter |
| Run & Pin Results | ⌘⇧↵ | Ctrl+Shift+Enter |

## Technical Architecture

### State Management
- **Zustand** for global state
- Persistent storage for settings
- Separate stores for editor and file system

### File System
- Tauri FS API for native file operations
- Async file I/O
- Path utilities

### Editor
- Monaco Editor (VS Code's editor)
- Custom themes integration
- Event handling for cursor position

### UI Components
- Tailwind CSS for styling
- CSS variables for theming
- Lucide React for icons

### Keyboard Handling
- Custom useKeyBinding hook
- Global keyboard shortcuts
- Command palette integration

## Project Structure

```
text-editor/
├── src/
│   ├── components/
│   │   ├── Editor/              # Monaco editor wrapper
│   │   ├── FileExplorer/        # (part of Sidebar)
│   │   ├── Tabs/                # Tab bar component
│   │   ├── Sidebar/             # Left sidebar with views
│   │   ├── JSONViewer/          # JSON tree + text view
│   │   ├── Search/              # (part of Sidebar)
│   │   ├── StatusBar/           # Bottom status bar
│   │   ├── CommandPalette/      # Quick commands modal
│   │   ├── Settings/            # Settings modal
│   │   └── QueryPanel/          # NEW: SQL/Python query panel
│   │       ├── index.tsx        # Main query panel component
│   │       └── ResultsViewer.tsx # Results display component
│   ├── hooks/
│   │   └── useEditor.ts         # Custom hooks
│   ├── lib/                     # NEW: Library integrations
│   │   ├── duckdb.ts            # DuckDB WASM integration
│   │   └── pyodide.ts           # Pyodide Python integration
│   ├── stores/
│   │   ├── editorStore.ts       # Editor state
│   │   └── fileSystemStore.ts   # File operations
│   ├── utils/
│   │   └── helpers.ts           # Utility functions
│   ├── themes/                  # Theme definitions
│   ├── App.tsx                  # Main app
│   └── main.tsx                 # Entry point
├── src-tauri/                   # Rust backend
│   ├── src/main.rs
│   ├── Cargo.toml
│   └── tauri.conf.json
└── package.json
```

## Build Instructions

### Prerequisites
- Node.js (v18+)
- Rust

### Development
```bash
npm install
npm run tauri:dev
```

### Production Build
```bash
# macOS
npm run tauri:build
# Output: src-tauri/target/release/bundle/macos/

# Windows
npm run tauri:build
# Output: src-tauri/target/release/bundle/msi/

# Linux
npm run tauri:build
# Output: src-tauri/target/release/bundle/deb/
```

## What Makes This Editor Special

1. **VS Code's Editor Core** - Uses the same editor component as VS Code
2. **Native Performance** - Tauri provides native desktop performance
3. **Small Bundle Size** - Much smaller than Electron-based editors
4. **JSON Viewer** - Unique tree view for JSON files
5. **Query Panel** - Built-in SQL and Python data analysis (like DataGrip + Jupyter!)
6. **Cross-Platform** - Works on macOS, Windows, and Linux
7. **Extensible** - Easy to add new features and languages

## Future Enhancements

Potential features for future versions:
- Plugin system
- Git integration (diff, blame, staging)
- Terminal integration
- LSP (Language Server Protocol) support
- Vim keybindings mode
- Collaborative editing
- Custom themes marketplace
