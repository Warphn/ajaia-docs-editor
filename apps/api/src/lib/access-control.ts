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
}

/** Returns the user's access level, or null when the document must be invisible to them. */
export function resolveAccess({ userId, ownerId, shareRole }: AccessInput): DocumentAccess | null {
  if (userId === ownerId) {
    return 'owner';
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
