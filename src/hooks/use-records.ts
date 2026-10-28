import { useInfiniteQuery, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { personSchema, caseSchema, peopleListSchema, casesListSchema } from '../../shared/records';
import type { Person, CaseRecord } from '../../shared/records';
import type { z } from 'zod';
import { useApi } from '@/lib/api';
import { usePermissions } from '@/components/identity';

function useRecordList<T>(
  collection: string,
  schema: z.ZodType<T & { cursor: string | null }>,
  personId?: string,
) {
  const api = useApi();
  const grants = usePermissions();
  return useInfiniteQuery({
    queryKey: [collection, grants, personId],
    initialPageParam: '',
    queryFn: ({ pageParam, signal }) => {
      const query = new URLSearchParams({ cursor: pageParam });
      if (personId) query.set('personId', personId);
      return api(`/${collection}?${query.toString()}`, schema, { signal });
    },
    getNextPageParam: (page) => page.cursor ?? undefined,
  });
}
export function usePeople() {
  return useRecordList('people', peopleListSchema);
}
export function useCases(personId?: string) {
  return useRecordList('cases', casesListSchema, personId);
}

export function usePerson(id?: string) {
  const api = useApi();
  const grants = usePermissions();
  return useQuery({
    queryKey: ['people', id, grants],
    enabled: !!id,
    queryFn: ({ signal }) => api(`/people/${id ?? ''}`, personSchema, { signal }),
  });
}
export function useCase(id?: string) {
  const api = useApi();
  const grants = usePermissions();
  return useQuery({
    queryKey: ['cases', id, grants],
    enabled: !!id,
    queryFn: ({ signal }) => api(`/cases/${id ?? ''}`, caseSchema, { signal }),
  });
}
export function useCreateRecord(collection: 'people' | 'cases') {
  const api = useApi();
  const client = useQueryClient();
  return useMutation<Person | CaseRecord, Error, Record<string, string>>({
    mutationFn: (values: Record<string, string>) =>
      collection === 'people'
        ? api('/people', personSchema, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(values),
          })
        : api('/cases', caseSchema, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(values),
          }),
    onSuccess: async () => {
      await client.invalidateQueries({ queryKey: [collection] });
    },
  });
}
