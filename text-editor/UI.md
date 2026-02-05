# OpenText Editor - UI Overview

## Application Layout

```
┌─────────────────────────────────────────────────────────────┐
│ [Sidebar] │ [Tab Bar]                                     │
│           │ file1.js | file2.ts [+] | Split H | Split V   │
├───────────┴─────────────────────────────────────────────────┤
│                                                             │
│                     [Editor Area]                           │
│                                                             │
│    Welcome to OpenText!                                     │
│                                                             │
│    [Open File] [Open Folder]                                │
│                                                             │
│    Recent Files:                                            │
│    - /path/to/file1.js                                      │
│    - /path/to/file2.ts                                      │
│                                                             │
│                                                             │
├─────────────────────────────────────────────────────────────┤
│ Git: main  │ Ln 12, Col 34 │ UTF-8 │ JS │ 234 words │ Dark │
└─────────────────────────────────────────────────────────────┘
```

## Components

### 1. Activity Bar (Leftmost)
- **Icons**: Explorer, Search, JSON Viewer, Git, Settings
- **Function**: Switch between sidebar views
- **Visual**: 48px wide, icons with active state highlight

### 2. Sidebar (250px default)

#### Explorer View
```
EXPLORER                [+] [⟳]
my-project/
  📁 src/
    📄 main.ts
    📄 utils.ts
  📄 package.json
  📄 README.md
```

#### Search View
```
SEARCH
[Search...                ]
[Replace...               ]
[Aa] [ab] [.*]      [Find All] [Clear]

12 results in 3 files
  src/main.ts
    const x = 5;
  src/utils.ts
    export const helper
```

#### JSON Viewer Panel
```
JSON Viewer
Open a JSON file and press Ctrl+Shift+J 
to toggle JSON view mode.
```

### 3. Tab Bar
```
┌─────────────────────────────────────────────────┐
│ 📄 file1.js  │ 📄 file2.ts ● │ 📄 data.json │ [│] [─]
└─────────────────────────────────────────────────┘
```
- File icon based on extension
- Dot (●) indicates unsaved changes
- Split view controls on right

### 4. Editor Area
- Monaco Editor (VS Code's editor)
- Syntax highlighting
- Line numbers
- Minimap (right side)
- Multiple cursors support

### 5. Status Bar (22px height)
```
┌──────────────────────────────────────────────────────────────────┐
│ 📁 my-project  ● Unsaved  ⚡ Format JSON  │  Ln 12, Col 34 │ UTF-8 │ JS │ 234 words │ Wrap │ Lines │ Dark │ ⛶ │ 🔔 │
└──────────────────────────────────────────────────────────────────┘
```

**Left Side**:
- Current folder/project name
- Unsaved changes indicator
- Action buttons (Format JSON, etc.)

**Right Side**:
- Cursor position (Line, Column)
- File encoding (UTF-8)
- Language mode (JS, TS, etc.)
- Word count
- Toggle buttons (Wrap, Lines, Theme, Zen Mode)

### 6. Command Palette (Modal)
```
┌──────────────────────────────────────────────────┐
│ 🔍 Type a command or search...              ESC │
├──────────────────────────────────────────────────┤
│ File                                             │
│  📄 Open File...                    ⌘O          │
│  📁 Open Folder...                  ⌘⇧O         │
│  ➕ New File                        ⌘N          │
│                                                  │
│ View                                             │
│  📐 Toggle Sidebar                  ⌘B          │
│  ⛶ Toggle Zen Mode                  ⌘K Z        │
├──────────────────────────────────────────────────┤
│ ↑↓ Navigate  ↵ Select                     24 cmd │
└──────────────────────────────────────────────────┘
```

### 7. Settings Panel (Modal)
```
┌────────────────────────────────────────────────────┐
│ Settings                                       [X] │
├────────────────┬───────────────────────────────────┤
│                │                                   │
│ 📄 Text Editor │ Font                              │
│ 🎨 Appearance  │   Font Size: [──────●──] 14px     │
│ 📁 Files       │   Font: [Menlo ▼]                │
│ ⌨️ Keyboard    │                                   │
│ ℹ️ About       │ Editing                           │
│                │   Tab Size: [2] [4] [8]          │
│                │   [✓] Insert Spaces               │
│                │   Word Wrap: [On ▼]               │
│                │                                   │
│                │ Display                           │
│                │   [✓] Minimap                     │
│                │   [✓] Line Numbers                │
│                │                                   │
└────────────────┴───────────────────────────────────┘
```

### 8. JSON Viewer (Special Feature)
When a JSON file is opened:

**Tree View Mode:**
```
┌──────────────────────────────────────────────────┐
│ Tree View [Text View]        [Format] [Minify] [📋]│
├──────────────────────────────────────────────────┤
│ [🔍 Search in JSON...]                           │
├──────────────────────────────────────────────────┤
│ ▼ root: {4}                                      │
│   ▶ config: {3}                                  │
│   ▼ data: [5]                                    │
│       [0]: "item1"                               │
│       [1]: "item2"                               │
│       [2]: {                                     │
│         name: "test"                             │
│         value: 123                               │
│       }                                          │
│   ▶ meta: {2}                                    │
│                                                  │
├──────────────────────────────────────────────────┤
│ 4 root properties              1,234 characters  │
└──────────────────────────────────────────────────┘
```

**Text View Mode:**
```
┌──────────────────────────────────────────────────┐
│ [Tree View] Text View          [Format] [Minify] │
├──────────────────────────────────────────────────┤
│ {                                                │
│   "config": {                                    │
│     "name": "test",                              │
│     "version": "1.0.0"                           │
│   },                                             │
│   "data": [                                      │
│     "item1",                                     │
│     "item2"                                      │
│   ]                                              │
│ }                                                │
└──────────────────────────────────────────────────┘
```

### 9. Zen Mode
```
┌────────────────────────────────────────────────────┐
│                                                    │
│                                                    │
│               (Editor takes full screen)           │
│                                                    │
│               function hello() {                   │
│                 console.log("Hello World!");       │
│               }                                    │
│                                                    │
│                                                    │
│                                                    │
└────────────────────────────────────────────────────┘
```
- Hidden: Sidebar, Tab Bar, Status Bar
- Only editor visible
- Press `Escape` or `Ctrl+K Z` to exit

## Keyboard Shortcuts Reference

### File Operations
| Action | macOS | Windows/Linux |
|--------|-------|---------------|
| Open File | ⌘O | Ctrl+O |
| Open Folder | ⌘⇧O | Ctrl+Shift+O |
| Save | ⌘S | Ctrl+S |
| Save As | ⌘⇧S | Ctrl+Shift+S |
| Close Tab | ⌘W | Ctrl+W |
| New File | ⌘N | Ctrl+N |

### Navigation
| Action | macOS | Windows/Linux |
|--------|-------|---------------|
| Command Palette | ⌘⇧P | Ctrl+Shift+P |
| Toggle Sidebar | ⌘B | Ctrl+B |
| Settings | ⌘, | Ctrl+, |
| Zen Mode | ⌘K Z | Ctrl+K Z |

### Editing
| Action | macOS | Windows/Linux |
|--------|-------|---------------|
| Find | ⌘F | Ctrl+F |
| Replace | ⌘H | Ctrl+H |
| Find in Files | ⌘⇧F | Ctrl+Shift+F |
| Multi-cursor | ⌥Click | Alt+Click |
| Select All | ⌘A | Ctrl+A |

### JSON Viewer
| Action | macOS | Windows/Linux |
|--------|-------|---------------|
| Toggle JSON View | ⌘⇧J | Ctrl+Shift+J |

## Theme Colors

### Dark Theme (Default)
```
Background Primary:   #1e1e1e (Main editor bg)
Background Secondary: #252526 (Sidebar, panels)
Background Tertiary:  #2d2d30 (Buttons, inputs)
Background Hover:     #2a2d2e (Hover states)
Background Active:    #37373d (Active states)
Text Primary:         #cccccc (Main text)
Text Secondary:       #858585 (Secondary text)
Border Color:         #3e3e42 (Borders)
Accent Color:         #007acc (Primary accent)
Accent Hover:         #0098ff (Hover accent)
Success:              #4ec9b0
Warning:              #ce9178
Error:                #f48771
```

### Light Theme
```
Background Primary:   #ffffff
Background Secondary: #f3f3f3
Background Tertiary:  #ececec
Background Hover:     #e8e8e8
Background Active:    #dcdcdc
Text Primary:         #333333
Text Secondary:       #666666
Border Color:         #e5e5e5
Accent Color:         #0078d4
Accent Hover:         #106ebe
```

## File Type Icons

| Extension | Icon |
|-----------|------|
| .js, .jsx | 📜 |
| .ts, .tsx | 📘 |
| .py | 🐍 |
| .html | 🌐 |
| .css, .scss | 🎨 |
| .json | 📋 |
| .md | 📝 |
| .java | ☕ |
| .go | 🐹 |
| .rs | ⚙️ |
| .rb | 💎 |
| .php | 🐘 |
| .sql | 🗄️ |
| Folder | 📁 |
| Folder (Open) | 📂 |
| Default | 📄 |

## Responsive Behavior

### Window Resizing
- Sidebar: Min 200px, Max 400px
- Editor: Minimum 300px width
- Status Bar: Always visible (22px height)
- Tab Bar: Horizontal scroll when many tabs

### Split View
```
┌─────────────────────┬─────────────────────┐
│                     │                     │
│   Editor 1          │   Editor 2          │
│   (50% width)       │   (50% width)       │
│                     │                     │
└─────────────────────┴─────────────────────┘

┌─────────────────────────────────────────┐
│              Editor 1 (50% height)      │
├─────────────────────────────────────────┤
│              Editor 2 (50% height)      │
└─────────────────────────────────────────┘
```

## Getting Started Flow

1. **First Launch**:
   ```
   ┌──────────────────────────────────────────┐
   │                                          │
   │           OpenText                       │
   │    A modern, fast text editor            │
   │                                          │
   │    [Open File]    [Open Folder]          │
   │                                          │
   │    Recent Files:                         │
   │    - /path/to/recent/file.js             │
   │                                          │
   │    ⌘P Command Palette  ⌘B Sidebar        │
   │                                          │
   └──────────────────────────────────────────┘
   ```

2. **Open a File**: Click "Open File" or press ⌘O
3. **Start Editing**: Monaco Editor provides instant syntax highlighting
4. **Save**: ⌘S to save
5. **Access Commands**: ⌘⇧P for command palette
6. **Toggle JSON View**: Open a JSON file, press ⌘⇧J

## Tips & Tricks

- **Multi-cursor**: Alt+Click to place multiple cursors
- **Quick Open**: ⌘P in command palette to switch between recent files
- **Format JSON**: Open JSON file, click "Format JSON" in status bar
- **Zen Mode**: ⌘K Z for distraction-free editing
- **Word Wrap**: Click "Wrap" in status bar to toggle
- **Theme Toggle**: Click "Dark/Light" in status bar
