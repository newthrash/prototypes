import { useState } from 'react';
import { 
  X, 
  Github, 
  Globe, 
  Palette, 
  Layout, 
  FileType,
  Keyboard,
  Info,
} from 'lucide-react';
import { useEditorStore } from '../../stores/editorStore';

interface SettingsProps {
  onClose: () => void;
}

const Settings = ({ onClose }: SettingsProps) => {
  const [activeSection, setActiveSection] = useState('editor');
  
  const sections = [
    { id: 'editor', label: 'Text Editor', icon: FileType },
    { id: 'appearance', label: 'Appearance', icon: Palette },
    { id: 'files', label: 'Files', icon: Layout },
    { id: 'keyboard', label: 'Keyboard', icon: Keyboard },
    { id: 'about', label: 'About', icon: Info },
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
      <div className="w-[800px] h-[600px] bg-secondary rounded-lg shadow-xl flex overflow-hidden">
        {/* Sidebar */}
        <div className="w-48 bg-tertiary border-r border-border-color flex flex-col">
          <div className="p-4 border-b border-border-color">
            <h2 className="text-lg font-semibold text-text-primary">Settings</h2>
          </div>
          <nav className="flex-1 py-2">
            {sections.map((section) => (
              <button
                key={section.id}
                onClick={() => setActiveSection(section.id)}
                className={`w-full flex items-center gap-3 px-4 py-2.5 text-sm transition-colors ${
                  activeSection === section.id
                    ? 'bg-accent text-white'
                    : 'text-text-secondary hover:text-text-primary hover:bg-hover'
                }`}
              >
                <section.icon size={18} />
                {section.label}
              </button>
            ))}
          </nav>
        </div>

        {/* Content */}
        <div className="flex-1 flex flex-col">
          <div className="flex items-center justify-between p-4 border-b border-border-color">
            <h3 className="text-xl font-medium text-text-primary">
              {sections.find(s => s.id === activeSection)?.label}
            </h3>
            <button
              onClick={onClose}
              className="p-1 hover:bg-hover rounded text-text-secondary hover:text-text-primary"
            >
              <X size={20} />
            </button>
          </div>

          <div className="flex-1 overflow-y-auto p-6">
            {activeSection === 'editor' && <EditorSettings />}
            {activeSection === 'appearance' && <AppearanceSettings />}
            {activeSection === 'files' && <FilesSettings />}
            {activeSection === 'keyboard' && <KeyboardSettings />}
            {activeSection === 'about' && <AboutSettings />}
          </div>
        </div>
      </div>
    </div>
  );
};

const EditorSettings = () => {
  const {
    fontSize,
    setFontSize,
    fontFamily,
    setFontFamily,
    tabSize,
    setTabSize,
    insertSpaces,
    setInsertSpaces,
    wordWrap,
    setWordWrap,
    minimap,
    setMinimap,
    lineNumbers,
    setLineNumbers,
  } = useEditorStore();

  return (
    <div className="space-y-6">
      <SettingGroup title="Font">
        <SettingRow label="Font Size">
          <div className="flex items-center gap-3">
            <input
              type="range"
              min="8"
              max="32"
              value={fontSize}
              onChange={(e) => setFontSize(Number(e.target.value))}
              className="w-32"
            />
            <span className="text-text-secondary w-8">{fontSize}px</span>
          </div>
        </SettingRow>
        <SettingRow label="Font Family">
          <select
            value={fontFamily}
            onChange={(e) => setFontFamily(e.target.value)}
            className="bg-primary border border-border-color rounded px-3 py-1.5 text-sm"
          >
            <option value="Menlo, Monaco, 'Courier New', monospace">Menlo (Default)</option>
            <option value="'Fira Code', monospace">Fira Code</option>
            <option value="'JetBrains Mono', monospace">JetBrains Mono</option>
            <option value="'Source Code Pro', monospace">Source Code Pro</option>
            <option value="Consolas, monospace">Consolas</option>
          </select>
        </SettingRow>
      </SettingGroup>

      <SettingGroup title="Editing">
        <SettingRow label="Tab Size">
          <div className="flex items-center gap-2">
            {[2, 4, 8].map((size) => (
              <button
                key={size}
                onClick={() => setTabSize(size)}
                className={`px-3 py-1.5 rounded text-sm ${
                  tabSize === size
                    ? 'bg-accent text-white'
                    : 'bg-tertiary text-text-primary hover:bg-hover'
                }`}
              >
                {size}
              </button>
            ))}
          </div>
        </SettingRow>
        <SettingRow label="Insert Spaces">
          <Toggle checked={insertSpaces} onChange={setInsertSpaces} />
        </SettingRow>
        <SettingRow label="Word Wrap">
          <select
            value={wordWrap}
            onChange={(e) => setWordWrap(e.target.value as 'on' | 'off' | 'wordWrapColumn')}
            className="bg-primary border border-border-color rounded px-3 py-1.5 text-sm"
          >
            <option value="on">On</option>
            <option value="off">Off</option>
            <option value="wordWrapColumn">Column</option>
          </select>
        </SettingRow>
      </SettingGroup>

      <SettingGroup title="Display">
        <SettingRow label="Minimap">
          <Toggle checked={minimap} onChange={setMinimap} />
        </SettingRow>
        <SettingRow label="Line Numbers">
          <Toggle checked={lineNumbers} onChange={setLineNumbers} />
        </SettingRow>
      </SettingGroup>
    </div>
  );
};

const AppearanceSettings = () => {
  const { theme, setTheme } = useEditorStore();

  return (
    <div className="space-y-6">
      <SettingGroup title="Color Theme">
        <div className="grid grid-cols-3 gap-4">
          {[
            { id: 'dark', label: 'Dark', color: '#1e1e1e' },
            { id: 'light', label: 'Light', color: '#ffffff' },
            { id: 'system', label: 'System', color: 'linear-gradient(135deg, #1e1e1e 50%, #ffffff 50%)' },
          ].map((t) => (
            <button
              key={t.id}
              onClick={() => setTheme(t.id as 'dark' | 'light' | 'system')}
              className={`p-4 rounded-lg border-2 transition-all ${
                theme === t.id
                  ? 'border-accent bg-accent bg-opacity-10'
                  : 'border-border-color hover:border-text-secondary'
              }`}
            >
              <div
                className="w-full h-16 rounded mb-2 border border-border-color"
                style={{ background: t.color }}
              />
              <span className="text-sm text-text-primary">{t.label}</span>
            </button>
          ))}
        </div>
      </SettingGroup>
    </div>
  );
};

const FilesSettings = () => {
  const { autoSave, setAutoSave, recentFiles, clearRecentFiles } = useEditorStore();

  return (
    <div className="space-y-6">
      <SettingGroup title="Auto Save">
        <SettingRow label="Auto Save">
          <Toggle checked={autoSave} onChange={setAutoSave} />
        </SettingRow>
        <p className="text-sm text-text-secondary">
          Automatically save files after 1 second of inactivity.
        </p>
      </SettingGroup>

      <SettingGroup title="Recent Files">
        <SettingRow label="Recent Files History">
          <span className="text-text-secondary">{recentFiles.length} files</span>
        </SettingRow>
        <button
          onClick={clearRecentFiles}
          className="px-4 py-2 bg-tertiary hover:bg-hover text-text-primary text-sm rounded transition-colors"
        >
          Clear Recent Files
        </button>
      </SettingGroup>
    </div>
  );
};

const KeyboardSettings = () => {
  const shortcuts = [
    { key: 'Open File', binding: '⌘O / Ctrl+O' },
    { key: 'Open Folder', binding: '⌘⇧O / Ctrl+Shift+O' },
    { key: 'Save', binding: '⌘S / Ctrl+S' },
    { key: 'Save As', binding: '⌘⇧S / Ctrl+Shift+S' },
    { key: 'Close Tab', binding: '⌘W / Ctrl+W' },
    { key: 'Toggle Sidebar', binding: '⌘B / Ctrl+B' },
    { key: 'Command Palette', binding: '⌘⇧P / Ctrl+Shift+P' },
    { key: 'Find', binding: '⌘F / Ctrl+F' },
    { key: 'Find and Replace', binding: '⌘H / Ctrl+H' },
    { key: 'Find in Files', binding: '⌘⇧F / Ctrl+Shift+F' },
    { key: 'Settings', binding: '⌘, / Ctrl+,' },
    { key: 'Zen Mode', binding: '⌘K Z / Ctrl+K Z' },
  ];

  return (
    <div className="space-y-6">
      <SettingGroup title="Keyboard Shortcuts">
        <div className="space-y-1">
          {shortcuts.map((shortcut) => (
            <div
              key={shortcut.key}
              className="flex items-center justify-between py-2 px-3 hover:bg-hover rounded"
            >
              <span className="text-text-primary">{shortcut.key}</span>
              <kbd className="px-2 py-1 bg-tertiary rounded text-sm text-text-secondary font-mono">
                {shortcut.binding}
              </kbd>
            </div>
          ))}
        </div>
      </SettingGroup>
    </div>
  );
};

const AboutSettings = () => {
  return (
    <div className="space-y-6">
      <div className="text-center py-8">
        <h2 className="text-4xl font-light text-accent mb-2">OpenText</h2>
        <p className="text-text-secondary mb-4">Version 1.0.0</p>
        <p className="text-sm text-text-secondary max-w-md mx-auto">
          A modern, cross-platform text editor built with Tauri and React. 
          Designed for speed, extensibility, and developer productivity.
        </p>
      </div>

      <SettingGroup title="Links">
        <div className="space-y-2">
          <a
            href="https://github.com/opentext/editor"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-3 py-2 px-3 hover:bg-hover rounded text-text-primary"
          >
            <Github size={18} />
            GitHub Repository
          </a>
          <a
            href="https://opentext.dev"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-3 py-2 px-3 hover:bg-hover rounded text-text-primary"
          >
            <Globe size={18} />
            Website
          </a>
        </div>
      </SettingGroup>

      <SettingGroup title="Credits">
        <p className="text-sm text-text-secondary">
          Built with ❤️ using:
        </p>
        <ul className="text-sm text-text-secondary list-disc list-inside mt-2 space-y-1">
          <li>Tauri - Native desktop framework</li>
          <li>React - UI library</li>
          <li>Monaco Editor - VS Code's powerful editor</li>
          <li>Zustand - State management</li>
          <li>Lucide - Beautiful icons</li>
        </ul>
      </SettingGroup>
    </div>
  );
};

// Helper Components
const SettingGroup = ({ title, children }: { title: string; children: React.ReactNode }) => (
  <div className="space-y-4">
    <h4 className="text-sm font-semibold text-text-secondary uppercase tracking-wider border-b border-border-color pb-2">
      {title}
    </h4>
    {children}
  </div>
);

const SettingRow = ({ label, children }: { label: string; children: React.ReactNode }) => (
  <div className="flex items-center justify-between py-2">
    <span className="text-text-primary">{label}</span>
    {children}
  </div>
);

const Toggle = ({ checked, onChange }: { checked: boolean; onChange: (value: boolean) => void }) => (
  <button
    onClick={() => onChange(!checked)}
    className={`relative w-11 h-6 rounded-full transition-colors ${
      checked ? 'bg-accent' : 'bg-tertiary'
    }`}
  >
    <span
      className={`absolute top-1 left-1 w-4 h-4 bg-white rounded-full transition-transform ${
        checked ? 'translate-x-5' : 'translate-x-0'
      }`}
    />
  </button>
);

export default Settings;
