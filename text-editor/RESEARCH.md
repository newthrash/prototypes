# Text Editor Research

Researching features from major text editors to inform our design decisions.

## 1. Notepad++ (Windows Classic)

**Best Features:**
- **Syntax Highlighting:** 80+ languages supported, user-defined languages via UDL (User Defined Language)
- **Code Folding:** Syntax-aware folding based on indentation or language structure
- **Multi-cursor:** Column mode editing (Alt+drag), multi-editing
- **Find/Replace:** Regex support, multi-file search, mark/highlight matches
- **Split View:** Clone document to other view, split vertically/horizontally
- **File Explorer:** Simple folder as workspace, file browser panel
- **Tabs:** Tabbed interface with drag-and-drop reordering
- **Plugins:** Robust plugin manager (NPP Plugin Manager), 100+ plugins available
- **Performance:** Handles large files (100MB+) efficiently, lightweight (~4MB)
- **Sessions:** Remember open files, session snapshots
- **Macros:** Record and playback keyboard actions
- **Line Operations:** Sort, remove duplicates, join lines, split lines
- **Encoding:** Full encoding support (UTF-8, UTF-16, ANSI, etc.)

## 2. Sublime Text (Speed & Power)

**Best Features:**
- **Goto Anything (Ctrl+P):** Jump to files, symbols, lines instantly
- **Command Palette (Ctrl+Shift+P):** Access all commands without menus
- **Multiple Cursors:** Click to place multiple cursors, Ctrl+D for next occurrence
- **Minimap:** Code overview on the right side
- **Distraction-Free Mode:** Full-screen editing, no UI chrome
- **Split Editing:** Up to 4-pane split editing
- **Instant Project Switch:** Switch between projects instantly
- **Python API:** Extensive plugin API via Python
- **Package Control:** Thousands of community packages
- **Performance:** Extremely fast startup and file loading
- **Symbol Indexing:** Go to definition, project-wide symbol search
- **Vintage Mode:** Vim emulation built-in
- **Themes:** Highly customizable UI themes and color schemes

## 3. VS Code (Most Popular, Extensions)

**Best Features:**
- **LSP Support:** Native Language Server Protocol support for IntelliSense
- **Extensions:** 30,000+ extensions in marketplace
- **Integrated Terminal:** Built-in terminal panel
- **Git Integration:** Built-in Git support, diff viewer, blame annotations
- **Debugging:** Full debugging support with breakpoints, call stack, variables
- **IntelliSense:** Smart code completion, parameter hints, quick info
- **Refactoring:** Rename, extract method, organize imports
- **Emmet:** Built-in Emmet support for HTML/CSS
- **Snippets:** Code snippets with tab stops and placeholders
- **Tasks:** Build task runner integration
- **Settings Sync:** Sync settings across devices
- **Live Share:** Real-time collaborative editing
- **Remote Development:** SSH, Containers, WSL support
- **Zen Mode:** Distraction-free editing
- **Outline View:** Symbol tree view

## 4. Atom (GitHub's Editor - Discontinued)

**Best Features:**
- **Hackable:** Everything is configurable via CSS/JavaScript
- **Teletype:** Real-time collaborative editing
- **GitHub Integration:** Built-in GitHub panel for PRs/issues
- **Package Ecosystem:** 8,000+ packages
- **Themes:** UI and syntax themes easy to customize
- **Fuzzy Finder (Cmd+T):** Quick file finder
- **Command Palette:** Access all commands
- **Autocomplete:** Autocomplete+ for intelligent suggestions
- **File Icons:** File type icons in tree view
- **Minimap:** Code overview (via package)
- **Split Panes:** Multiple panes for side-by-side editing

## 5. Vim/Neovim (Modal Editing)

**Best Features:**
- **Modal Editing:** Normal, insert, visual, command modes
- **Motion Commands:** Efficient text navigation (w, b, e, $, ^, etc.)
- **Text Objects:** Operate on semantic units (iw, aw, i", a")
- **Macros:** Record and replay complex actions
- **Registers:** Multiple clipboards (26 named + special registers)
- **Marks:** Set marks for navigation within files
- **Splits:** Horizontal and vertical window splits
- **Buffers:** Multiple files open without visible tabs
- **Search/Replace:** Powerful regex with confirmation
- **Undo Tree:** Navigate undo history as tree
- **Plugins:** Extensive plugin ecosystem (VimScript/Lua)
- **Remote Editing:** Edit files over SSH
- **Lightweight:** Minimal resource usage
- **Everywhere:** Available on virtually all systems

## 6. Emacs (Extensibility)

**Best Features:**
- **Everything is a Command:** Every action is a callable function
- **Elisp:** Customization via Emacs Lisp
- **Org Mode:** Outlining, note-taking, task management
- **Magit:** Best-in-class Git interface
- **Dired:** File manager built-in
- **Shell Integration:** Eshell, term, ansi-term
- **Email:** Gnus, mu4e for email
- **Web Browsing:** EWW built-in browser
- **Package Manager:** ELPA, MELPA repositories
- **Self-Documenting:** Extensive help system
- **Keyboard Macros:** Record and replay
- **Registers:** Store text and positions
- **Bookmarks:** Save file positions
- **Tramp:** Edit remote files

## 7. TextMate (Mac Classic)

**Best Features:**
- **Bundles:** Language support via bundles (shared with Sublime/Atom)
- **Snippet System:** Powerful tab-triggered snippets
- **Column Selection:** Option-drag for column editing
- **Project Drawer:** File tree sidebar
- **Search:** Project-wide search with regex
- **Themes:** Beautiful syntax themes
- **Command Output:** Run shell commands, capture output
- **Mate CLI:** Command-line integration
- **Code Folding:** Collapse code blocks
- **Symbol List:** Quick navigation to symbols

## 8. BBEdit (Mac Power Editor)

**Best Features:**
- **Text Factory:** Automate multi-step text processing
- **Grep:** Pattern matching with custom patterns
- **Multi-File Search:** Search across files with results browser
- **FTP/SFTP:** Built-in file transfer
- **Preview:** Live HTML preview
- **Text Statistics:** Word count, readability stats
- **Clippings:** Code snippet library
- **Scripting:** AppleScript and shell script integration
- **Difference:** Compare files and folders
- **Scratchpad:** Temporary workspace
- **Sleep:** Remember state between sessions

## 9. UltraEdit (Hex Editing, Large Files)

**Best Features:**
- **Hex Editing:** Full hex editor with insert/replace modes
- **Large File Handling:** Open files >4GB
- **Column Mode:** Block/column editing
- **FTP/SFTP:** Built-in file transfer with sync
- **Macros:** Powerful macro recording and scripting
- **Templates:** Code templates with variables
- **Compare:** File and folder comparison
- **XML/HTML Tools:** Tag matching, reformatting
- **SSH/Telnet:** Terminal built-in
- **Project Support:** Project workspace management
- **Themes:** Customizable UI themes

## 10. Kate (KDE Editor)

**Best Features:**
- **Sessions:** Save and restore editor sessions
- **Projects:** Project management with file list
- **LSP Support:** Language Server Protocol integration
- **Vi Mode:** Vim emulation
- **Terminal:** Built-in terminal panel
- **Code Folding:** Collapsible code blocks
- **Syntax Highlighting:** 300+ languages
- **Search/Replace:** Regex support, search in files
- **Split View:** Multiple editor views
- **Minimap:** Document overview
- **Git Integration:** Git blame annotations
- **Plugin Interface:** Extensible via plugins
- **Color Themes:** Multiple color schemes

## 11. Geany (Lightweight IDE)

**Best Features:**
- **Fast Startup:** Quick launch time
- **Symbol List:** Document structure outline
- **Build Integration:** Compile and run from editor
- **Project Management:** Simple project files
- **Code Folding:** Syntax-based folding
- **Auto-completion:** Symbol auto-completion
- **Snippets:** Configurable code snippets
- **Plugins:** Plugin system for extensions
- **Terminal:** Built-in VTE terminal
- **Split Window:** View multiple files
- **Color Schemes:** Customizable themes

## 12. Brackets (Web-Focused)

**Best Features:**
- **Live Preview:** Real-time browser preview for HTML/CSS
- **Quick Edit:** Inline editor for CSS/JS within HTML
- **Quick Docs:** Inline documentation
- **Preprocessor Support:** LESS, SCSS compilation
- **Extension Registry:** Web-focused extensions
- **Inline Find:** Find and replace in current file
- **JS Code Hints:** JavaScript code completion
- **Multiple Cursors:** Multi-cursor editing
- **Split View:** Side-by-side editing
- **Themes:** Customizable themes

---

## Key Features to Implement (Prioritized)

Based on research, here are the most important features to implement:

### Tier 1 - Essential
1. **Monaco Editor** (VS Code's editor) - gives us syntax highlighting, multi-cursor, folding, minimap
2. **File Explorer** - Tree view with file operations
3. **Tabs** - Tabbed interface with drag-drop
4. **Search** - Find/replace in file and across files
5. **Command Palette** - Quick command access
6. **Status Bar** - Line/column, file type, encoding info

### Tier 2 - Important
7. **JSON Viewer** - Dedicated JSON mode (special feature)
8. **Split View** - Horizontal/vertical splits
9. **Themes** - Dark/light mode support
10. **Auto-save** - Automatic file saving
11. **Session Restore** - Remember open files
12. **Settings** - User preferences

### Tier 3 - Nice to Have
13. **Keyboard Shortcuts** - Customizable keybindings
14. **Word Count** - Document statistics
15. **Zen Mode** - Distraction-free editing
16. **Recent Files** - File history
17. **Encoding Support** - UTF-8, UTF-16, etc.

### Technical Decisions
- **Editor:** Monaco Editor (monaco-react) - gives us VS Code's editing experience
- **File Operations:** Tauri FS API for native file access
- **State Management:** Zustand for React state
- **Icons:** Lucide React
- **Styling:** Tailwind CSS with CSS variables for theming
