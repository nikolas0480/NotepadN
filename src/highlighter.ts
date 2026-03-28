import { javascript } from '@codemirror/lang-javascript';
import { rust } from '@codemirror/lang-rust';
import { python } from '@codemirror/lang-python';
import { html } from '@codemirror/lang-html';
import { css } from '@codemirror/lang-css';
import { json } from '@codemirror/lang-json';
import { cpp } from '@codemirror/lang-cpp';
import { go } from '@codemirror/lang-go';
import { markdown } from '@codemirror/lang-markdown';

export const getLanguageExtension = (language: string) => {
  switch (language) {
    case 'javascript':
      return javascript();
    case 'rust':
      return rust();
    case 'python':
      return python();
    case 'html':
      return html();
    case 'css':
      return css();
    case 'json':
      return json();
    case 'c':
    case 'cpp':
      return cpp();
    case 'go':
      return go();
    case 'markdown':
      return markdown();
    default:
      return [];
  }
};
