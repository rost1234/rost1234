import { QueryClient } from '@tanstack/react-query';

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 30_000,
      retry: (count, error) => {
        // Don't retry auth or not-found errors; retry transient ones twice.
        const status = (error as { status?: number }).status;
        if (status === 401 || status === 403 || status === 404) return false;
        return count < 2;
      },
    },
    mutations: { retry: false },
  },
});
