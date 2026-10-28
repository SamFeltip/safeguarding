import { useCallback } from 'react';
import type { z } from 'zod';
import { useAuthenticatedRequest } from '@/hooks/use-authenticated-request';

export function useApi() {
  const request = useAuthenticatedRequest();
  return useCallback(
    async <T>(path: string, schema: z.ZodType<T>, options?: RequestInit) => {
      const response = await request(path, options);
      const payload: unknown = await response.json();
      return schema.parse(payload);
    },
    [request],
  );
}
