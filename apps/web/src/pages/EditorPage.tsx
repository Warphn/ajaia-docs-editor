import { useQueryClient } from '@tanstack/react-query';
import { EditorContent, useEditor } from '@tiptap/react';
import { ArrowLeft, Share2 } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
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
import { documentKeys, useDocument } from '../hooks/use-documents';

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

function DocumentWorkspace({ document, onReloadRequested }: DocumentWorkspaceProps) {
  const queryClient = useQueryClient();
  const canEdit = document.access !== 'viewer';
  const [title, setTitle] = useState(document.title);
  const [isShareDialogOpen, setIsShareDialogOpen] = useState(false);
  const lastSavedTitleRef = useRef(document.title);

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
    },
    onUpdate: ({ editor: updatedEditor }) => autosave.queueChange({ contentHtml: updatedEditor.getHTML() }),
  });

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

  return (
    <div className="canvas-grid flex min-h-screen flex-col">
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
        <Button variant={document.access === 'owner' ? 'primary' : 'secondary'} onClick={() => setIsShareDialogOpen(true)}>
          <Share2 size={16} aria-hidden="true" />
          <span className="hidden sm:inline">Share</span>
        </Button>
      </AppHeader>

      {canEdit && editor && <EditorToolbar editor={editor} />}

      {autosave.status === 'conflict' && (
        <div role="alert" className="flex flex-wrap items-center gap-3 border-b border-line bg-warning-soft px-4 py-2.5 text-sm text-warning sm:px-6">
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
        <div role="alert" className="flex flex-wrap items-center gap-3 border-b border-line bg-danger-soft px-4 py-2.5 text-sm text-danger sm:px-6">
          <span className="flex-1">{autosave.errorMessage}</span>
          <Button variant="secondary" onClick={() => void autosave.saveNow()}>
            Retry save
          </Button>
        </div>
      )}

      <main className="flex-1 px-3 py-6 sm:px-6 sm:py-10">
        <article className="mx-auto max-w-204 rounded-sm border border-line bg-sheet px-6 py-10 shadow-[0_1px_3px_rgba(27,34,48,0.08)] sm:px-16 sm:py-14">
          {!canEdit && (
            <p className="mb-6 rounded-md bg-canvas px-3 py-2 text-sm text-ink-muted">
              You have view-only access. Ask {document.owner.name} for edit access.
            </p>
          )}
          <EditorContent editor={editor} />
        </article>
      </main>

      <ShareDialog document={document} isOpen={isShareDialogOpen} onClose={() => setIsShareDialogOpen(false)} />
    </div>
  );
}
