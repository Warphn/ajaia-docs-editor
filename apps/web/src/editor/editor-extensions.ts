import { Placeholder } from '@tiptap/extensions';
import StarterKit from '@tiptap/starter-kit';
import { MermaidDiagram } from './mermaid/mermaid-diagram-extension';

/**
 * Editor features. Keep in sync with the API's HTML sanitizer allowlist
 * (apps/api/src/lib/sanitize-html.ts): anything the editor produces must survive sanitization.
 */
export function createEditorExtensions() {
  return [
    StarterKit.configure({
      heading: { levels: [1, 2, 3] },
      link: { openOnClick: false, autolink: true },
    }),
    Placeholder.configure({ placeholder: 'Start writing…' }),
    MermaidDiagram,
  ];
}
