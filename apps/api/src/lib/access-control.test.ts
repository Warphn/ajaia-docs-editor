import { describe, expect, it } from 'vitest';
import { canDelete, canEdit, canManageSharing, resolveAccess } from './access-control.js';

const OWNER_ID = 'owner-user-id';
const OTHER_USER_ID = 'other-user-id';

describe('resolveAccess', () => {
  it('returns owner when the user owns the document, regardless of shares', () => {
    expect(resolveAccess({ userId: OWNER_ID, ownerId: OWNER_ID, shareRole: null })).toBe('owner');
  });

  it('returns the share role when the document is shared with the user', () => {
    expect(resolveAccess({ userId: OTHER_USER_ID, ownerId: OWNER_ID, shareRole: 'editor' })).toBe('editor');
    expect(resolveAccess({ userId: OTHER_USER_ID, ownerId: OWNER_ID, shareRole: 'viewer' })).toBe('viewer');
  });

  it('returns null when the user neither owns nor has a share', () => {
    expect(resolveAccess({ userId: OTHER_USER_ID, ownerId: OWNER_ID, shareRole: null })).toBeNull();
  });
});

describe('permission checks', () => {
  it('lets owners and editors edit, but not viewers', () => {
    expect(canEdit('owner')).toBe(true);
    expect(canEdit('editor')).toBe(true);
    expect(canEdit('viewer')).toBe(false);
  });

  it('reserves sharing management and deletion to the owner', () => {
    for (const access of ['editor', 'viewer'] as const) {
      expect(canManageSharing(access)).toBe(false);
      expect(canDelete(access)).toBe(false);
    }
    expect(canManageSharing('owner')).toBe(true);
    expect(canDelete('owner')).toBe(true);
  });
});
