# OpenText Editor

A modern, fast, cross-platform text editor built with **Tauri** and **React**.

![OpenText Editor](screenshot.png)

## Features

### Core Editing
- ✅ **Monaco Editor** - VS Code's powerful editor component
- ✅ **Syntax Highlighting** - 50+ languages supported
- ✅ **Multiple Cursors** - Alt+Click for multi-cursor editing
- ✅ **Code Folding** - Collapsible code blocks
- ✅ **Auto-indentation** - Smart indentation
- ✅ **Bracket Matching** - Highlight matching brackets
- ✅ **Word Wrap** - Toggle word wrapping

### File Management
- ✅ **File Explorer** - Tree view with file operations
- ✅ **Tabbed Interface** - Multiple files open simultaneously
- ✅ **Recent Files** - Quick access to recently opened files
- ✅ **File Operations** - Create, rename, delete files and folders
- ✅ **Drag & Drop** - Drag files into the editor

### Search & Replace
- ✅ **Find in File** - Ctrl+F
- ✅ **Find & Replace** - Ctrl+H
- ✅ **Regex Support** - Regular expression search
- ✅ **Case Sensitivity** - Match case option
- ✅ **Whole Word** - Match whole words only

### JSON Viewer (Special Feature)
- ✅ **Tree View** - Navigate JSON as expandable tree
- ✅ **Text View** - Raw JSON with syntax highlighting
- ✅ **Search** - Search within JSON structure
- ✅ **Format/Minify** - Pretty print or minify JSON
- ✅ **Expand/Collapse** - All nodes or individually
- ✅ **Copy to Clipboard** - One-click copy

### UI/UX
- ✅ **Dark & Light Themes** - Choose your preference
- ✅ **Minimap** - Code overview on the right
- ✅ **Status Bar** - Line, column, file type, encoding info
- ✅ **Command Palette** - Quick access to all commands (Ctrl+Shift+P)
- ✅ **Zen Mode** - Distraction-free editing

### Advanced Features
- ✅ **Auto-save** - Automatic file saving
- ✅ **Session Restore** - Remember open files
- ✅ **Split View** - Horizontal/vertical editor splitting
- ✅ **Customizable** - Settings for fonts, themes, behavior
- ✅ **Keyboard Shortcuts** - Extensive shortcut support

### Query Panel (NEW!)
- ✅ **SQL Queries** - Run SQL queries on CSV, JSON, Parquet files using DuckDB
- ✅ **Python Scripts** - Execute Python code on file content via Pyodide
- ✅ **Query History** - Automatically saves recent queries
- ✅ **Bookmarked Queries** - Save frequently used queries
- ✅ **Results Viewer** - Table view with sorting, filtering, and pagination
- ✅ **Export Results** - Export query results to CSV or JSON
- ✅ **Matplotlib Support** - Display plots inline (Python)

#### Supported File Types for Querying

| File Type | SQL Support | Python Support |
|-----------|-------------|----------------|
| CSV/TSV | ✅ Native | ✅ Via pandas |
| JSON | ✅ Native | ✅ Native |
| JSONL | ✅ Native | ✅ Line by line |
| Parquet | ✅ Native | ✅ Via pandas |
| TXT/LOG | ❌ | ✅ Regex/text |
| XML | ❌ | ✅ Via xml lib |
| YAML | ❌ | ✅ Via pyyaml |

## Tech Stack

- **Tauri** - Rust-based native desktop framework
- **React** - UI library
- **TypeScript** - Type safety
- **Monaco Editor** - VS Code's editor
- **Zustand** - State management
- **Tailwind CSS** - Styling
- **Lucide React** - Icons

## Installation

### Prerequisites
- [Node.js](https://nodejs.org/) (v18 or later)
- [Rust](https://www.rust-lang.org/tools/install)

### Development

```bash
# Clone the repository
git clone https://github.com/yourusername/opentext.git
cd opentext

# Install dependencies
npm install

# Run in development mode
npm run tauri:dev
```

### Building

#### macOS
```bash
npm run tauri:build
```
The built app will be in `src-tauri/target/release/bundle/macos/`

#### Windows
```bash
npm run tauri:build
```
The built app will be in `src-tauri/target/release/bundle/msi/`

#### Linux
```bash
npm run tauri:build
```
The built app will be in `src-tauri/target/release/bundle/deb/` or `appimage/`

## Keyboard Shortcuts

| Action | macOS | Windows/Linux |
|--------|-------|---------------|
| Open File | ⌘O | Ctrl+O |
| Open Folder | ⌘⇧O | Ctrl+Shift+O |
| Save | ⌘S | Ctrl+S |
| Save As | ⌘⇧S | Ctrl+Shift+S |
| Close Tab | ⌘W | Ctrl+W |
| Find | ⌘F | Ctrl+F |
| Find & Replace | ⌘H | Ctrl+H |
| Find in Files | ⌘⇧F | Ctrl+Shift+F |
| Command Palette | ⌘⇧P | Ctrl+Shift+P |
| Toggle Sidebar | ⌘B | Ctrl+B |
| Settings | ⌘, | Ctrl+, |
| Zen Mode | ⌘K Z | Ctrl+K Z |
| **Toggle Query Panel** | **⌘⇧Q** | **Ctrl+Shift+Q** |
| **Run Query** | **⌘↵** | **Ctrl+Enter** |
| **Run & Pin Results** | **⌘⇧↵** | **Ctrl+Shift+Enter** |

## Supported Languages

- JavaScript / TypeScript / JSX / TSX
- Python
- HTML / CSS / SCSS / Less
- JSON / XML / YAML / TOML
- Java
- C / C++ / C#
- Go
- Rust
- Ruby
- PHP
- SQL
- Markdown
- Shell / Bash
- PowerShell
- Lua
- Swift
- Kotlin
- Dart
- Vue / Svelte
- And many more...

## Roadmap

- [ ] Plugin/Extension system
- [ ] Git integration (diff, blame, staging)
- [ ] Terminal integration
- [ ] LSP support for intelligent code completion
- [ ] Collaborative editing
- [ ] Custom themes and color schemes
- [ ] Vim keybindings mode
- [ ] More language support

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## License

MIT License - see LICENSE file for details

## Credits

Built with ❤️ using:
- [Tauri](https://tauri.app/)
- [React](https://react.dev/)
- [Monaco Editor](https://microsoft.github.io/monaco-editor/)
- [Zustand](https://github.com/pmndrs/zustand)
- [Tailwind CSS](https://tailwindcss.com/)
- [Lucide Icons](https://lucide.dev/)
