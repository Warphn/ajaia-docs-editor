import { useQueryClient } from '@tanstack/react-query';
import { EditorContent, useEditor, type Editor } from '@tiptap/react';
import { ArrowLeft, FileDown, Share2 } from 'lucide-react';
import { lazy, Suspense, useEffect, useRef, useState } from 'react';
import { Link, useParams } from 'react-router';
import { ApiError } from '../api/client';
import type { DocumentDetail } from '../api/types';
import { AccessBadge } from '../components/AccessBadge';
import { AppHeader } from '../components/AppHeader';
import { Button } from '../components/Button';
import { FullPageMessage } from '../components/FullPageMessage';
import { SaveStatusIndicator } from '../components/SaveStatusIndicator';
import { ShareDialog } from '../components/ShareDialog';
import { createEditorExtensions } from '../editor/editor-extensions';
import { EditorToolbar } from '../editor/EditorToolbar';
import { useDocumentAutosave } from '../hooks/use-document-autosave';
import type { DropPoint } from '../canvas/CanvasWorkspace';
import { DRAWING_DRAG_TYPE } from '../canvas/IncludeDrawingChip';
import { collectDrawingIds, insertDrawingImage, removeDrawingImages } from '../editor/drawing-images';
import { PAGE_CONTENT_HEIGHT_MM, PAGE_FORMAT_MM } from '../editor/page-format';
import { PageBreakGuides, usePageCount } from '../editor/PageBreakGuides';
import { documentKeys, useCanvas, useDocument } from '../hooks/use-documents';
import { useMediaQuery } from '../hooks/use-media-query';

// Excalidraw is large; it loads only when a document opens on a screen wide enough for the canvas.
const CanvasWorkspace = lazy(() =>
  import('../canvas/CanvasWorkspace').then((module) => ({ default: module.CanvasWorkspace })),
);

export function EditorPage() {
  const { documentId = '' } = useParams();
  const documentQuery = useDocument(documentId);
  // Bumped to remount the workspace with fresh data after a save conflict.
  const [loadCount, setLoadCount] = useState(0);

  if (documentQuery.isPending) {
    return <FullPageMessage title="Opening document…" />;
  }
  if (documentQuery.isError) {
    const isNotFound = documentQuery.error instanceof ApiError && documentQuery.error.status === 404;
    return (
      <FullPageMessage
        title={isNotFound ? 'Document not available' : 'Could not open this document'}
        description={
          isNotFound
            ? 'It may have been deleted, or the owner has not shared it with you.'
            : documentQuery.error.message
        }
        action={{ label: 'Back to documents', onClick: () => window.location.assign('/documents') }}
      />
    );
  }

  async function reloadLatestVersion() {
    await documentQuery.refetch();
    setLoadCount((count) => count + 1);
  }

  return (
    <DocumentWorkspace
      key={`${documentId}:${loadCount}`}
      document={documentQuery.data}
      onReloadRequested={() => void reloadLatestVersion()}
    />
  );
}

interface DocumentWorkspaceProps {
  document: DocumentDetail;
  onReloadRequested: () => void;
}

/** The canvas needs room for drawings around the page; small screens keep the classic layout. */
const CANVAS_MEDIA_QUERY = '(min-width: 768px)';

function DocumentWorkspace({ document, onReloadRequested }: DocumentWorkspaceProps) {
  const queryClient = useQueryClient();
  const canEdit = document.access !== 'viewer';
  const [title, setTitle] = useState(document.title);
  const [isShareDialogOpen, setIsShareDialogOpen] = useState(false);
  const lastSavedTitleRef = useRef(document.title);
  const isCanvasLayout = useMediaQuery(CANVAS_MEDIA_QUERY);
  const canvasQuery = useCanvas(document.id, { enabled: isCanvasLayout });
  const includeSelectionRef = useRef<((dropPoint?: DropPoint) => Promise<void>) | null>(null);
  const revealScreenRectRef = useRef<((rect: { top: number; bottom: number }) => void) | null>(null);
  const editorRef = useRef<Editor | null>(null);
  const [includedDrawingIds, setIncludedDrawingIds] = useState<ReadonlySet<string>>(
    () => new Set(drawingIdsInHtml(document.contentHtml)),
  );

  const autosave = useDocumentAutosave({
    documentId: document.id,
    initialVersion: document.version,
    onSaved: (savedDocument) => {
      lastSavedTitleRef.current = savedDocument.title;
      // Keep the cached copy current so reopening the document shows the latest content.
      queryClient.setQueryData(documentKeys.detail(document.id), savedDocument);
    },
  });

  const editor = useEditor({
    extensions: createEditorExtensions(),
    content: document.contentHtml,
    editable: canEdit,
    editorProps: {
      attributes: {
        class: 'document-content min-h-[60vh]',
        'aria-label': 'Document content',
      },
      // On the canvas, keep the cursor visible by panning the canvas instead of scrolling elements.
      handleScrollToSelection: (view) => {
        if (!revealScreenRectRef.current) {
          return false;
        }
        revealScreenRectRef.current(view.coordsAtPos(view.state.selection.head));
        return true;
      },
      // Dropping the "Include in document" chip inserts the canvas selection where it lands.
      handleDrop: (_view, event) => {
        if (!event.dataTransfer?.types.includes(DRAWING_DRAG_TYPE)) {
          return false;
        }
        event.preventDefault();
        void includeSelectionRef.current?.({ clientX: event.clientX, clientY: event.clientY });
        return true;
      },
    },
    onUpdate: ({ editor: updatedEditor }) => {
      autosave.queueChange({ contentHtml: updatedEditor.getHTML() });
      // Keep the canvas' "Include / Remove" toggle in sync, also when an image is deleted by hand.
      const currentDrawingIds = collectDrawingIds(updatedEditor.state.doc);
      setIncludedDrawingIds((previousIds) =>
        sameIds(previousIds, currentDrawingIds) ? previousIds : new Set(currentDrawingIds),
      );
    },
  });
  editorRef.current = editor;

  // The list shows titles and "edited" times, so refresh it after leaving the editor.
  useEffect(() => () => void queryClient.invalidateQueries({ queryKey: documentKeys.list }), [queryClient]);

  // Ctrl/Cmd+S saves immediately instead of opening the browser's "save page" dialog.
  const { saveNow } = autosave;
  useEffect(() => {
    function saveOnShortcut(event: KeyboardEvent) {
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 's') {
        event.preventDefault();
        void saveNow();
      }
    }
    window.addEventListener('keydown', saveOnShortcut);
    return () => window.removeEventListener('keydown', saveOnShortcut);
  }, [saveNow]);

  function handleTitleChange(newTitle: string) {
    setTitle(newTitle);
    if (newTitle.trim()) {
      autosave.queueChange({ title: newTitle.trim() });
    }
  }

  const pageCount = usePageCount(isCanvasLayout ? editor : null);

  function printPage() {
    printDocument(title.trim() || lastSavedTitleRef.current);
  }

  const viewOnlyNotice = !canEdit && (
    <p className="print-hidden mb-3 rounded-md bg-sheet px-3 py-2 text-sm text-ink-muted shadow-sm">
      You have view-only access. Ask {document.owner.name} for edit access.
    </p>
  );

  // Canvas layout: an exact A4 sheet with page-break guides. Small screens: a fluid sheet.
  const pageSheet = isCanvasLayout ? (
    <>
      {viewOnlyNotice}
      <article
        className="print-page document-sheet rounded-sm border border-line bg-sheet shadow-[0_1px_3px_rgba(27,34,48,0.08)]"
        style={{ minHeight: `${2 * PAGE_FORMAT_MM.margin + pageCount * PAGE_CONTENT_HEIGHT_MM}mm` }}
      >
        <EditorContent editor={editor} />
        <PageBreakGuides pageCount={pageCount} />
      </article>
    </>
  ) : (
    <div className="mx-auto max-w-204">
      {viewOnlyNotice}
      <article className="print-page rounded-sm border border-line bg-sheet px-6 py-10 shadow-[0_1px_3px_rgba(27,34,48,0.08)] sm:px-16 sm:py-14">
        <EditorContent editor={editor} />
      </article>
    </div>
  );

  return (
    <div className={'print-root canvas-grid flex flex-col ' + (isCanvasLayout ? 'h-screen overflow-clip' : 'min-h-screen')}>
      <AppHeader>
        <Link
          to="/documents"
          aria-label="Back to documents"
          className="hidden rounded-md p-1.5 text-ink-muted hover:bg-canvas hover:text-ink sm:inline-flex"
        >
          <ArrowLeft size={18} />
        </Link>
        <label className="sr-only" htmlFor="document-title">
          Document title
        </label>
        <input
          id="document-title"
          value={title}
          readOnly={!canEdit}
          maxLength={200}
          onChange={(event) => handleTitleChange(event.target.value)}
          // An empty title is never saved; restore the last saved one.
          onBlur={() => !title.trim() && setTitle(lastSavedTitleRef.current)}
          className="h-9 min-w-0 flex-1 truncate rounded-md border border-transparent px-2 text-base font-medium hover:border-line focus:border-primary read-only:hover:border-transparent"
        />
        {canEdit && <SaveStatusIndicator status={autosave.status} />}
        {document.access !== 'owner' && <AccessBadge access={document.access} />}
        {!isCanvasLayout && (
          <Button variant="ghost" onClick={printPage} aria-label="Export PDF" title="Print or save as PDF">
            <FileDown size={16} aria-hidden="true" />
          </Button>
        )}
        <Button variant={document.access === 'owner' ? 'primary' : 'secondary'} onClick={() => setIsShareDialogOpen(true)}>
          <Share2 size={16} aria-hidden="true" />
          <span className="hidden sm:inline">Share</span>
        </Button>
      </AppHeader>

      {canEdit && editor && <EditorToolbar editor={editor} />}

      {autosave.status === 'conflict' && (
        <div role="alert" className="print-hidden flex flex-wrap items-center gap-3 border-b border-line bg-warning-soft px-4 py-2.5 text-sm text-warning sm:px-6">
          <span className="flex-1">
            Someone else saved a newer version of this document. Your latest edits were not saved; copy anything you
            want to keep, then reload.
          </span>
          <Button variant="secondary" onClick={onReloadRequested}>
            Reload document
          </Button>
        </div>
      )}
      {autosave.status === 'error' && autosave.errorMessage && (
        <div role="alert" className="print-hidden flex flex-wrap items-center gap-3 border-b border-line bg-danger-soft px-4 py-2.5 text-sm text-danger sm:px-6">
          <span className="flex-1">{autosave.errorMessage}</span>
          <Button variant="secondary" onClick={() => void autosave.saveNow()}>
            Retry save
          </Button>
        </div>
      )}

      {isCanvasLayout ? (
        canvasQuery.isSuccess ? (
          <Suspense fallback={<CanvasLoadingMessage />}>
            <CanvasWorkspace
              documentId={document.id}
              canEdit={canEdit}
              initialScene={canvasQuery.data.scene}
              page={pageSheet}
              includedDrawingIds={includedDrawingIds}
              includeSelectionRef={includeSelectionRef}
              revealScreenRectRef={revealScreenRectRef}
              onIncludeDrawing={(source, drawingId, dropPoint) =>
                editorRef.current && insertDrawingImage(editorRef.current, { source, drawingId }, dropPoint)
              }
              onRemoveDrawing={(drawingId) => editorRef.current && removeDrawingImages(editorRef.current, drawingId)}
              onPrint={printPage}
            />
          </Suspense>
        ) : (
          <CanvasLoadingMessage error={canvasQuery.error?.message} />
        )
      ) : (
        <main className="flex-1 px-3 py-6 sm:px-6 sm:py-10">{pageSheet}</main>
      )}

      <ShareDialog document={document} isOpen={isShareDialogOpen} onClose={() => setIsShareDialogOpen(false)} />
    </div>
  );
}

function CanvasLoadingMessage({ error }: { error?: string | undefined }) {
  return (
    <div role="status" className="flex flex-1 items-center justify-center text-sm text-ink-muted">
      {error ? `Could not load the canvas: ${error}` : 'Loading canvas…'}
    </div>
  );
}

function sameIds(previousIds: ReadonlySet<string>, currentIds: readonly string[]) {
  return previousIds.size === new Set(currentIds).size && currentIds.every((drawingId) => previousIds.has(drawingId));
}

/** Drawing ids in saved HTML, before the editor exists (data-drawing-id attributes). */
function drawingIdsInHtml(html: string): string[] {
  return [...html.matchAll(/data-drawing-id="([^"]+)"/g)].map((match) => match[1]!);
}

/** Uses the document title as the PDF file name, then restores the tab title. */
function printDocument(documentTitle: string) {
  const previousTitle = window.document.title;
  window.document.title = documentTitle;
  window.addEventListener('afterprint', () => (window.document.title = previousTitle), { once: true });
  window.print();
}
