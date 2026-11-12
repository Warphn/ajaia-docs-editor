import { FilePlus2, Trash2 } from 'lucide-react';
import { Link, useNavigate, useSearchParams } from 'react-router';
import type { DocumentSummary } from '../api/types';
import { AccessBadge } from '../components/AccessBadge';
import { AppHeader } from '../components/AppHeader';
import { Avatar } from '../components/Avatar';
import { Button } from '../components/Button';
import {
  ImportFileButton,
  MAX_IMPORT_FILE_MEGABYTES,
  SUPPORTED_IMPORT_EXTENSIONS,
} from '../components/ImportFileButton';
import { useCreateDocument, useDeleteDocument, useDocumentList, useImportDocument } from '../hooks/use-documents';
import { formatRelativeTime } from '../lib/format-relative-time';

type DocumentTab = 'mine' | 'shared';

export function DocumentsPage() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const activeTab: DocumentTab = searchParams.get('tab') === 'shared' ? 'shared' : 'mine';

  const documentList = useDocumentList();
  const createDocument = useCreateDocument();
  const importDocument = useImportDocument();
  const deleteDocument = useDeleteDocument();

  const openDocument = (documentId: string) => navigate(`/documents/${documentId}`);
  const actionError = createDocument.error ?? importDocument.error ?? deleteDocument.error;

  const ownedDocuments = documentList.data?.owned ?? [];
  const sharedDocuments = documentList.data?.sharedWithMe ?? [];
  const visibleDocuments = activeTab === 'mine' ? ownedDocuments : sharedDocuments;

  function handleDelete(document: DocumentSummary) {
    if (window.confirm(`Delete "${document.title}"? People it is shared with will lose access too.`)) {
      deleteDocument.mutate(document.id);
    }
  }

  return (
    <div className="canvas-grid min-h-screen">
      <AppHeader />

      <main className="mx-auto max-w-4xl px-4 py-8 sm:px-6 sm:py-10">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight">Documents</h1>
            <p className="mt-1 text-sm text-ink-muted">
              Import {SUPPORTED_IMPORT_EXTENSIONS.join(', ')} files up to {MAX_IMPORT_FILE_MEGABYTES} MB.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <ImportFileButton
              disabled={importDocument.isPending}
              onFileSelected={(file) => importDocument.mutate(file, { onSuccess: (document) => openDocument(document.id) })}
            />
            <Button
              disabled={createDocument.isPending}
              onClick={() => createDocument.mutate({}, { onSuccess: (document) => openDocument(document.id) })}
            >
              <FilePlus2 size={16} aria-hidden="true" />
              New document
            </Button>
          </div>
        </div>

        {importDocument.isPending && (
          <p role="status" className="mt-4 text-sm text-ink-muted">
            Importing file…
          </p>
        )}
        {actionError && (
          <p role="alert" className="mt-4 rounded-md bg-danger-soft px-3 py-2 text-sm text-danger">
            {actionError.message}
          </p>
        )}

        <div role="tablist" aria-label="Document lists" className="mt-8 flex gap-1 border-b border-line">
          <TabButton
            isActive={activeTab === 'mine'}
            onSelect={() => setSearchParams({})}
            label="My documents"
            count={ownedDocuments.length}
          />
          <TabButton
            isActive={activeTab === 'shared'}
            onSelect={() => setSearchParams({ tab: 'shared' })}
            label="Shared with me"
            count={sharedDocuments.length}
          />
        </div>

        <section role="tabpanel" className="mt-4">
          {documentList.isPending && <p className="py-10 text-center text-sm text-ink-muted">Loading documents…</p>}
          {documentList.isError && (
            <div className="py-10 text-center text-sm">
              <p className="text-danger">{documentList.error.message}</p>
              <Button variant="secondary" className="mt-3" onClick={() => void documentList.refetch()}>
                Try again
              </Button>
            </div>
          )}
          {documentList.isSuccess && visibleDocuments.length === 0 && <EmptyState tab={activeTab} />}
          {visibleDocuments.length > 0 && (
            <ul className="divide-y divide-line overflow-hidden rounded-lg border border-line bg-sheet">
              {visibleDocuments.map((document) => (
                <DocumentRow
                  key={document.id}
                  document={document}
                  onDelete={document.access === 'owner' ? () => handleDelete(document) : undefined}
                />
              ))}
            </ul>
          )}
        </section>
      </main>
    </div>
  );
}

function TabButton(props: { isActive: boolean; onSelect: () => void; label: string; count: number }) {
  return (
    <button
      type="button"
      role="tab"
      aria-selected={props.isActive}
      onClick={props.onSelect}
      className={
        '-mb-px border-b-2 px-3 py-2 text-sm font-medium transition-colors ' +
        (props.isActive ? 'border-primary text-ink' : 'border-transparent text-ink-muted hover:text-ink')
      }
    >
      {props.label}
      <span className="ml-1.5 text-xs text-ink-faint">{props.count}</span>
    </button>
  );
}

function DocumentRow({ document, onDelete }: { document: DocumentSummary; onDelete?: (() => void) | undefined }) {
  const isShared = document.access !== 'owner';

  return (
    <li className="group flex items-center gap-3 px-4 py-3 hover:bg-canvas/60">
      <Link to={`/documents/${document.id}`} className="flex min-w-0 flex-1 items-center gap-3 rounded">
        <span className="min-w-0 flex-1">
          <span className="block truncate font-medium">{document.title}</span>
          <span className="mt-0.5 flex items-center gap-1.5 text-xs text-ink-muted">
            {isShared && (
              <>
                <Avatar name={document.owner.name} size="sm" />
                <span>Shared by {document.owner.name}</span>
                <span aria-hidden="true">•</span>
              </>
            )}
            <span>Edited {formatRelativeTime(document.updatedAt)}</span>
          </span>
        </span>
        {isShared && <AccessBadge access={document.access} />}
      </Link>
      {onDelete && (
        <button
          type="button"
          onClick={onDelete}
          aria-label={`Delete ${document.title}`}
          className="rounded p-1.5 text-ink-faint opacity-100 hover:bg-danger-soft hover:text-danger sm:opacity-0 sm:group-hover:opacity-100 sm:focus:opacity-100"
        >
          <Trash2 size={16} />
        </button>
      )}
    </li>
  );
}

function EmptyState({ tab }: { tab: DocumentTab }) {
  return (
    <div className="rounded-lg border border-dashed border-line-strong bg-sheet/70 px-6 py-12 text-center">
      {tab === 'mine' ? (
        <>
          <p className="font-medium">No documents yet</p>
          <p className="mt-1 text-sm text-ink-muted">Create a new document or import a file to get started.</p>
        </>
      ) : (
        <>
          <p className="font-medium">Nothing shared with you yet</p>
          <p className="mt-1 text-sm text-ink-muted">When a teammate shares a document with you, it shows up here.</p>
        </>
      )}
    </div>
  );
}
