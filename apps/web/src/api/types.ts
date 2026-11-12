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
  updatedAt: string;
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

export interface DocumentChanges {
  title?: string;
  contentHtml?: string;
}
