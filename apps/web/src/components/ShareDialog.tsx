import { useState, type FormEvent } from 'react';
import type { DocumentDetail, ShareRole } from '../api/types';
import { useRevokeShare, useShareDocument, useShares } from '../hooks/use-documents';
import { Avatar } from './Avatar';
import { Button } from './Button';
import { Dialog } from './Dialog';

const ROLE_OPTIONS: Array<{ value: ShareRole; label: string }> = [
  { value: 'editor', label: 'Can edit' },
  { value: 'viewer', label: 'View only' },
];

interface ShareDialogProps {
  document: DocumentDetail;
  isOpen: boolean;
  onClose: () => void;
}

export function ShareDialog({ document, isOpen, onClose }: ShareDialogProps) {
  const isOwner = document.access === 'owner';
  const shares = useShares(document.id);
  const shareDocument = useShareDocument(document.id);
  const revokeShare = useRevokeShare(document.id);
  const [email, setEmail] = useState('');
  const [role, setRole] = useState<ShareRole>('editor');

  function handleSubmit(event: FormEvent) {
    event.preventDefault();
    shareDocument.mutate({ email: email.trim(), role }, { onSuccess: () => setEmail('') });
  }

  const mutationError = shareDocument.error ?? revokeShare.error;

  return (
    <Dialog
      isOpen={isOpen}
      onClose={onClose}
      title={`Share “${document.title}”`}
      description={isOwner ? 'People you add can find it under “Shared with me”.' : 'Only the owner can change who has access.'}
    >
      {isOwner && (
        <form onSubmit={handleSubmit} className="flex flex-col gap-2 sm:flex-row">
          <label className="sr-only" htmlFor="share-email">
            Email
          </label>
          <input
            id="share-email"
            type="email"
            required
            placeholder="teammate@ajaia.dev"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            className="h-9 min-w-0 flex-1 rounded-md border border-line-strong px-3 text-sm focus:border-primary"
          />
          <label className="sr-only" htmlFor="share-role">
            Permission
          </label>
          <select
            id="share-role"
            value={role}
            onChange={(event) => setRole(event.target.value as ShareRole)}
            className="h-9 rounded-md border border-line-strong bg-sheet px-2 text-sm"
          >
            {ROLE_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
          <Button type="submit" disabled={!email.trim() || shareDocument.isPending}>
            Share
          </Button>
        </form>
      )}

      {mutationError && (
        <p role="alert" className="mt-3 rounded-md bg-danger-soft px-3 py-2 text-sm text-danger">
          {mutationError.message}
        </p>
      )}

      <h3 className="mt-6 text-sm font-medium">People with access</h3>
      <ul className="mt-2 divide-y divide-line">
        <li className="flex items-center gap-3 py-2.5">
          <Avatar name={document.owner.name} />
          <PersonLabel name={document.owner.name} email={document.owner.email} />
          <span className="text-sm text-ink-muted">Owner</span>
        </li>
        {shares.isPending && <li className="py-2.5 text-sm text-ink-muted">Loading…</li>}
        {shares.data?.shares.map((share) => (
          <li key={share.user.id} className="flex items-center gap-3 py-2.5">
            <Avatar name={share.user.name} />
            <PersonLabel name={share.user.name} email={share.user.email} />
            {isOwner ? (
              <>
                <label className="sr-only" htmlFor={`role-${share.user.id}`}>
                  Permission for {share.user.name}
                </label>
                <select
                  id={`role-${share.user.id}`}
                  value={share.role}
                  disabled={shareDocument.isPending}
                  onChange={(event) =>
                    shareDocument.mutate({ email: share.user.email, role: event.target.value as ShareRole })
                  }
                  className="h-8 rounded-md border border-transparent bg-transparent px-1 text-sm hover:border-line"
                >
                  {ROLE_OPTIONS.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
                <Button
                  variant="ghost"
                  className="h-8 px-2 text-xs"
                  disabled={revokeShare.isPending}
                  onClick={() => revokeShare.mutate(share.user.id)}
                  aria-label={`Remove access for ${share.user.name}`}
                >
                  Remove
                </Button>
              </>
            ) : (
              <span className="text-sm text-ink-muted">
                {ROLE_OPTIONS.find((option) => option.value === share.role)?.label}
              </span>
            )}
          </li>
        ))}
      </ul>
    </Dialog>
  );
}

function PersonLabel({ name, email }: { name: string; email: string }) {
  return (
    <span className="min-w-0 flex-1">
      <span className="block truncate text-sm font-medium">{name}</span>
      <span className="block truncate text-xs text-ink-muted">{email}</span>
    </span>
  );
}
