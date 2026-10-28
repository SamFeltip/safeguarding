import { useMutation, useQueryClient } from '@tanstack/react-query';
import { documentAccessSchema } from '../../shared/document-access';
import type { Audience } from '../../shared/documents';
import { useApi } from '@/lib/api';

export function useRecordAccess(
  id: string,
  collection: 'documents' | 'people' | 'cases' = 'documents',
) {
  const api = useApi();
  const client = useQueryClient();
  return useMutation({
    mutationFn: (audience: Audience) =>
      api(`/admin/${collection}/${id}/access`, documentAccessSchema, {
        method: 'PUT',
        body: JSON.stringify({ audience }),
        headers: { 'Content-Type': 'application/json' },
      }),
    onSuccess: async () => {
      await Promise.all(
        ['documents', 'people', 'cases'].map((key) =>
          client.invalidateQueries({ queryKey: [key] }),
        ),
      );
    },
  });
}
