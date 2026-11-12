import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '../api/client';
import type { ShareRole } from '../api/types';

export const documentKeys = {
  list: ['documents'] as const,
  detail: (documentId: string) => ['documents', documentId] as const,
  shares: (documentId: string) => ['documents', documentId, 'shares'] as const,
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

export function useDocument(documentId: string) {
  return useQuery({
    queryKey: documentKeys.detail(documentId),
    queryFn: () => api.getDocument(documentId),
    // The editor owns the live copy once loaded; refetching would reset the cursor.
    staleTime: Infinity,
    retry: false,
  });
}

export function useCreateDocument() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: api.createDocument,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: documentKeys.list }),
  });
}

export function useImportDocument() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: api.importDocument,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: documentKeys.list }),
  });
}

export function useDeleteDocument() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: api.deleteDocument,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: documentKeys.list }),
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
