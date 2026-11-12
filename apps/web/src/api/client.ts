import type {
  CanvasScene,
  DocumentChanges,
  DocumentDetail,
  DocumentList,
  DocumentTemplate,
  Share,
  ShareRole,
  User,
} from './types';

/** Error returned by the API, carrying its HTTP status and stable error code. */
export class ApiError extends Error {
  constructor(
    public readonly status: number,
    public readonly errorCode: string,
    message: string,
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

type HttpMethod = 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';

async function request<ResponseBody>(method: HttpMethod, path: string, body?: unknown): Promise<ResponseBody> {
  const isFormData = body instanceof FormData;
  let response: Response;
  try {
    response = await fetch(path, {
      method,
      credentials: 'same-origin',
      headers: body && !isFormData ? { 'Content-Type': 'application/json' } : undefined,
      body: body === undefined ? undefined : isFormData ? body : JSON.stringify(body),
    });
  } catch {
    throw new ApiError(0, 'NETWORK_ERROR', 'Could not reach the server. Check your connection and try again.');
  }

  if (response.status === 204) {
    return undefined as ResponseBody;
  }

  const payload = await response.json().catch(() => null);
  if (!response.ok) {
    throw new ApiError(
      response.status,
      payload?.error ?? 'UNKNOWN_ERROR',
      payload?.message ?? `Request failed with status ${response.status}.`,
    );
  }
  return payload as ResponseBody;
}

export const api = {
  login: (email: string, password: string) =>
    request<{ user: User }>('POST', '/api/auth/login', { email, password }),
  logout: () => request<void>('POST', '/api/auth/logout'),
  getCurrentUser: () => request<{ user: User }>('GET', '/api/auth/me'),

  listDocuments: () => request<DocumentList>('GET', '/api/documents'),
  createDocument: (input: { title?: string; templateId?: string } = {}) =>
    request<DocumentDetail>('POST', '/api/documents', input),
  getDocument: (documentId: string) => request<DocumentDetail>('GET', `/api/documents/${documentId}`),
  updateDocument: (documentId: string, changes: DocumentChanges & { version: number }) =>
    request<DocumentDetail>('PATCH', `/api/documents/${documentId}`, changes),
  deleteDocument: (documentId: string) => request<void>('DELETE', `/api/documents/${documentId}`),
  importDocument: (file: File) => {
    const formData = new FormData();
    formData.append('file', file);
    return request<DocumentDetail>('POST', '/api/documents/import', formData);
  },

  listShares: (documentId: string) =>
    request<{ shares: Share[] }>('GET', `/api/documents/${documentId}/shares`),
  shareDocument: (documentId: string, email: string, role: ShareRole) =>
    request<Share>('POST', `/api/documents/${documentId}/shares`, { email, role }),
  revokeShare: (documentId: string, userId: string) =>
    request<void>('DELETE', `/api/documents/${documentId}/shares/${userId}`),

  listTemplates: () => request<{ templates: DocumentTemplate[] }>('GET', '/api/templates'),

  getCanvas: (documentId: string) =>
    request<{ scene: CanvasScene | null }>('GET', `/api/documents/${documentId}/canvas`),
  saveCanvas: (documentId: string, scene: CanvasScene) =>
    request<{ scene: CanvasScene }>('PUT', `/api/documents/${documentId}/canvas`, scene),
};
