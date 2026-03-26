const fs = require('fs');
let content = fs.readFileSync('src/App.tsx', 'utf8');

if (!content.includes('load_extensions')) {
    // Add extension interfaces
    content = content.replace(
        "interface Tab {",
        "interface Extension {\n  id: string;\n  name: string;\n  command: string;\n}\n\ninterface Tab {"
    );

    // Add extensions state
    content = content.replace(
        "const [showEncMenu, setShowEncMenu] = useState(false);",
        "const [showEncMenu, setShowEncMenu] = useState(false);\n  const [extensions, setExtensions] = useState<Extension[]>([]);\n  const [showExtMenu, setShowExtMenu] = useState(false);"
    );

    // Load extensions on mount
    content = content.replace(
        "useEffect(() => {\n    localStorage.setItem('notepadn_tabs', JSON.stringify(tabs));",
        "useEffect(() => {\n    invoke<Extension[]>('load_extensions').then(setExtensions).catch(console.error);\n  }, []);\n\n  useEffect(() => {\n    localStorage.setItem('notepadn_tabs', JSON.stringify(tabs));"
    );

    // Add handleExecuteExtension
    const executeExtFn = `
  const handleExecuteExtension = async (ext: Extension) => {
    if (!activeTab) return;

    // get selected text if any
    let textToProcess = activeTab.content;
    let isSelection = false;
    let from = 0;
    let to = textToProcess.length;

    const view = activePane === 'left' ? editorRefLeft.current?.view : editorRefRight.current?.view;
    if (view) {
      const selection = view.state.selection.main;
      if (!selection.empty) {
        from = selection.from;
        to = selection.to;
        textToProcess = view.state.sliceDoc(from, to);
        isSelection = true;
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
`;
    content = content.replace("const handleEncodingChange = async (enc: string) => {", executeExtFn + "\n  const handleEncodingChange = async (enc: string) => {");

    // Add Extension menu in Header
    const extMenuHTML = `
          <div className="relative">
            <button
              onClick={() => setShowExtMenu(!showExtMenu)}
              className={\`flex items-center px-3 py-1.5 text-sm rounded \${theme === 'dark' ? 'hover:bg-[#3a3f4b]' : 'hover:bg-gray-200'} transition-colors\`}
              title="Extensions"
            >
              Tools
            </button>
            {showExtMenu && (
              <div className={\`absolute top-full left-0 mt-1 \${theme === 'dark' ? 'bg-[#282c34] border-[#181a1f]' : 'bg-white border-gray-200'} border shadow-lg rounded py-1 min-w-[150px] z-50\`}>
                {extensions.length === 0 && (
                   <div className={\`px-3 py-1.5 text-sm \${theme === 'dark' ? 'text-gray-500' : 'text-gray-400'}\`}>No extensions</div>
                )}
                {extensions.map(ext => (
                  <div
                    key={ext.id}
                    className={\`px-3 py-1.5 cursor-pointer text-sm \${theme === 'dark' ? 'hover:bg-[#3e4451] text-gray-300 hover:text-white' : 'hover:bg-gray-100 text-gray-700 hover:text-black'}\`}
                    onClick={() => handleExecuteExtension(ext)}
                  >
                    {ext.name}
                  </div>
                ))}
              </div>
            )}
          </div>
`;
    content = content.replace(
        '<button\n            onClick={handleSaveFile}',
        extMenuHTML + '\n          <button\n            onClick={handleSaveFile}'
    );

    fs.writeFileSync('src/App.tsx', content);
    console.log("App.tsx patched successfully");
} else {
    console.log("App.tsx already patched");
}
