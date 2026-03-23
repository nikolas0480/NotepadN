import { useState } from 'react';
import { useEffect, useMemo, useRef } from 'react';
import CodeMirror, { ReactCodeMirrorRef } from '@uiw/react-codemirror';
import { oneDark } from '@codemirror/theme-one-dark';
import { search } from '@codemirror/search';
import { invoke } from '@tauri-apps/api/core';
import { open, save } from '@tauri-apps/plugin-dialog';
import { FileDown, FileUp, Plus, X } from 'lucide-react';
import { createTreeSitterExtension, setHighlightsEffect } from './highlighter';
import './App.css';

const getLanguageFromPath = (path: string): string => {
  const ext = path.split('.').pop()?.toLowerCase();
  switch (ext) {
    case 'js':
    case 'jsx':
    case 'ts':
    case 'tsx':
      return 'javascript';
    case 'rs':
      return 'rust';
    default:
      return 'text';
  }
};

const AVAILABLE_LANGUAGES = ['javascript', 'rust', 'text'];
const AVAILABLE_ENCODINGS = ['utf-8', 'windows-1251', 'utf-16le', 'iso-8859-1'];

interface Tab {
  id: string;
  title: string;
  content: string;
  path?: string;
  language: string;
  isDirty: boolean;
  encoding: string;
}

function App() {
  const [tabs, setTabs] = useState<Tab[]>(() => {
    const savedTabs = localStorage.getItem('notepadn_tabs');
    if (savedTabs) {
      try {
        return JSON.parse(savedTabs);
      } catch (e) {
        console.error('Failed to parse saved tabs', e);
      }
    }
    return [{ id: '1', title: 'Untitled', content: '', language: 'javascript', isDirty: false, encoding: 'utf-8' }];
  });

  const [activeTabId, setActiveTabId] = useState<string>(() => {
    const savedActiveId = localStorage.getItem('notepadn_activeTabId');
    if (savedActiveId) return savedActiveId;
    return '1';
  });

  const [fontSize, setFontSize] = useState<number>(() => {
    const savedFontSize = localStorage.getItem('notepadn_fontSize');
    if (savedFontSize) {
      const parsed = parseInt(savedFontSize, 10);
      if (!isNaN(parsed)) return parsed;
    }
    return 14;
  });

  const editorRef = useRef<ReactCodeMirrorRef>(null);
  const [showLangMenu, setShowLangMenu] = useState(false);
  const [showEncMenu, setShowEncMenu] = useState(false);

  const activeTab = tabs.find((t) => t.id === activeTabId) || tabs[0];

  useEffect(() => {
    localStorage.setItem('notepadn_tabs', JSON.stringify(tabs));
  }, [tabs]);

  useEffect(() => {
    localStorage.setItem('notepadn_activeTabId', activeTabId);
  }, [activeTabId]);

  useEffect(() => {
    localStorage.setItem('notepadn_fontSize', fontSize.toString());
  }, [fontSize]);

  useEffect(() => {
    const handleWheel = (e: WheelEvent) => {
      if (e.ctrlKey) {
        e.preventDefault();
        if (e.deltaY < 0) {
          setFontSize((prev) => Math.min(prev + 1, 72));
        } else {
          setFontSize((prev) => Math.max(prev - 1, 8));
        }
      }
    };

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.ctrlKey) {
        if (e.key === '=' || e.key === '+') {
          e.preventDefault();
          setFontSize((prev) => Math.min(prev + 1, 72));
        } else if (e.key === '-') {
          e.preventDefault();
          setFontSize((prev) => Math.max(prev - 1, 8));
        } else if (e.key === '0') {
          e.preventDefault();
          setFontSize(14);
        }
      }
    };

    window.addEventListener('wheel', handleWheel, { passive: false });
    window.addEventListener('keydown', handleKeyDown);

    return () => {
      window.removeEventListener('wheel', handleWheel);
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, []);

  const extensions = useMemo(() => {
    return [search(), createTreeSitterExtension(activeTab.language)];
  }, [activeTab.language]);

  // Force an initial parse when active tab changes
  useEffect(() => {
    const fetchHighlights = async () => {
      try {
        const tokens = await invoke<any[]>('parse_highlights', { text: activeTab.content, language: activeTab.language });
        if (editorRef.current?.view) {
          editorRef.current.view.dispatch({
             effects: setHighlightsEffect.of(tokens)
          });
        }
      } catch(e) {
        console.error("initial parse failed", e);
      }
    };
    fetchHighlights();
  }, [activeTabId, activeTab.language]);

  const updateActiveTab = (updates: Partial<Tab>) => {
    setTabs((currentTabs) =>
      currentTabs.map((tab) =>
        tab.id === activeTabId ? { ...tab, ...updates } : tab
      )
    );
  };

  const handleNewFile = () => {
    const newId = Date.now().toString();
    setTabs([
      ...tabs,
      { id: newId, title: 'Untitled', content: '', language: 'javascript', isDirty: false, encoding: 'utf-8' },
    ]);
    setActiveTabId(newId);
  };

  const handleOpenFile = async () => {
    try {
      const selected = await open({
        multiple: false,
      });
      if (selected && typeof selected === 'string') {
        const content = await invoke<string>('open_file', { path: selected, encoding: 'utf-8' });
        const newId = Date.now().toString();
        const pathParts = selected.split(/[\/\\]/);
        const title = pathParts[pathParts.length - 1];

        // guess language
        const language = getLanguageFromPath(selected);

        setTabs([
          ...tabs,
          { id: newId, title, content, path: selected, language, isDirty: false, encoding: 'utf-8' },
        ]);
        setActiveTabId(newId);
      }
    } catch (e) {
      console.error('Failed to open file', e);
    }
  };

  const handleSaveFile = async () => {
    if (!activeTab.path) {
      try {
        const selected = await save({
          defaultPath: activeTab.title,
        });
        if (selected && typeof selected === 'string') {
          await invoke('save_file', { path: selected, content: activeTab.content, encoding: activeTab.encoding });
          const pathParts = selected.split(/[\/\\]/);
          const title = pathParts[pathParts.length - 1];
          updateActiveTab({ path: selected, title, isDirty: false });
        }
      } catch (e) {
        console.error('Failed to save file as', e);
      }
    } else {
      try {
        await invoke('save_file', { path: activeTab.path, content: activeTab.content, encoding: activeTab.encoding });
        updateActiveTab({ isDirty: false });
      } catch (e) {
        console.error('Failed to save file', e);
      }
    }
  };

  const closeTab = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const newTabs = tabs.filter((t) => t.id !== id);
    if (newTabs.length === 0) {
      const newId = Date.now().toString();
      setTabs([
        { id: newId, title: 'Untitled', content: '', language: 'javascript', isDirty: false, encoding: 'utf-8' },
      ]);
      setActiveTabId(newId);
    } else {
      if (id === activeTabId) {
        setActiveTabId(newTabs[newTabs.length - 1].id);
      }
      setTabs(newTabs);
    }
  };

  const handleDragStart = (e: React.DragEvent, id: string) => {
    e.dataTransfer.setData('tab_id', id);
  };

  const handleDrop = (e: React.DragEvent, targetId: string) => {
    e.preventDefault();
    const sourceId = e.dataTransfer.getData('tab_id');
    if (sourceId === targetId) return;

    const sourceIndex = tabs.findIndex(t => t.id === sourceId);
    const targetIndex = tabs.findIndex(t => t.id === targetId);
    if (sourceIndex === -1 || targetIndex === -1) return;

    const newTabs = [...tabs];
    const [movedTab] = newTabs.splice(sourceIndex, 1);
    newTabs.splice(targetIndex, 0, movedTab);

    setTabs(newTabs);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const handleEncodingChange = async (enc: string) => {
    if (activeTab.path && !activeTab.isDirty) {
      try {
        const content = await invoke<string>('open_file', { path: activeTab.path, encoding: enc });
        updateActiveTab({ content, encoding: enc });
      } catch (e) {
        console.error('Failed to reopen file with new encoding', e);
      }
    } else {
      updateActiveTab({ encoding: enc });
    }
    setShowEncMenu(false);
  };

  return (
    <div className="flex flex-col h-screen bg-[#282c34] text-white font-sans">
      {/* Header / Toolbar */}
      <div className="flex items-center justify-between px-4 py-2 bg-[#21252b] border-b border-[#181a1f] shadow-sm">
        <div className="flex space-x-2">
          <button
            onClick={handleNewFile}
            className="flex items-center px-3 py-1.5 text-sm rounded hover:bg-[#3a3f4b] transition-colors"
            title="New File"
          >
            <Plus size={16} className="mr-1.5" /> New
          </button>
          <button
            onClick={handleOpenFile}
            className="flex items-center px-3 py-1.5 text-sm rounded hover:bg-[#3a3f4b] transition-colors"
            title="Open File"
          >
            <FileUp size={16} className="mr-1.5" /> Open
          </button>
          <button
            onClick={handleSaveFile}
            className="flex items-center px-3 py-1.5 text-sm rounded hover:bg-[#3a3f4b] transition-colors"
            title="Save File"
          >
            <FileDown size={16} className="mr-1.5" /> Save {activeTab.isDirty && '*'}
          </button>
        </div>
        <div className="text-xs text-gray-400 font-semibold tracking-wider">NOTEPADN</div>
      </div>

      {/* Tabs */}
      <div className="flex bg-[#1e2227] overflow-x-auto custom-scrollbar">
        {tabs.map((tab) => (
          <div
            key={tab.id}
            onClick={() => setActiveTabId(tab.id)}
            draggable={true}
            onDragStart={(e) => handleDragStart(e, tab.id)}
            onDrop={(e) => handleDrop(e, tab.id)}
            onDragOver={handleDragOver}
            className={`flex items-center min-w-max px-4 py-2 cursor-pointer border-r border-[#181a1f] text-sm select-none transition-colors ${
              activeTabId === tab.id
                ? 'bg-[#282c34] text-white border-t-2 border-t-[#4d78cc]'
                : 'bg-[#21252b] text-gray-400 hover:bg-[#2c313a]'
            }`}
          >
            <span className="mr-2">{tab.title}{tab.isDirty ? ' *' : ''}</span>
            <button
              onClick={(e) => closeTab(tab.id, e)}
              className="p-0.5 rounded-md hover:bg-[#3e4451] text-gray-400 hover:text-white transition-colors"
            >
              <X size={14} />
            </button>
          </div>
        ))}
      </div>

      {/* Editor Area */}
      <div className="flex-1 overflow-hidden relative">
        <CodeMirror
          ref={editorRef}
          value={activeTab.content}
          height="100%"
          theme={oneDark}
          extensions={extensions}
          onChange={(value) => {
            updateActiveTab({ content: value, isDirty: true });
          }}
          className="h-full"
          style={{ fontSize: `${fontSize}px` }}
        />
      </div>

      {/* Status Bar */}
      <div className="flex items-center justify-between px-4 py-1 bg-[#21252b] text-xs text-gray-400 border-t border-[#181a1f]">
        <div>
           {activeTab.path || 'Unsaved File'}
        </div>
        <div className="flex space-x-4 relative">
          <span
            className="cursor-pointer hover:text-white transition-colors"
            onClick={() => { setShowEncMenu(!showEncMenu); setShowLangMenu(false); }}
          >
            Encoding: {activeTab.encoding}
          </span>
          {showEncMenu && (
            <div className="absolute bottom-full right-20 mb-1 bg-[#282c34] border border-[#181a1f] shadow-lg rounded py-1 w-32 z-50">
              {AVAILABLE_ENCODINGS.map(enc => (
                <div
                  key={enc}
                  className={`px-3 py-1.5 cursor-pointer hover:bg-[#3e4451] ${activeTab.encoding === enc ? 'text-white bg-[#2c313a]' : 'text-gray-400'}`}
                  onClick={() => handleEncodingChange(enc)}
                >
                  {enc}
                </div>
              ))}
            </div>
          )}
          <span
            className="cursor-pointer hover:text-white transition-colors"
            onClick={() => { setShowLangMenu(!showLangMenu); setShowEncMenu(false); }}
          >
            Language: {activeTab.language}
          </span>
          {showLangMenu && (
            <div className="absolute bottom-full right-0 mb-1 bg-[#282c34] border border-[#181a1f] shadow-lg rounded py-1 w-32 z-50">
              {AVAILABLE_LANGUAGES.map(lang => (
                <div
                  key={lang}
                  className={`px-3 py-1.5 cursor-pointer hover:bg-[#3e4451] ${activeTab.language === lang ? 'text-white bg-[#2c313a]' : 'text-gray-400'}`}
                  onClick={() => {
                    updateActiveTab({ language: lang });
                    setShowLangMenu(false);
                  }}
                >
                  {lang}
                </div>
              ))}
            </div>
          )}
          <span>{activeTab.content.length} chars</span>
        </div>
      </div>
    </div>
  );
}

export default App;
