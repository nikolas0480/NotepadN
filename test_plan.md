1. **Auto-restore tabs on startup**:
   - Update `App.tsx` state to read `tabs`, `activeTabId`, and `fontSize` from `localStorage` on initial load.
   - Use `useEffect` to save these states to `localStorage` whenever they change.
   - Update the `Tab` interface to include an `encoding` property (defaulting to 'UTF-8').

2. **Font size change**:
   - Add a `fontSize` state defaulting to 14.
   - Add a `useEffect` attaching a `wheel` listener to handle `Ctrl + Scroll` for changing font size.
   - Add a `keydown` listener for `Ctrl + =`, `Ctrl + -`, and `Ctrl + 0` to adjust font size.
   - Apply `fontSize` style to the `CodeMirror` element.

3. **Drag and Drop Tabs**:
   - Add `draggable={true}`, `onDragStart`, `onDragOver`, and `onDrop` to the tab items in `App.tsx`.
   - Implement handlers to reorder the `tabs` array when a tab is dropped on another tab.

4. **File Encoding display and changing**:
   - Modify `src-tauri/src/lib.rs` commands (`open_file`, `save_file`) to accept an optional encoding parameter.
   - Use `encoding_rs` to decode bytes. If no encoding is specified and UTF-8 has errors, fallback to `windows-1251` (useful for Russian text).
   - In `App.tsx`, display the encoding in the status bar. Make it clickable to show a popup menu to select between encodings ('UTF-8', 'windows-1251', 'UTF-16LE', etc.).
   - If changed on an unsaved file, it updates the `Tab` state. If changed on a saved unmodified file, it re-reads the file from disk with the new encoding.

5. **Automatic Language Detection**:
   - Create `getLanguageFromPath(path)` in `App.tsx` to detect 'javascript' (`.js`, `.ts`, etc.), 'rust' (`.rs`), or fallback to 'text'.
   - Update the status bar language display to be clickable, opening a menu to force-change the language.
   - Only support languages mapped in `highlighter.rs` ('javascript', 'rust', and fallback 'text').

6. **Complete pre commit steps**:
   - Complete pre commit steps to make sure proper testing, verifications, reviews and reflections are done.

7. **Submit**:
   - Commit and submit changes.
