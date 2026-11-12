import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '../api/client';

export const teamKeys = {
  list: ['teams'] as const,
  documents: (teamId: string) => ['teams', teamId, 'documents'] as const,
};

export function useTeams() {
  return useQuery({ queryKey: teamKeys.list, queryFn: async () => (await api.listTeams()).teams });
}

export function useTeamDocuments(teamId: string | null) {
  return useQuery({
    queryKey: teamKeys.documents(teamId ?? ''),
    queryFn: async () => (await api.listTeamDocuments(teamId!)).documents,
    enabled: teamId !== null,
  });
}

export function useCreateTeam() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: api.createTeam,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: teamKeys.list }),
  });
}

export function useAddTeamMember(teamId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (email: string) => api.addTeamMember(teamId, email),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: teamKeys.list }),
  });
}
