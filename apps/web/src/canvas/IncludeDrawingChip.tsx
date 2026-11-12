import { GripVertical } from 'lucide-react';

/** Custom drag type: the editor only accepts drops carrying it as "insert the canvas selection here". */
export const DRAWING_DRAG_TYPE = 'application/x-ajaia-drawing';

/**
 * Shown while something is selected on the canvas. Click to insert at the cursor,
 * or drag it onto the page to insert where it is dropped.
 */
export function IncludeDrawingChip({ onInclude }: { onInclude: () => void }) {
  return (
    <div className="print-hidden absolute bottom-4 left-1/2 z-5 -translate-x-1/2">
      <button
        type="button"
        draggable
        onDragStart={(event) => {
          event.dataTransfer.setData(DRAWING_DRAG_TYPE, 'selection');
          event.dataTransfer.effectAllowed = 'copy';
        }}
        onClick={onInclude}
        className="flex cursor-grab items-center gap-2 rounded-full bg-primary px-4 py-2 text-sm font-medium text-white shadow-lg hover:bg-primary-hover active:cursor-grabbing"
      >
        <GripVertical size={16} aria-hidden="true" />
        Include in document
        <span className="text-xs font-normal text-white/75">click or drag onto the page</span>
      </button>
    </div>
  );
}
