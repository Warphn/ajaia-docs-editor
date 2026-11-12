import Image from '@tiptap/extension-image';
import { FontFamily, TextStyle } from '@tiptap/extension-text-style';
import { Placeholder } from '@tiptap/extensions';
import StarterKit from '@tiptap/starter-kit';
import { MermaidDiagram } from './mermaid/mermaid-diagram-extension';

/**
 * Image node that remembers which canvas drawing it came from (data-drawing-id),
 * so the canvas can offer "Remove from document" for drawings already included.
 */
const DocumentImage = Image.extend({
  addAttributes() {
    return {
      ...this.parent?.(),
      drawingId: {
        default: null,
        parseHTML: (element) => element.getAttribute('data-drawing-id'),
        renderHTML: (attributes) => (attributes.drawingId ? { 'data-drawing-id': attributes.drawingId } : {}),
      },
    };
  },
});

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
    TextStyle,
    FontFamily,
    MermaidDiagram,
    // Drawings included from the canvas (SVG data URIs) and pictures from imported .docx files.
    DocumentImage.configure({ allowBase64: true, inline: false, HTMLAttributes: { class: 'document-image' } }),
  ];
}
