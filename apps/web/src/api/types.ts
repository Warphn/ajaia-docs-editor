/** Mirrors the API response shapes documented in Swagger (/api/docs). */

export interface User {
  id: string;
  email: string;
  name: string;
}

export type DocumentAccess = 'owner' | 'editor' | 'viewer';
export type ShareRole = 'viewer' | 'editor';

export interface DocumentSummary {
  id: string;
  title: string;
  access: DocumentAccess;
  owner: User;
  /** Team the document was created in; null for personal documents. */
  teamId: string | null;
  updatedAt: string;
}

/** A project group: members can open and edit every document created in it. */
export interface Team {
  id: string;
  name: string;
  members: User[];
}

export interface DocumentDetail extends DocumentSummary {
  contentHtml: string;
  version: number;
  createdAt: string;
}

export interface DocumentList {
  owned: DocumentSummary[];
  sharedWithMe: DocumentSummary[];
}

export interface Share {
  user: User;
  role: ShareRole;
  createdAt: string;
}

export interface DocumentTemplate {
  id: string;
  name: string;
  description: string;
  audience: string;
}

/** Whiteboard around the page, stored by the API as-is (Excalidraw's own element format). */
export interface CanvasScene {
  elements: readonly Record<string, unknown>[];
  files: Record<string, Record<string, unknown>>;
  pagePosition: { x: number; y: number };
}

export interface DocumentChanges {
  title?: string;
  contentHtml?: string;
}
