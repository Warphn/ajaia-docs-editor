import type { ShareRole } from '../db/schema.js';

/**
 * Effective permission a user has on a document.
 * - owner: full control (edit, rename, delete, manage sharing)
 * - editor: can edit content and title
 * - viewer: read-only
 */
export type DocumentAccess = 'owner' | ShareRole;

export interface AccessInput {
  userId: string;
  ownerId: string;
  /** Role granted to this user through a share, if any. */
  shareRole: ShareRole | null;
  /** Whether the user belongs to the team the document was created in. */
  isTeamMember?: boolean;
}

/**
 * Returns the user's access level, or null when the document must be invisible to them.
 * Team documents are shared work: every member can edit them; the strongest grant wins.
 */
export function resolveAccess({ userId, ownerId, shareRole, isTeamMember = false }: AccessInput): DocumentAccess | null {
  if (userId === ownerId) {
    return 'owner';
  }
  if (isTeamMember) {
    return 'editor';
  }
  return shareRole;
}

export function canEdit(access: DocumentAccess): boolean {
  return access === 'owner' || access === 'editor';
}

export function canManageSharing(access: DocumentAccess): boolean {
  return access === 'owner';
}

export function canDelete(access: DocumentAccess): boolean {
  return access === 'owner';
}
