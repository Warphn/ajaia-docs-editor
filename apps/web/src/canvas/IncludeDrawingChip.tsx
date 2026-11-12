import { GripVertical, Undo2 } from 'lucide-react';

/** Custom drag type: the editor only accepts drops carrying it as "insert the canvas selection here". */
export const DRAWING_DRAG_TYPE = 'application/x-ajaia-drawing';

interface IncludeDrawingChipProps {
  /** Whether the selected drawing is already in the document (the chip then removes it). */
  isIncluded: boolean;
  onInclude: () => void;
  onRemove: () => void;
}

/**
 * Shown while drawings are selected in drawing mode. Click to include at the cursor (or remove if
 * already included), or drag onto the page to include where it is dropped.
 */
export function IncludeDrawingChip({ isIncluded, onInclude, onRemove }: IncludeDrawingChipProps) {
  return (
    <div className="print-hidden absolute bottom-20 left-1/2 z-5 -translate-x-1/2">
      {isIncluded ? (
        <button
          type="button"
          onClick={onRemove}
          className="flex items-center gap-2 rounded-full border border-line-strong bg-sheet px-4 py-2 text-sm font-medium text-ink shadow-lg hover:bg-canvas"
        >
          <Undo2 size={16} aria-hidden="true" />
          Remove from document
        </button>
      ) : (
        <button
          type="button"
          draggable
          onDragStart={(event) => {
            event.dataTransfer.setData(DRAWING_DRAG_TYPE, 'selection');
            // Some browsers only start a drag when a standard type is present too.
            event.dataTransfer.setData('text/plain', '');
            event.dataTransfer.effectAllowed = 'copy';
          }}
          onClick={onInclude}
          className="flex cursor-grab items-center gap-2 rounded-full bg-primary px-4 py-2 text-sm font-medium text-on-accent shadow-lg hover:bg-primary-hover active:cursor-grabbing"
        >
          <GripVertical size={16} aria-hidden="true" />
          Include in document
          <span className="text-xs font-normal text-on-accent/75">click, or drag the drawing onto the page</span>
        </button>
      )}
    </div>
  );
}
