import type { DocumentLinks } from '../../shared/records';
import { useInfiniteQuery, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { documentListSchema, documentSchema } from '../../shared/documents';
import { useApi } from '@/lib/api';
import { buildDocumentUpload } from '@/lib/document-upload';
import { usePermissions } from '@/components/identity';

const documentsKey = ['documents'] as const;

export function useDocuments(filters: DocumentLinks = {}) {
  const api = useApi();
  const grants = usePermissions();
  return useInfiniteQuery({
    queryKey: [...documentsKey, 'list', grants, filters],
    initialPageParam: '',
    queryFn: ({ pageParam, signal }) => {
      const query = new URLSearchParams({ cursor: pageParam });
      if (filters.personId) query.set('personId', filters.personId);
      if (filters.caseId) query.set('caseId', filters.caseId);
      return api(`/documents?${query.toString()}`, documentListSchema, { signal });
    },
    getNextPageParam: (page) => page.cursor ?? undefined,
  });
}

export function useDocument(id: string) {
  const api = useApi();
  const grants = usePermissions();
  return useQuery({
    queryKey: [...documentsKey, 'detail', id, grants],
    queryFn: ({ signal }) => api(`/documents/${id}`, documentSchema, { signal }),
  });
}

export function useCreateDocument() {
  const api = useApi();
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  return useMutation({
    mutationFn: (form: FormData) =>
      api('/documents', documentSchema, {
        method: 'POST',
        body: buildDocumentUpload(form),
      }),
    onSuccess: async (document) => {
      await queryClient.invalidateQueries({ queryKey: documentsKey });
      await navigate(`/documents/${document.id}`, { replace: true });
    },
  });
}
