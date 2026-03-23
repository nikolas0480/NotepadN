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

interface Tab {
  id: string;
  title: string;
  content: string;
  path?: string;
  language: string;
  isDirty: boolean;
}

function App() {
  const [tabs, setTabs] = useState<Tab[]>([
    { id: '1', title: 'Untitled', content: '', language: 'javascript', isDirty: false },
  ]);
  const [activeTabId, setActiveTabId] = useState<string>('1');
  const editorRef = useRef<ReactCodeMirrorRef>(null);

  const activeTab = tabs.find((t) => t.id === activeTabId) || tabs[0];

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
      { id: newId, title: 'Untitled', content: '', language: 'javascript', isDirty: false },
    ]);
    setActiveTabId(newId);
  };

  const handleOpenFile = async () => {
    try {
      const selected = await open({
        multiple: false,
      });
      if (selected && typeof selected === 'string') {
        const content = await invoke<string>('open_file', { path: selected });
        const newId = Date.now().toString();
        const pathParts = selected.split(/[\/\\]/);
        const title = pathParts[pathParts.length - 1];

        // guess language
        let language = 'javascript';
        if (title.endsWith('.rs')) language = 'rust';

        setTabs([
          ...tabs,
          { id: newId, title, content, path: selected, language, isDirty: false },
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
          await invoke('save_file', { path: selected, content: activeTab.content });
          const pathParts = selected.split(/[\/\\]/);
          const title = pathParts[pathParts.length - 1];
          updateActiveTab({ path: selected, title, isDirty: false });
        }
      } catch (e) {
        console.error('Failed to save file as', e);
      }
    } else {
      try {
        await invoke('save_file', { path: activeTab.path, content: activeTab.content });
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
        { id: newId, title: 'Untitled', content: '', language: 'javascript', isDirty: false },
      ]);
      setActiveTabId(newId);
    } else {
      if (id === activeTabId) {
        setActiveTabId(newTabs[newTabs.length - 1].id);
      }
      setTabs(newTabs);
    }
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
          className="h-full text-[14px]"
        />
      </div>

      {/* Status Bar */}
      <div className="flex items-center justify-between px-4 py-1 bg-[#21252b] text-xs text-gray-400 border-t border-[#181a1f]">
        <div>
           {activeTab.path || 'Unsaved File'}
        </div>
        <div className="flex space-x-4">
          <span>Language: {activeTab.language}</span>
          <span>{activeTab.content.length} chars</span>
        </div>
      </div>
    </div>
  );
}

export default App;
