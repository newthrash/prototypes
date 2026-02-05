import { X, Circle, Split } from 'lucide-react';
import { useEditorStore } from '../../stores/editorStore';
import { useFileSystemStore } from '../../stores/fileSystemStore';
import { getFileIcon } from '../../utils/helpers';

const TabBar = () => {
  const {
    tabs,
    activeTabId,
    splitMode,
    setActiveTab,
    closeTab,
    setSplitMode,
  } = useEditorStore();

  const { saveFile } = useFileSystemStore();

  const handleTabClick = (tabId: string) => {
    setActiveTab(tabId);
  };

  const handleCloseTab = async (e: React.MouseEvent, tabId: string) => {
    e.stopPropagation();
    const tab = tabs.find(t => t.id === tabId);
    
    if (tab?.isDirty) {
      const shouldSave = confirm(`Do you want to save changes to ${tab.name}?`);
      if (shouldSave) {
        try {
          await saveFile(tab.path, tab.content);
        } catch (error) {
          console.error('Error saving file:', error);
          return;
        }
      }
    }
    
    closeTab(tabId);
  };

  const handleTabContextMenu = (e: React.MouseEvent, _tabId: string) => {
    e.preventDefault();
    // Could show context menu with close options
  };

  if (tabs.length === 0) return null;

  return (
    <div className="flex items-center bg-secondary border-b border-border-color">
      {/* Tabs */}
      <div className="flex-1 flex overflow-x-auto">
        {tabs.map((tab) => (
          <div
            key={tab.id}
            onClick={() => handleTabClick(tab.id)}
            onContextMenu={(e) => handleTabContextMenu(e, tab.id)}
            className={`group flex items-center gap-2 px-3 py-2 min-w-[120px] max-w-[200px] cursor-pointer border-r border-border-color transition-colors ${
              activeTabId === tab.id
                ? 'bg-primary border-t-2 border-t-accent'
                : 'bg-secondary hover:bg-hover border-t-2 border-t-transparent'
            }`}
          >
            <span className="text-sm">{getFileIcon(tab.name)}</span>
            <span className={`flex-1 text-sm truncate ${tab.isDirty ? 'italic' : ''}`}>
              {tab.name}
            </span>
            {tab.isDirty && (
              <Circle size={8} className="fill-text-secondary text-text-secondary" />
            )}
            <button
              onClick={(e) => handleCloseTab(e, tab.id)}
              className="opacity-0 group-hover:opacity-100 p-0.5 hover:bg-tertiary rounded transition-all"
            >
              <X size={14} />
            </button>
          </div>
        ))}
      </div>

      {/* Split View Controls */}
      <div className="flex items-center gap-1 px-2 border-l border-border-color">
        <button
          onClick={() => setSplitMode(splitMode === 'vertical' ? 'none' : 'vertical')}
          className={`p-1.5 rounded transition-colors ${
            splitMode === 'vertical' ? 'bg-accent text-white' : 'hover:bg-hover text-text-secondary'
          }`}
          title="Split Editor Right"
        >
          <Split size={16} className="rotate-90" />
        </button>
        <button
          onClick={() => setSplitMode(splitMode === 'horizontal' ? 'none' : 'horizontal')}
          className={`p-1.5 rounded transition-colors ${
            splitMode === 'horizontal' ? 'bg-accent text-white' : 'hover:bg-hover text-text-secondary'
          }`}
          title="Split Editor Down"
        >
          <Split size={16} />
        </button>
      </div>
    </div>
  );
};

export default TabBar;
