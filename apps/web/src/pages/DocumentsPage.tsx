import { FilePlus2, LayoutTemplate, Plus, Trash2, User as UserIcon, UserPlus, Users } from 'lucide-react';
import { useState, type ComponentType } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router';
import type { DocumentSummary, Team } from '../api/types';
import { AccessBadge } from '../components/AccessBadge';
import { AppHeader } from '../components/AppHeader';
import { Avatar } from '../components/Avatar';
import { Button } from '../components/Button';
import {
  ImportFileButton,
  MAX_IMPORT_FILE_MEGABYTES,
  SUPPORTED_IMPORT_EXTENSIONS,
} from '../components/ImportFileButton';
import { CreateTeamDialog, TeamMembersDialog } from '../components/TeamDialogs';
import { TemplatePickerDialog } from '../components/TemplatePickerDialog';
import { useCreateDocument, useDeleteDocument, useDocumentList, useImportDocument } from '../hooks/use-documents';
import { useTeamDocuments, useTeams } from '../hooks/use-teams';
import { formatRelativeTime } from '../lib/format-relative-time';

type DocumentTab = 'mine' | 'shared';

export function DocumentsPage() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const activeTab: DocumentTab = searchParams.get('tab') === 'shared' ? 'shared' : 'mine';

  const teams = useTeams();
  const teamList = teams.data ?? [];
  // The selected workspace lives in the URL (?team=<id>), so it survives reloads and can be linked.
  const selectedTeam = teamList.find((team) => team.id === searchParams.get('team')) ?? null;
  const teamNamesById = new Map(teamList.map((team) => [team.id, team.name]));

  const [isTemplatePickerOpen, setIsTemplatePickerOpen] = useState(false);
  const [isCreateTeamOpen, setIsCreateTeamOpen] = useState(false);
  const [isMembersDialogOpen, setIsMembersDialogOpen] = useState(false);
  const documentList = useDocumentList();
  const teamDocuments = useTeamDocuments(selectedTeam?.id ?? null);
  const createDocument = useCreateDocument();
  const importDocument = useImportDocument();
  const deleteDocument = useDeleteDocument();

  const openDocument = (documentId: string) => navigate(`/documents/${documentId}`);
  const selectWorkspace = (team: Team | null) => setSearchParams(team ? { team: team.id } : {});
  // New, template and imported documents land in the selected team.
  const teamScope = selectedTeam ? { teamId: selectedTeam.id } : {};
  const actionError = createDocument.error ?? importDocument.error ?? deleteDocument.error;

  const ownedDocuments = documentList.data?.owned ?? [];
  const sharedDocuments = documentList.data?.sharedWithMe ?? [];
  const visibleQuery = selectedTeam ? teamDocuments : documentList;
  const visibleDocuments = selectedTeam
    ? (teamDocuments.data ?? [])
    : activeTab === 'mine'
      ? ownedDocuments
      : sharedDocuments;

  function handleDelete(document: DocumentSummary) {
    if (window.confirm(`Delete "${document.title}"? Everyone with access will lose it too.`)) {
      deleteDocument.mutate(document.id);
    }
  }

  return (
    <div className="canvas-grid min-h-screen">
      <AppHeader />

      <main className="mx-auto max-w-4xl px-4 py-8 sm:px-6 sm:py-10">
        <nav aria-label="Workspaces" className="mb-6 flex flex-wrap items-center gap-2">
          <WorkspaceButton
            icon={UserIcon}
            label="Personal"
            isActive={selectedTeam === null}
            onSelect={() => selectWorkspace(null)}
          />
          {teamList.map((team) => (
            <WorkspaceButton
              key={team.id}
              icon={Users}
              label={team.name}
              isActive={selectedTeam?.id === team.id}
              onSelect={() => selectWorkspace(team)}
            />
          ))}
          <button
            type="button"
            onClick={() => setIsCreateTeamOpen(true)}
            className="inline-flex h-8 items-center gap-1.5 rounded-full border border-dashed border-line-strong px-3 text-sm text-ink-muted hover:border-primary hover:text-primary"
          >
            <Plus size={14} aria-hidden="true" />
            New team
          </button>
        </nav>

        <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div className="min-w-0">
            <h1 className="truncate text-2xl font-semibold tracking-tight">{selectedTeam?.name ?? 'Documents'}</h1>
            <p className="mt-1 text-sm text-ink-muted">
              {selectedTeam && 'Everyone in this team can open and edit these documents. '}
              Import {SUPPORTED_IMPORT_EXTENSIONS.join(', ')} files up to {MAX_IMPORT_FILE_MEGABYTES} MB.
            </p>
            {selectedTeam && (
              <button
                type="button"
                onClick={() => setIsMembersDialogOpen(true)}
                className="mt-3 inline-flex items-center gap-2 rounded-md py-1 pr-2 text-sm text-ink-muted hover:text-ink"
              >
                <span className="flex -space-x-1.5">
                  {selectedTeam.members.slice(0, 5).map((member) => (
                    <Avatar key={member.id} name={member.name} size="sm" />
                  ))}
                </span>
                {selectedTeam.members.length} {selectedTeam.members.length === 1 ? 'member' : 'members'}
                <UserPlus size={15} aria-hidden="true" />
              </button>
            )}
          </div>
          <div className="flex flex-wrap gap-2 sm:shrink-0">
            <ImportFileButton
              disabled={importDocument.isPending}
              onFileSelected={(file) =>
                importDocument.mutate({ file, ...teamScope }, { onSuccess: (document) => openDocument(document.id) })
              }
            />
            <Button variant="secondary" onClick={() => setIsTemplatePickerOpen(true)}>
              <LayoutTemplate size={16} aria-hidden="true" />
              From template
            </Button>
            <Button
              disabled={createDocument.isPending}
              onClick={() => createDocument.mutate(teamScope, { onSuccess: (document) => openDocument(document.id) })}
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

        {selectedTeam ? (
          <h2 className="mt-8 border-b border-line pb-2 text-sm font-medium">
            Team documents
            <span className="ml-1.5 text-xs text-ink-faint">{visibleDocuments.length}</span>
          </h2>
        ) : (
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
        )}

        <section role={selectedTeam ? undefined : 'tabpanel'} className="mt-4">
          {visibleQuery.isPending && <p className="py-10 text-center text-sm text-ink-muted">Loading documents…</p>}
          {visibleQuery.isError && (
            <div className="py-10 text-center text-sm">
              <p className="text-danger">{visibleQuery.error.message}</p>
              <Button variant="secondary" className="mt-3" onClick={() => void visibleQuery.refetch()}>
                Try again
              </Button>
            </div>
          )}
          {visibleQuery.isSuccess && visibleDocuments.length === 0 && (
            <EmptyState view={selectedTeam ? 'team' : activeTab} />
          )}
          {visibleDocuments.length > 0 && (
            <ul className="divide-y divide-line overflow-hidden rounded-lg border border-line bg-sheet">
              {visibleDocuments.map((document) => (
                <DocumentRow
                  key={document.id}
                  document={document}
                  isTeamView={selectedTeam !== null}
                  // In the personal list, owned team documents are labelled with their team.
                  teamName={selectedTeam || !document.teamId ? undefined : teamNamesById.get(document.teamId)}
                  onDelete={document.access === 'owner' ? () => handleDelete(document) : undefined}
                />
              ))}
            </ul>
          )}
        </section>
      </main>

      <TemplatePickerDialog
        isOpen={isTemplatePickerOpen}
        onClose={() => setIsTemplatePickerOpen(false)}
        isCreating={createDocument.isPending}
        onPick={(templateId) =>
          createDocument.mutate({ templateId, ...teamScope }, { onSuccess: (document) => openDocument(document.id) })
        }
      />
      <CreateTeamDialog
        isOpen={isCreateTeamOpen}
        onClose={() => setIsCreateTeamOpen(false)}
        onCreated={(team) => {
          setIsCreateTeamOpen(false);
          selectWorkspace(team);
        }}
      />
      {selectedTeam && (
        <TeamMembersDialog
          team={selectedTeam}
          isOpen={isMembersDialogOpen}
          onClose={() => setIsMembersDialogOpen(false)}
        />
      )}
    </div>
  );
}

function WorkspaceButton(props: {
  icon: ComponentType<{ size?: number; 'aria-hidden'?: boolean }>;
  label: string;
  isActive: boolean;
  onSelect: () => void;
}) {
  const { icon: Icon, label, isActive, onSelect } = props;
  return (
    <button
      type="button"
      onClick={onSelect}
      aria-current={isActive ? 'page' : undefined}
      className={
        'inline-flex h-8 max-w-56 items-center gap-1.5 rounded-full px-3 text-sm font-medium transition-colors ' +
        (isActive ? 'bg-primary text-white' : 'border border-line bg-sheet text-ink-muted hover:text-ink')
      }
    >
      <Icon size={14} aria-hidden={true} />
      <span className="truncate">{label}</span>
    </button>
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

interface DocumentRowProps {
  document: DocumentSummary;
  isTeamView: boolean;
  teamName?: string | undefined;
  onDelete?: (() => void) | undefined;
}

function DocumentRow({ document, isTeamView, teamName, onDelete }: DocumentRowProps) {
  const isOwnedByOther = document.access !== 'owner';

  return (
    <li className="group flex items-center gap-3 px-4 py-3 hover:bg-canvas/60">
      <Link to={`/documents/${document.id}`} className="flex min-w-0 flex-1 items-center gap-3 rounded">
        <span className="min-w-0 flex-1">
          <span className="block truncate font-medium">{document.title}</span>
          <span className="mt-0.5 flex items-center gap-1.5 text-xs text-ink-muted">
            {isOwnedByOther && (
              <>
                <Avatar name={document.owner.name} size="sm" />
                <span>{isTeamView ? 'By' : 'Shared by'} {document.owner.name}</span>
                <span aria-hidden="true">•</span>
              </>
            )}
            <span>Edited {formatRelativeTime(document.updatedAt)}</span>
            {teamName && (
              <span className="inline-flex items-center gap-1 rounded-full bg-canvas px-2 py-0.5 text-ink-muted">
                <Users size={11} aria-hidden="true" />
                {teamName}
              </span>
            )}
          </span>
        </span>
        {isOwnedByOther && !isTeamView && <AccessBadge access={document.access} />}
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

function EmptyState({ view }: { view: DocumentTab | 'team' }) {
  const messages = {
    mine: { title: 'No documents yet', hint: 'Create a blank document, start from a template, or import a file.' },
    shared: {
      title: 'Nothing shared with you yet',
      hint: 'When a teammate shares a document with you, it shows up here.',
    },
    team: {
      title: 'No team documents yet',
      hint: 'Documents you create, import or start from a template here are editable by the whole team.',
    },
  } as const;
  return (
    <div className="rounded-lg border border-dashed border-line-strong bg-sheet/70 px-6 py-12 text-center">
      <p className="font-medium">{messages[view].title}</p>
      <p className="mt-1 text-sm text-ink-muted">{messages[view].hint}</p>
    </div>
  );
}
