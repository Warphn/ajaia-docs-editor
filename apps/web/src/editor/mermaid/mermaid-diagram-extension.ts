import { mergeAttributes, Node, ReactNodeViewRenderer } from '@tiptap/react';
import { DEFAULT_DIAGRAM_SOURCE } from './diagram-examples';
import { MermaidDiagramView } from './MermaidDiagramView';

declare module '@tiptap/core' {
  interface Commands<ReturnType> {
    mermaidDiagram: {
      insertMermaidDiagram: (source?: string) => ReturnType;
    };
  }
}

/**
 * A block holding Mermaid source code, rendered as a diagram.
 * Stored in HTML as <div data-type="mermaid" data-source="…"></div>: the source is the
 * single source of truth (diffable text), and the SVG is always re-rendered on display.
 * The API sanitizer allowlists exactly these two attributes on <div>.
 */
export const MermaidDiagram = Node.create({
  name: 'mermaidDiagram',
  group: 'block',
  atom: true,
  draggable: true,
  selectable: true,

  addAttributes() {
    return {
      source: {
        default: DEFAULT_DIAGRAM_SOURCE,
        parseHTML: (element) => element.getAttribute('data-source') ?? '',
        renderHTML: (attributes) => ({ 'data-source': attributes.source }),
      },
    };
  },

  parseHTML() {
    return [{ tag: 'div[data-type="mermaid"]' }];
  },

  renderHTML({ HTMLAttributes }) {
    return ['div', mergeAttributes(HTMLAttributes, { 'data-type': 'mermaid' })];
  },

  addNodeView() {
    return ReactNodeViewRenderer(MermaidDiagramView);
  },

  addCommands() {
    return {
      insertMermaidDiagram:
        (source = DEFAULT_DIAGRAM_SOURCE) =>
        ({ commands }) =>
          commands.insertContent({ type: this.name, attrs: { source } }),
    };
  },
});
