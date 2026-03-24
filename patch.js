const fs = require('fs');
let code = fs.readFileSync('src/App.tsx', 'utf8');

code = code.replace(
  'const [showEncMenu, setShowEncMenu] = useState(false);',
  `const [showEncMenu, setShowEncMenu] = useState(false);\n  const [dragOverTabId, setDragOverTabId] = useState<string | null>(null);\n  const [dragPosition, setDragPosition] = useState<'left' | 'right' | null>(null);`
);

fs.writeFileSync('src/App.tsx', code);
