import { StateField, StateEffect, RangeSetBuilder } from '@codemirror/state';
import { Decoration, DecorationSet, EditorView } from '@codemirror/view';
import { invoke } from '@tauri-apps/api/core';

interface HighlightToken {
  start: number;
  end: number;
  token_type: string;
}

// A theme matching tree-sitter tokens to CSS classes
const highlightThemeDark = EditorView.theme({
  '.ts-keyword': { color: '#c678dd' },
  '.ts-function': { color: '#61afef' },
  '.ts-function-builtin': { color: '#56b6c2' },
  '.ts-type': { color: '#e5c07b' },
  '.ts-type-builtin': { color: '#e5c07b' },
  '.ts-string': { color: '#98c379' },
  '.ts-string-special': { color: '#98c379' },
  '.ts-number': { color: '#d19a66' },
  '.ts-boolean': { color: '#d19a66' },
  '.ts-comment': { color: '#5c6370', fontStyle: 'italic' },
  '.ts-variable': { color: '#e06c75' },
  '.ts-variable-builtin': { color: '#e06c75' },
  '.ts-variable-parameter': { color: '#d19a66' },
  '.ts-property': { color: '#e5c07b' },
  '.ts-operator': { color: '#56b6c2' },
  '.ts-punctuation': { color: '#abb2bf' },
  '.ts-punctuation-bracket': { color: '#abb2bf' },
  '.ts-punctuation-delimiter': { color: '#abb2bf' },
  '.ts-constant': { color: '#d19a66' },
  '.ts-tag': { color: '#e06c75' },
  '.ts-attribute': { color: '#d19a66' },
  '.ts-escape': { color: '#56b6c2' },
  '.ts-label': { color: '#c678dd' },
  '.ts-module': { color: '#61afef' },
});

const highlightThemeLight = EditorView.theme({
  '.ts-keyword': { color: '#d73a49' },
  '.ts-function': { color: '#6f42c1' },
  '.ts-function-builtin': { color: '#005cc5' },
  '.ts-type': { color: '#005cc5' },
  '.ts-type-builtin': { color: '#005cc5' },
  '.ts-string': { color: '#032f62' },
  '.ts-string-special': { color: '#032f62' },
  '.ts-number': { color: '#005cc5' },
  '.ts-boolean': { color: '#005cc5' },
  '.ts-comment': { color: '#6a737d', fontStyle: 'italic' },
  '.ts-variable': { color: '#e36209' },
  '.ts-variable-builtin': { color: '#e36209' },
  '.ts-variable-parameter': { color: '#e36209' },
  '.ts-property': { color: '#005cc5' },
  '.ts-operator': { color: '#d73a49' },
  '.ts-punctuation': { color: '#24292e' },
  '.ts-punctuation-bracket': { color: '#24292e' },
  '.ts-punctuation-delimiter': { color: '#24292e' },
  '.ts-constant': { color: '#005cc5' },
  '.ts-tag': { color: '#22863a' },
  '.ts-attribute': { color: '#6f42c1' },
  '.ts-escape': { color: '#005cc5' },
  '.ts-label': { color: '#d73a49' },
  '.ts-module': { color: '#6f42c1' },
});

const tokenTypeToClass = (type: string) => {
  return `ts-${type.replace(/\./g, '-')}`;
};

export const setHighlightsEffect = StateEffect.define<HighlightToken[]>();

export const treeSitterHighlighter = StateField.define<DecorationSet>({
  create() {
    return Decoration.none;
  },
  update(decorations, tr) {
    let next = decorations.map(tr.changes);
    for (let e of tr.effects) {
      if (e.is(setHighlightsEffect)) {
        const builder = new RangeSetBuilder<Decoration>();
        // Tree-sitter might return overlapping highlights. RangeSetBuilder requires sorted non-overlapping.
        // For simplicity, we filter out overlapping tokens here (or rely on tree-sitter to give us disjoint tokens).

        let lastEnd = 0;
        // Sort tokens by start pos, then by end pos
        const sortedTokens = [...e.value].sort((a, b) => {
          if (a.start === b.start) return b.end - a.end;
          return a.start - b.start;
        });

        const docLen = tr.state.doc.length;

        for (const token of sortedTokens) {
          if (token.start >= lastEnd && token.end <= docLen && token.start < token.end) {
             builder.add(token.start, token.end, Decoration.mark({ class: tokenTypeToClass(token.token_type) }));
             lastEnd = token.end;
          }
        }
        next = builder.finish();
      }
    }
    return next;
  },
  provide: (f) => EditorView.decorations.from(f),
});

let debounceTimer: ReturnType<typeof setTimeout> | null = null;

export const createTreeSitterExtension = (language: string, theme: 'dark' | 'light') => {
  if (language === 'text') {
    return [];
  }
  return [
    theme === 'dark' ? highlightThemeDark : highlightThemeLight,
    treeSitterHighlighter,
    EditorView.updateListener.of((update) => {
      if (update.docChanged) {
        if (debounceTimer) clearTimeout(debounceTimer);
        debounceTimer = setTimeout(async () => {
          try {
            const text = update.state.doc.toString();
            const blockTokens = await invoke<HighlightToken[]>('parse_highlights', { text, language: language === 'markdown' ? 'markdown_block' : language });
            const inlineTokens = language === 'markdown' ? await invoke<HighlightToken[]>('parse_highlights', { text, language }) : [];
            const tokens = [...blockTokens, ...inlineTokens];
            update.view.dispatch({
              effects: setHighlightsEffect.of(tokens),
            });
          } catch (err) {
            console.error('Failed to get highlights', err);
          }
        }, 200); // 200ms debounce
      }
    }),
  ];
};
