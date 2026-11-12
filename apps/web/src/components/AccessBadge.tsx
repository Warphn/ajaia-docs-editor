import type { DocumentAccess } from '../api/types';

const ACCESS_LABELS: Record<DocumentAccess, string> = {
  owner: 'Owner',
  editor: 'Can edit',
  viewer: 'View only',
};

const ACCESS_CLASSES: Record<DocumentAccess, string> = {
  owner: 'bg-primary-soft text-primary',
  editor: 'bg-success-soft text-success',
  viewer: 'bg-canvas text-ink-muted',
};

export function AccessBadge({ access }: { access: DocumentAccess }) {
  return (
    <span className={`inline-flex shrink-0 items-center rounded px-1.5 py-0.5 text-xs font-medium ${ACCESS_CLASSES[access]}`}>
      {ACCESS_LABELS[access]}
    </span>
  );
}
