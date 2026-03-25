const fs = require('fs');

let code = fs.readFileSync('src/App.tsx', 'utf-8');

// 1. Add ToolCommand interface
const interfaceCode = `
interface ToolCommand {
  name: string;
  command: string;
}
`;
code = code.replace("interface Tab {", interfaceCode + "\ninterface Tab {");

// 2. Add Wrench to lucide-react
code = code.replace(
    "import { FileDown, FileUp, Plus, X, Moon, Sun } from 'lucide-react';",
    "import { FileDown, FileUp, Plus, X, Moon, Sun, Wrench } from 'lucide-react';"
);

// 3. Add state for commands and menu
const stateCode = `
  const [toolCommands, setToolCommands] = useState<ToolCommand[]>([]);
  const [showToolsMenu, setShowToolsMenu] = useState(false);
`;
code = code.replace("const [showEncMenu, setShowEncMenu] = useState(false);", "const [showEncMenu, setShowEncMenu] = useState(false);\n" + stateCode);

// 4. Add effect to load commands
const effectCode = `
  useEffect(() => {
    const loadCommands = async () => {
      try {
        const cmds = await invoke<ToolCommand[]>('get_commands_config');
        setToolCommands(cmds);
      } catch(e) {
        console.error("Failed to load commands", e);
      }
    };
    loadCommands();
  }, []);
`;
code = code.replace("useEffect(() => {\n    localStorage.setItem('notepadn_isSplitMode', isSplitMode.toString());\n  }, [isSplitMode]);", effectCode + "\n  useEffect(() => {\n    localStorage.setItem('notepadn_isSplitMode', isSplitMode.toString());\n  }, [isSplitMode]);");

// 5. Add Tools menu in header
const menuCode = `
          {/* Tools Menu */}
          <div className="relative z-50">
            <button
              onClick={() => { setShowToolsMenu(!showToolsMenu); setShowEncMenu(false); setShowLangMenu(false); }}
              className={\`flex items-center px-3 py-1.5 text-sm rounded \${theme === 'dark' ? 'hover:bg-[#3a3f4b]' : 'hover:bg-gray-200'} transition-colors\`}
              title="Tools"
            >
              <Wrench size={16} className="mr-1.5" /> Tools
            </button>
            {showToolsMenu && (
              <div className={\`absolute top-full left-0 mt-1 \${theme === 'dark' ? 'bg-[#282c34] border-[#181a1f]' : 'bg-white border-gray-200'} border shadow-lg rounded py-1 w-64\`}>
                {toolCommands.map((cmd, idx) => (
                  <div
                    key={idx}
                    className={\`px-4 py-2 text-sm cursor-pointer \${theme === 'dark' ? 'hover:bg-[#3e4451] text-white' : 'hover:bg-gray-100 text-black'}\`}
                    onClick={() => handleRunTool(cmd)}
                  >
                    {cmd.name}
                  </div>
                ))}
                {toolCommands.length > 0 && <div className={\`my-1 border-t \${theme === 'dark' ? 'border-[#181a1f]' : 'border-gray-200'}\`}></div>}
                <div
                  className={\`px-4 py-2 text-sm cursor-pointer \${theme === 'dark' ? 'hover:bg-[#3e4451] text-blue-400' : 'hover:bg-gray-100 text-blue-600'}\`}
                  onClick={handleEditCommands}
                >
                  Edit Commands (commands.json)
                </div>
              </div>
            )}
          </div>
`;

const targetMenu = `<button\n            onClick={() => {\n              setIsSplitMode(!isSplitMode);`;
code = code.replace(targetMenu, menuCode + "\n          " + targetMenu);

// 6. Add handlers
const handlersCode = `
  const handleEditCommands = async () => {
    setShowToolsMenu(false);
    try {
      const configPath = await invoke<string>('get_config_file_path');
      const content = await invoke<string>('open_file', { path: configPath, encoding: 'utf-8' });

      const existingTab = tabs.find(t => t.path === configPath);
      if (existingTab) {
         if (existingTab.pane === 'left') {
             setActivePane('left');
             setActiveTabIdLeft(existingTab.id);
         } else {
             setActivePane('right');
             setActiveTabIdRight(existingTab.id);
         }
         return;
      }

      const newTab: Tab = {
        id: Date.now().toString(),
        title: 'commands.json',
        content,
        isDirty: false,
        path: configPath,
        language: 'json',
        encoding: 'utf-8',
        pane: activePane
      };
      setTabs([...tabs, newTab]);
      if (activePane === 'left') setActiveTabIdLeft(newTab.id);
      else setActiveTabIdRight(newTab.id);
    } catch(e) {
      console.error(e);
      alert("Failed to open commands config file");
    }
  };

  const handleRunTool = async (cmd: ToolCommand) => {
    setShowToolsMenu(false);
    const activeTab = activePane === 'left' ? activeTabLeft : activeTabRight;
    if (!activeTab) return;

    try {
      const output = await invoke<string>('run_external_command', {
         command: cmd.command,
         input: activeTab.content
      });

      updateActiveTab({ content: output, isDirty: true });
    } catch(e: any) {
      console.error("Tool execution failed", e);
      alert("Command failed: " + e);
    }
  };
`;

const returnStatement = `return (\n    <div className={\`flex flex-col`;
code = code.replace(returnStatement, handlersCode + "\n  " + returnStatement);

fs.writeFileSync('src/App.tsx', code);
