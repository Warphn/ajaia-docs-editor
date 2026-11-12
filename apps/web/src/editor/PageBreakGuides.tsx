import type { Editor } from '@tiptap/react';
import { useEffect, useState } from 'react';
import { countPages, PAGE_CONTENT_HEIGHT_MM, PAGE_FORMAT_MM } from './page-format';

/** Tracks how many A4 pages the document content fills, updating as the user types. */
export function usePageCount(editor: Editor | null): number {
  const [pageCount, setPageCount] = useState(1);

  useEffect(() => {
    const contentElement = editor?.view.dom;
    if (!contentElement) {
      return;
    }
    const observer = new ResizeObserver(() => setPageCount(countPages(contentElement.scrollHeight)));
    observer.observe(contentElement);
    return () => observer.disconnect();
  }, [editor]);

  return pageCount;
}

/**
 * Dashed lines where the exported PDF will start a new page, so nobody splits content by accident.
 * Positioned inside the sheet (which has the same margins as the printed page).
 */
export function PageBreakGuides({ pageCount }: { pageCount: number }) {
  return (
    <>
      {Array.from({ length: pageCount - 1 }, (_, breakIndex) => {
        const pageNumber = breakIndex + 2;
        return (
          <div
            key={pageNumber}
            aria-hidden="true"
            className="print-hidden page-break-guide"
            style={{ top: `${PAGE_FORMAT_MM.margin + (breakIndex + 1) * PAGE_CONTENT_HEIGHT_MM}mm` }}
          >
            <span>Page {pageNumber}</span>
          </div>
        );
      })}
    </>
  );
}
