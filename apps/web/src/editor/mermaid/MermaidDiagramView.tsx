import { NodeViewWrapper, type NodeViewProps } from '@tiptap/react';
import { Pencil } from 'lucide-react';
import { useState } from 'react';
import { DiagramEditorDialog } from './DiagramEditorDialog';
import { DiagramPreview } from './DiagramPreview';
import { useMermaidSvg } from './use-mermaid-svg';

/** How a diagram appears inside the document: rendered SVG, plus an edit action for editors. */
export function MermaidDiagramView({ node, editor, updateAttributes, selected }: NodeViewProps) {
  const source = String(node.attrs.source ?? '');
  const diagram = useMermaidSvg(source);
  const [isEditing, setIsEditing] = useState(false);
  const canEdit = editor.isEditable;

  return (
    <NodeViewWrapper
      as="figure"
      contentEditable={false}
      data-drag-handle
      className={
        'group relative my-4 rounded-md border bg-sheet p-4 ' +
        (selected ? 'border-primary ring-2 ring-primary-soft' : 'border-line')
      }
      onDoubleClick={() => canEdit && setIsEditing(true)}
    >
      <div className="flex min-h-24 items-center justify-center overflow-x-auto">
        <DiagramPreview svg={diagram.svg} error={diagram.error} isRendering={diagram.isRendering} />
      </div>
      {canEdit && (
        <button
          type="button"
          onClick={() => setIsEditing(true)}
          className="print-hidden absolute right-2 top-2 inline-flex items-center gap-1.5 rounded-md border border-line bg-sheet px-2 py-1 text-xs font-medium text-ink-muted opacity-100 shadow-sm hover:text-ink sm:opacity-0 sm:group-hover:opacity-100 sm:focus:opacity-100"
        >
          <Pencil size={13} aria-hidden="true" />
          Edit diagram
        </button>
      )}
      {isEditing && (
        <DiagramEditorDialog
          initialSource={source}
          onClose={() => setIsEditing(false)}
          onSave={(newSource) => {
            updateAttributes({ source: newSource });
            setIsEditing(false);
          }}
        />
      )}
    </NodeViewWrapper>
  );
}
