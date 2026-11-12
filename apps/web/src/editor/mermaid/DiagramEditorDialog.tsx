import { useState } from 'react';
import { Button } from '../../components/Button';
import { Dialog } from '../../components/Dialog';
import { DIAGRAM_EXAMPLES } from './diagram-examples';
import { DiagramPreview } from './DiagramPreview';
import { useMermaidSvg } from './use-mermaid-svg';

const PREVIEW_DEBOUNCE_MS = 300;

interface DiagramEditorDialogProps {
  initialSource: string;
  onSave: (source: string) => void;
  onClose: () => void;
}

/** Side-by-side Mermaid source and live preview. Mounted only while open, so it starts from the saved source. */
export function DiagramEditorDialog({ initialSource, onSave, onClose }: DiagramEditorDialogProps) {
  const [source, setSource] = useState(initialSource);
  const preview = useMermaidSvg(source, PREVIEW_DEBOUNCE_MS);

  return (
    <Dialog
      isOpen
      onClose={onClose}
      size="wide"
      title="Edit diagram"
      description="Write Mermaid syntax on the left; the preview updates as you type."
    >
      <div className="flex flex-wrap items-center gap-2 text-sm">
        <span className="text-ink-muted">Start from an example:</span>
        {DIAGRAM_EXAMPLES.map((example) => (
          <button
            key={example.label}
            type="button"
            onClick={() => setSource(example.source)}
            className="rounded-md border border-line px-2 py-1 text-xs font-medium hover:bg-canvas"
          >
            {example.label}
          </button>
        ))}
        <a
          href="https://mermaid.js.org/intro/"
          target="_blank"
          rel="noreferrer"
          className="ml-auto text-xs text-primary underline"
        >
          Mermaid syntax reference
        </a>
      </div>

      <div className="mt-3 grid gap-3 md:grid-cols-2">
        <label className="block">
          <span className="sr-only">Mermaid source</span>
          <textarea
            value={source}
            onChange={(event) => setSource(event.target.value)}
            spellCheck={false}
            autoFocus
            className="h-80 w-full resize-y rounded-md border border-line-strong bg-canvas/40 p-3 font-mono text-sm leading-relaxed focus:border-primary"
          />
        </label>
        <div className="flex h-80 items-center justify-center overflow-auto rounded-md border border-line p-3">
          <DiagramPreview svg={preview.svg} error={preview.error} isRendering={preview.isRendering} />
        </div>
      </div>

      <div className="mt-4 flex justify-end gap-2">
        <Button variant="secondary" onClick={onClose}>
          Cancel
        </Button>
        <Button onClick={() => onSave(source)} disabled={!source.trim()}>
          Save diagram
        </Button>
      </div>
    </Dialog>
  );
}
