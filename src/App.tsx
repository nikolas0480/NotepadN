import { useState } from 'react';
import { useEffect, useMemo, useRef } from 'react';
import CodeMirror, { ReactCodeMirrorRef } from '@uiw/react-codemirror';
import { oneDark } from '@codemirror/theme-one-dark';
import { githubLight } from '@uiw/codemirror-theme-github';
import { search } from '@codemirror/search';
import { invoke } from '@tauri-apps/api/core';
import { open, save } from '@tauri-apps/plugin-dialog';
import { FileDown, FileUp, Plus, X, Moon, Sun } from 'lucide-react';
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
    case 'py':
      return 'python';
    case 'html':
    case 'htm':
      return 'html';
    case 'css':
      return 'css';
    case 'json':
      return 'json';
    case 'c':
    case 'h':
      return 'c';
    case 'cpp':
    case 'hpp':
    case 'cc':
    case 'cxx':
      return 'cpp';
    case 'go':
      return 'go';
    default:
      return 'text';
  }
};

const AVAILABLE_LANGUAGES = ['javascript', 'rust', 'python', 'html', 'css', 'json', 'c', 'cpp', 'go', 'text'];
const AVAILABLE_ENCODINGS = ['utf-8', 'windows-1251', 'utf-16le', 'iso-8859-1'];

interface Extension {
  id: string;
  name: string;
  command: string;
}

interface Tab {
  id: string;
  title: string;
  content: string;
  path?: string;
  language: string;
  isDirty: boolean;
  encoding: string;
  pane?: 'left' | 'right';
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
    return [{ id: '1', title: 'Untitled', content: '', language: 'javascript', isDirty: false, encoding: 'utf-8', pane: 'left' }];
  });

  const [activeTabIdLeft, setActiveTabIdLeft] = useState<string>(() => {
    const savedActiveId = localStorage.getItem('notepadn_activeTabIdLeft');
    if (savedActiveId) return savedActiveId;
    return '1';
  });

  const [activeTabIdRight, setActiveTabIdRight] = useState<string | null>(() => {
    return localStorage.getItem('notepadn_activeTabIdRight');
  });

  const [activePane, setActivePane] = useState<'left' | 'right'>('left');

  const [isSplitMode, setIsSplitMode] = useState<boolean>(() => {
    return localStorage.getItem('notepadn_isSplitMode') === 'true';
  });

  const [fontSize, setFontSize] = useState<number>(() => {
    const savedFontSize = localStorage.getItem('notepadn_fontSize');
    if (savedFontSize) {
      const parsed = parseInt(savedFontSize, 10);
      if (!isNaN(parsed)) return parsed;
    }
    return 14;
  });

  const [theme, setTheme] = useState<'dark' | 'light'>(() => {
    const savedTheme = localStorage.getItem('notepadn_theme');
    return (savedTheme as 'dark' | 'light') || 'dark';
  });

  const editorRefLeft = useRef<ReactCodeMirrorRef>(null);
  const editorRefRight = useRef<ReactCodeMirrorRef>(null);

  const [showLangMenu, setShowLangMenu] = useState(false);
  const [showEncMenu, setShowEncMenu] = useState(false);
  const [extensions, setExtensions] = useState<Extension[]>([]);
  const [showExtMenu, setShowExtMenu] = useState(false);
  const [dragOverTabId, setDragOverTabId] = useState<string | null>(null);
  const [dragPosition, setDragPosition] = useState<'left' | 'right' | null>(null);

  const leftTabs = tabs.filter(t => t.pane !== 'right');
  const rightTabs = tabs.filter(t => t.pane === 'right');

  const activeTabLeft = leftTabs.find((t) => t.id === activeTabIdLeft) || leftTabs[0];
  const activeTabRight = rightTabs.find((t) => t.id === activeTabIdRight) || rightTabs[0];


  const activeTab = activePane === 'left' ? activeTabLeft : activeTabRight;

  useEffect(() => {
    invoke<Extension[]>('load_extensions').then(setExtensions).catch(console.error);
  }, []);

  useEffect(() => {
    localStorage.setItem('notepadn_tabs', JSON.stringify(tabs));
  }, [tabs]);

  useEffect(() => {
    localStorage.setItem('notepadn_activeTabIdLeft', activeTabIdLeft);
  }, [activeTabIdLeft]);

  useEffect(() => {
    if (activeTabIdRight) {
      localStorage.setItem('notepadn_activeTabIdRight', activeTabIdRight);
    } else {
      localStorage.removeItem('notepadn_activeTabIdRight');
    }
  }, [activeTabIdRight]);

  useEffect(() => {
    localStorage.setItem('notepadn_isSplitMode', isSplitMode.toString());
  }, [isSplitMode]);

  useEffect(() => {
    localStorage.setItem('notepadn_fontSize', fontSize.toString());
  }, [fontSize]);

  useEffect(() => {
    localStorage.setItem('notepadn_theme', theme);
  }, [theme]);

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

  const getExtensions = (language: string) => [search(), createTreeSitterExtension(language, theme)];
  const extensionsLeft = useMemo(() => getExtensions(activeTabLeft?.language || 'javascript'), [activeTabLeft?.language, theme]);
  const extensionsRight = useMemo(() => getExtensions(activeTabRight?.language || 'javascript'), [activeTabRight?.language, theme]);

  // Force an initial parse when active tab changes
  useEffect(() => {
    const fetchHighlights = async (tab: Tab | undefined, ref: React.RefObject<ReactCodeMirrorRef | null>) => {
      if (!tab) return;
      try {
        const tokens = await invoke<any[]>('parse_highlights', { text: tab.content, language: tab.language });
        if (ref.current?.view) {
          ref.current.view.dispatch({
             effects: setHighlightsEffect.of(tokens)
          });
        }
      } catch(e) {
        console.error("initial parse failed", e);
      }
    };
    fetchHighlights(activeTabLeft, editorRefLeft);
  }, [activeTabIdLeft, activeTabLeft?.language]);

  useEffect(() => {
    const fetchHighlights = async (tab: Tab | undefined, ref: React.RefObject<ReactCodeMirrorRef | null>) => {
      if (!tab) return;
      try {
        const tokens = await invoke<any[]>('parse_highlights', { text: tab.content, language: tab.language });
        if (ref.current?.view) {
          ref.current.view.dispatch({
             effects: setHighlightsEffect.of(tokens)
          });
        }
      } catch(e) {
        console.error("initial parse failed", e);
      }
    };
    if (isSplitMode && activeTabRight) {
      fetchHighlights(activeTabRight, editorRefRight);
    }
  }, [activeTabIdRight, activeTabRight?.language, isSplitMode]);

  const updateActiveTab = (updates: Partial<Tab>) => {
    const currentActiveId = activePane === 'left' ? activeTabIdLeft : activeTabIdRight;
    if (!currentActiveId) return;
    setTabs((currentTabs) =>
      currentTabs.map((tab) =>
        tab.id === currentActiveId ? { ...tab, ...updates } : tab
      )
    );
  };

  const handleNewFile = () => {
    const newId = Date.now().toString();
    setTabs([
      ...tabs,
      { id: newId, title: 'Untitled', content: '', language: 'javascript', isDirty: false, encoding: 'utf-8', pane: activePane },
    ]);
    if (activePane === 'left') {
      setActiveTabIdLeft(newId);
    } else {
      setActiveTabIdRight(newId);
    }
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
          { id: newId, title, content, path: selected, language, isDirty: false, encoding: 'utf-8', pane: activePane },
        ]);
        if (activePane === 'left') {
          setActiveTabIdLeft(newId);
        } else {
          setActiveTabIdRight(newId);
        }
      }
    } catch (e) {
      console.error('Failed to open file', e);
    }
  };

  const handleSaveFile = async () => {
    if (!activeTab) return;
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
    const tabToClose = tabs.find(t => t.id === id);
    if (!tabToClose) return;
    const pane = tabToClose.pane === 'right' ? 'right' : 'left';
    const newTabs = tabs.filter((t) => t.id !== id);
    const remainingInPane = newTabs.filter((t) => (t.pane === 'right' ? 'right' : 'left') === pane);

    if (newTabs.length === 0) {
      const newId = Date.now().toString();
      setTabs([
        { id: newId, title: 'Untitled', content: '', language: 'javascript', isDirty: false, encoding: 'utf-8', pane: 'left' },
      ]);
      setActiveTabIdLeft(newId);
      if (activePane === 'right') setActivePane('left');
    } else {
      if (pane === 'left' && id === activeTabIdLeft) {
        setActiveTabIdLeft(remainingInPane.length > 0 ? remainingInPane[remainingInPane.length - 1].id : '');
      } else if (pane === 'right' && id === activeTabIdRight) {
        setActiveTabIdRight(remainingInPane.length > 0 ? remainingInPane[remainingInPane.length - 1].id : '');
      }
      setTabs(newTabs);
    }
  };

  const handleDragStart = (e: React.DragEvent, id: string) => {
    e.dataTransfer.setData('text/plain', id);
    e.dataTransfer.effectAllowed = 'move';
  };

const handleDrop = (e: React.DragEvent, targetId: string, targetPane: 'left' | 'right') => {
    e.preventDefault();

    setDragOverTabId(null);
    setDragPosition(null);

    const sourceId = e.dataTransfer.getData('text/plain');
    if (!sourceId || sourceId === targetId) return;

    const sourceIndex = tabs.findIndex(t => t.id === sourceId);
    let targetIndex = tabs.findIndex(t => t.id === targetId);
    if (sourceIndex === -1 || targetIndex === -1) return;

    const newTabs = [...tabs];
    const [movedTab] = newTabs.splice(sourceIndex, 1);

    // Update pane
    movedTab.pane = targetPane;
    if (targetPane === 'left') setActiveTabIdLeft(movedTab.id);
    if (targetPane === 'right') setActiveTabIdRight(movedTab.id);
    setActivePane(targetPane);

    // Recalculate targetIndex since we mutated array
    targetIndex = newTabs.findIndex(t => t.id === targetId);
    if (dragPosition === 'right') {
      targetIndex += 1;
    }

    newTabs.splice(targetIndex, 0, movedTab);

    setTabs(newTabs);
  };

  const handleDropEmpty = (e: React.DragEvent, targetPane: 'left' | 'right') => {
    e.preventDefault();
    const sourceId = e.dataTransfer.getData('text/plain');
    if (!sourceId) return;

    const sourceIndex = tabs.findIndex(t => t.id === sourceId);
    if (sourceIndex === -1) return;

    const newTabs = [...tabs];
    const [movedTab] = newTabs.splice(sourceIndex, 1);
    movedTab.pane = targetPane;

    if (targetPane === 'left') setActiveTabIdLeft(movedTab.id);
    if (targetPane === 'right') setActiveTabIdRight(movedTab.id);
    setActivePane(targetPane);

    newTabs.push(movedTab);
    setTabs(newTabs);
  };

const handleDragOver = (e: React.DragEvent, id: string) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';

    const target = e.currentTarget as HTMLElement;
    const rect = target.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const position = x < rect.width / 2 ? 'left' : 'right';

    setDragOverTabId(id);
    setDragPosition(position);
  };

  const handleDragEnter = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOverTabId(null);
    setDragPosition(null);
  };


  const handleExecuteExtension = async (ext: Extension) => {
    if (!activeTab) return;

    // get selected text if any
    let textToProcess = activeTab.content;

    let from = 0;
    let to = textToProcess.length;

    const view = activePane === 'left' ? editorRefLeft.current?.view : editorRefRight.current?.view;
    if (view) {
      const selection = view.state.selection.main;
      if (!selection.empty) {
        from = selection.from;
        to = selection.to;
        textToProcess = view.state.sliceDoc(from, to);

      }
    }

    try {
      const output = await invoke<string>('execute_cli_command', { command: ext.command, input: textToProcess });

      if (view) {
        view.dispatch({
          changes: { from, to, insert: output }
        });
      }
    } catch (e) {
      console.error('Extension execution failed', e);
      alert('Error: ' + e);
    }
    setShowExtMenu(false);
  };

  const handleEncodingChange = async (enc: string) => {
    if (!activeTab) return;
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
    <div className={`flex flex-col h-screen ${theme === 'dark' ? 'bg-[#282c34] text-white' : 'bg-white text-black'} font-sans`}>
      {/* Header / Toolbar */}
      <div className={`flex items-center justify-between px-4 py-2 ${theme === 'dark' ? 'bg-[#21252b] border-[#181a1f]' : 'bg-gray-100 border-gray-300'} border-b shadow-sm`}>
        <div className="flex space-x-2">
          <button
            onClick={handleNewFile}
            className={`flex items-center px-3 py-1.5 text-sm rounded ${theme === 'dark' ? 'hover:bg-[#3a3f4b]' : 'hover:bg-gray-200'} transition-colors`}
            title="New File"
          >
            <Plus size={16} className="mr-1.5" /> New
          </button>
          <button
            onClick={handleOpenFile}
            className={`flex items-center px-3 py-1.5 text-sm rounded ${theme === 'dark' ? 'hover:bg-[#3a3f4b]' : 'hover:bg-gray-200'} transition-colors`}
            title="Open File"
          >
            <FileUp size={16} className="mr-1.5" /> Open
          </button>

          <div className="relative">
            <button
              onClick={() => setShowExtMenu(!showExtMenu)}
              className={`flex items-center px-3 py-1.5 text-sm rounded ${theme === 'dark' ? 'hover:bg-[#3a3f4b]' : 'hover:bg-gray-200'} transition-colors`}
              title="Extensions"
            >
              Tools
            </button>
            {showExtMenu && (
              <div className={`absolute top-full left-0 mt-1 ${theme === 'dark' ? 'bg-[#282c34] border-[#181a1f]' : 'bg-white border-gray-200'} border shadow-lg rounded py-1 min-w-[150px] z-50`}>
                {extensions.length === 0 && (
                   <div className={`px-3 py-1.5 text-sm ${theme === 'dark' ? 'text-gray-500' : 'text-gray-400'}`}>No extensions</div>
                )}
                {extensions.map(ext => (
                  <div
                    key={ext.id}
                    className={`px-3 py-1.5 cursor-pointer text-sm ${theme === 'dark' ? 'hover:bg-[#3e4451] text-gray-300 hover:text-white' : 'hover:bg-gray-100 text-gray-700 hover:text-black'}`}
                    onClick={() => handleExecuteExtension(ext)}
                  >
                    {ext.name}
                  </div>
                ))}
              </div>
            )}
          </div>

          <button
            onClick={handleSaveFile}
            className={`flex items-center px-3 py-1.5 text-sm rounded ${theme === 'dark' ? 'hover:bg-[#3a3f4b]' : 'hover:bg-gray-200'} transition-colors`}
            title="Save File"
          >
            <FileDown size={16} className="mr-1.5" /> Save {activeTab?.isDirty && '*'}
          </button>
          <button
            onClick={() => {
              setIsSplitMode(!isSplitMode);
              if (!isSplitMode) {
                // Moving to split mode, ensure we have a right tab
                if (rightTabs.length === 0 && leftTabs.length > 0) {
                  const newId = Date.now().toString();
                  setTabs(tabs => [...tabs, { ...leftTabs[0], id: newId, pane: 'right' }]);
                  setActiveTabIdRight(newId);
                }
                setActivePane('right');
              } else {
                // Moving to single mode, move all right tabs to left
                setTabs(tabs => tabs.map(t => ({ ...t, pane: 'left' })));
                setActiveTabIdRight(null);
                setActivePane('left');
              }
            }}
            className={`flex items-center px-3 py-1.5 text-sm rounded ${isSplitMode ? (theme === 'dark' ? 'bg-[#3a3f4b]' : 'bg-gray-200') : (theme === 'dark' ? 'hover:bg-[#3a3f4b]' : 'hover:bg-gray-200')} transition-colors`}
            title="Split View"
          >
            <span className="font-bold flex gap-0.5">
              <div className="w-1.5 h-4 border border-current rounded-sm"></div>
              <div className="w-1.5 h-4 border border-current rounded-sm"></div>
            </span>
            <span className="ml-1.5">Split</span>
          </button>
        </div>
        <div className="flex items-center space-x-4">
          <button
            onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
            className={`p-1.5 rounded ${theme === 'dark' ? 'hover:bg-[#3a3f4b] text-gray-400 hover:text-white' : 'hover:bg-gray-200 text-gray-600 hover:text-black'} transition-colors`}
            title="Toggle Theme"
          >
            {theme === 'dark' ? <Sun size={16} /> : <Moon size={16} />}
          </button>
          <div className={`text-xs ${theme === 'dark' ? 'text-gray-400' : 'text-gray-500'} font-semibold tracking-wider`}>NOTEPADN</div>
        </div>
      </div>

      {/* Main Panes Area */}
      <div className="flex-1 flex overflow-hidden">
        {/* Left Pane */}
        <div className={`flex flex-col flex-1 overflow-hidden ${isSplitMode && activePane === 'left' ? (theme === 'dark' ? 'ring-1 ring-inset ring-[#4d78cc] z-10' : 'ring-1 ring-inset ring-blue-500 z-10') : ''}`} onClick={() => setActivePane('left')}>
          {/* Tabs Left */}
          <div className={`flex ${theme === 'dark' ? 'bg-[#1e2227]' : 'bg-gray-200'} overflow-x-auto custom-scrollbar`}>
            {leftTabs.map((tab) => (
              <div
                key={tab.id}
                onClick={() => { setActiveTabIdLeft(tab.id); setActivePane('left'); }}
                draggable={true}
                onDragStart={(e) => handleDragStart(e, tab.id)}
                onDrop={(e) => handleDrop(e, tab.id, 'left')}
                onDragOver={(e) => handleDragOver(e, tab.id)}
                onDragEnter={handleDragEnter}
                onDragLeave={handleDragLeave}
                className={`relative flex items-center min-w-max px-4 py-2 cursor-pointer border-r ${theme === 'dark' ? 'border-[#181a1f]' : 'border-gray-300'} text-sm select-none transition-colors ${
                  activeTabIdLeft === tab.id
                    ? (theme === 'dark' ? 'bg-[#282c34] text-white border-t-2 border-t-[#4d78cc]' : 'bg-white text-black border-t-2 border-t-blue-500')
                    : (theme === 'dark' ? 'bg-[#21252b] text-gray-400 hover:bg-[#2c313a]' : 'bg-gray-100 text-gray-600 hover:bg-gray-50')
                }`}
              >
                {dragOverTabId === tab.id && (
                  <div
                    className={`absolute top-0 bottom-0 w-[2px] ${theme === 'dark' ? 'bg-[#4d78cc]' : 'bg-blue-500'} z-50`}
                    style={{
                      left: dragPosition === 'left' ? 0 : 'auto',
                      right: dragPosition === 'right' ? 0 : 'auto'
                    }}
                  />
                )}
                <span className="mr-2">{tab.title}{tab.isDirty ? ' *' : ''}</span>
                <button
                  onClick={(e) => closeTab(tab.id, e)}
                  className={`p-0.5 rounded-md ${theme === 'dark' ? 'hover:bg-[#3e4451] text-gray-400 hover:text-white' : 'hover:bg-gray-300 text-gray-500 hover:text-black'} transition-colors`}
                >
                  <X size={14} />
                </button>
              </div>
            ))}
            {/* Empty space drop target for left pane */}
            <div className="flex-1" onDrop={(e) => handleDropEmpty(e, 'left')} onDragOver={(e) => { e.preventDefault(); e.dataTransfer.dropEffect = 'move'; }} />
          </div>

          {/* Editor Left */}
          <div className="flex-1 overflow-hidden relative">
            {activeTabLeft && (
              <CodeMirror
                ref={editorRefLeft}
                value={activeTabLeft.content}
                height="100%"
                theme={theme === 'dark' ? oneDark : githubLight}
                extensions={extensionsLeft}
                onChange={(value) => {
                  setTabs((currentTabs) => currentTabs.map((t) => t.id === activeTabLeft.id ? { ...t, content: value, isDirty: true } : t));
                }}
                className="h-full"
                style={{ fontSize: `${fontSize}px` }}
              />
            )}
          </div>
        </div>

        {/* Right Pane */}
        {isSplitMode && (
          <div className={`flex flex-col flex-1 overflow-hidden border-l ${theme === 'dark' ? 'border-[#181a1f]' : 'border-gray-300'} ${isSplitMode && activePane === 'right' ? (theme === 'dark' ? 'ring-1 ring-inset ring-[#4d78cc] z-10' : 'ring-1 ring-inset ring-blue-500 z-10') : ''}`} onClick={() => setActivePane('right')}>
            {/* Tabs Right */}
            <div className={`flex ${theme === 'dark' ? 'bg-[#1e2227]' : 'bg-gray-200'} overflow-x-auto custom-scrollbar`}>
              {rightTabs.map((tab) => (
                <div
                  key={tab.id}
                  onClick={() => { setActiveTabIdRight(tab.id); setActivePane('right'); }}
                  draggable={true}
                  onDragStart={(e) => handleDragStart(e, tab.id)}
                  onDrop={(e) => handleDrop(e, tab.id, 'right')}
                  onDragOver={(e) => handleDragOver(e, tab.id)}
                  onDragEnter={handleDragEnter}
                  onDragLeave={handleDragLeave}
                  className={`relative flex items-center min-w-max px-4 py-2 cursor-pointer border-r ${theme === 'dark' ? 'border-[#181a1f]' : 'border-gray-300'} text-sm select-none transition-colors ${
                    activeTabIdRight === tab.id
                      ? (theme === 'dark' ? 'bg-[#282c34] text-white border-t-2 border-t-[#4d78cc]' : 'bg-white text-black border-t-2 border-t-blue-500')
                      : (theme === 'dark' ? 'bg-[#21252b] text-gray-400 hover:bg-[#2c313a]' : 'bg-gray-100 text-gray-600 hover:bg-gray-50')
                  }`}
                >
                  {dragOverTabId === tab.id && (
                    <div
                      className={`absolute top-0 bottom-0 w-[2px] ${theme === 'dark' ? 'bg-[#4d78cc]' : 'bg-blue-500'} z-50`}
                      style={{
                        left: dragPosition === 'left' ? 0 : 'auto',
                        right: dragPosition === 'right' ? 0 : 'auto'
                      }}
                    />
                  )}
                  <span className="mr-2">{tab.title}{tab.isDirty ? ' *' : ''}</span>
                  <button
                    onClick={(e) => closeTab(tab.id, e)}
                    className={`p-0.5 rounded-md ${theme === 'dark' ? 'hover:bg-[#3e4451] text-gray-400 hover:text-white' : 'hover:bg-gray-300 text-gray-500 hover:text-black'} transition-colors`}
                  >
                    <X size={14} />
                  </button>
                </div>
              ))}
              {/* Empty space drop target for right pane */}
              <div className="flex-1" onDrop={(e) => handleDropEmpty(e, 'right')} onDragOver={(e) => { e.preventDefault(); e.dataTransfer.dropEffect = 'move'; }} />
            </div>

            {/* Editor Right */}
            <div className="flex-1 overflow-hidden relative">
              {activeTabRight && (
                <CodeMirror
                  ref={editorRefRight}
                  value={activeTabRight.content}
                  height="100%"
                  theme={theme === 'dark' ? oneDark : githubLight}
                  extensions={extensionsRight}
                  onChange={(value) => {
                    setTabs((currentTabs) => currentTabs.map((t) => t.id === activeTabRight.id ? { ...t, content: value, isDirty: true } : t));
                  }}
                  className="h-full"
                  style={{ fontSize: `${fontSize}px` }}
                />
              )}
            </div>
          </div>
        )}
      </div>

      {/* Status Bar */}
      <div className={`flex items-center justify-between px-4 py-1 ${theme === 'dark' ? 'bg-[#21252b] text-gray-400 border-[#181a1f]' : 'bg-gray-100 text-gray-600 border-gray-300'} text-xs border-t`}>
        <div>
           {activeTab ? (activeTab.path || 'Unsaved File') : 'No File'}
        </div>
        {activeTab && (
          <div className="flex space-x-4 relative">
            <span
              className={`cursor-pointer ${theme === 'dark' ? 'hover:text-white' : 'hover:text-black'} transition-colors`}
              onClick={() => { setShowEncMenu(!showEncMenu); setShowLangMenu(false); }}
            >
              Encoding: {activeTab.encoding}
            </span>
            {showEncMenu && (
              <div className={`absolute bottom-full right-20 mb-1 ${theme === 'dark' ? 'bg-[#282c34] border-[#181a1f]' : 'bg-white border-gray-200'} border shadow-lg rounded py-1 w-32 z-50`}>
                {AVAILABLE_ENCODINGS.map(enc => (
                  <div
                    key={enc}
                    className={`px-3 py-1.5 cursor-pointer ${theme === 'dark' ? 'hover:bg-[#3e4451]' : 'hover:bg-gray-100'} ${activeTab.encoding === enc ? (theme === 'dark' ? 'text-white bg-[#2c313a]' : 'text-black bg-gray-50') : (theme === 'dark' ? 'text-gray-400' : 'text-gray-600')}`}
                    onClick={() => handleEncodingChange(enc)}
                  >
                    {enc}
                  </div>
                ))}
              </div>
            )}
            <span
              className={`cursor-pointer ${theme === 'dark' ? 'hover:text-white' : 'hover:text-black'} transition-colors`}
              onClick={() => { setShowLangMenu(!showLangMenu); setShowEncMenu(false); }}
            >
              Language: {activeTab.language}
            </span>
            {showLangMenu && (
              <div className={`absolute bottom-full right-0 mb-1 ${theme === 'dark' ? 'bg-[#282c34] border-[#181a1f]' : 'bg-white border-gray-200'} border shadow-lg rounded py-1 w-32 z-50`}>
                {AVAILABLE_LANGUAGES.map(lang => (
                  <div
                    key={lang}
                    className={`px-3 py-1.5 cursor-pointer ${theme === 'dark' ? 'hover:bg-[#3e4451]' : 'hover:bg-gray-100'} ${activeTab.language === lang ? (theme === 'dark' ? 'text-white bg-[#2c313a]' : 'text-black bg-gray-50') : (theme === 'dark' ? 'text-gray-400' : 'text-gray-600')}`}
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
        )}
      </div>
    </div>
  );
}

export default App;
