import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { ApiError, api } from '../api/client';
import type { User } from '../api/types';

export const CURRENT_USER_QUERY_KEY = ['current-user'] as const;

/** Resolves to the signed-in user, or null when there is no valid session. */
export function useCurrentUser() {
  return useQuery({
    queryKey: CURRENT_USER_QUERY_KEY,
    queryFn: async (): Promise<User | null> => {
      try {
        const { user } = await api.getCurrentUser();
        return user;
      } catch (error) {
        if (error instanceof ApiError && error.status === 401) {
          return null;
        }
        throw error;
      }
    },
    staleTime: Infinity,
    retry: false,
  });
}

export function useLogin() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ email, password }: { email: string; password: string }) => api.login(email, password),
    onSuccess: ({ user }) => {
      // Drop anything cached for a previous user before showing the new one's data.
      queryClient.clear();
      queryClient.setQueryData(CURRENT_USER_QUERY_KEY, user);
    },
  });
}

export function useLogout() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: () => api.logout(),
    onSuccess: () => {
      queryClient.clear();
      queryClient.setQueryData(CURRENT_USER_QUERY_KEY, null);
    },
  });
}
