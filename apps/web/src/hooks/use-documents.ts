import { useMutation, useQuery, useQueryClient, type QueryClient } from '@tanstack/react-query';
import { api } from '../api/client';
import type { ShareRole } from '../api/types';

export const documentKeys = {
  list: ['documents'] as const,
  detail: (documentId: string) => ['documents', documentId] as const,
  shares: (documentId: string) => ['documents', documentId, 'shares'] as const,
  canvas: (documentId: string) => ['documents', documentId, 'canvas'] as const,
};

export function useDocumentList() {
  return useQuery({ queryKey: documentKeys.list, queryFn: api.listDocuments });
}

export function useTemplates({ enabled }: { enabled: boolean }) {
  return useQuery({
    queryKey: ['templates'],
    queryFn: api.listTemplates,
    enabled,
    // Templates ship with the code; they never change while the app is open.
    staleTime: Infinity,
  });
}

export function useCanvas(documentId: string, { enabled }: { enabled: boolean }) {
  return useQuery({
    queryKey: documentKeys.canvas(documentId),
    queryFn: () => api.getCanvas(documentId),
    enabled,
    // Loaded once as Excalidraw's initial data; afterwards the canvas component owns the live scene.
    staleTime: Infinity,
    gcTime: 0,
  });
}

export function useDocument(documentId: string) {
  return useQuery({
    queryKey: documentKeys.detail(documentId),
    queryFn: () => api.getDocument(documentId),
    // The editor owns the live copy once loaded; refetching would reset the cursor.
    staleTime: Infinity,
    retry: false,
  });
}

/** Personal and team lists both show documents, so changes refresh both. */
function invalidateDocumentLists(queryClient: QueryClient) {
  void queryClient.invalidateQueries({ queryKey: documentKeys.list });
  void queryClient.invalidateQueries({ queryKey: ['teams'] });
}

export function useCreateDocument() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: api.createDocument,
    onSuccess: () => invalidateDocumentLists(queryClient),
  });
}

export function useImportDocument() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: api.importDocument,
    onSuccess: () => invalidateDocumentLists(queryClient),
  });
}

export function useDeleteDocument() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: api.deleteDocument,
    onSuccess: () => invalidateDocumentLists(queryClient),
  });
}

export function useShares(documentId: string) {
  return useQuery({ queryKey: documentKeys.shares(documentId), queryFn: () => api.listShares(documentId) });
}

export function useShareDocument(documentId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ email, role }: { email: string; role: ShareRole }) => api.shareDocument(documentId, email, role),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: documentKeys.shares(documentId) }),
  });
}

export function useRevokeShare(documentId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (userId: string) => api.revokeShare(documentId, userId),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: documentKeys.shares(documentId) }),
  });
}
