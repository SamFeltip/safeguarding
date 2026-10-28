import { useEffect, useState } from 'react';
import { useInfiniteQuery, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { backupListSchema, backupStatusSchema } from '../../shared/backup-format';
import { useApi } from '@/lib/api';

const backupsKey = ['backups'] as const;
const terminalStates = new Set(['complete', 'errored', 'terminated']);

export function useBackups() {
  const api = useApi();
  const queryClient = useQueryClient();
  const [activeId, setActiveId] = useState<string>();
  const list = useInfiniteQuery({
    queryKey: backupsKey,
    initialPageParam: '',
    queryFn: ({ pageParam, signal }) =>
      api(`/backups?cursor=${encodeURIComponent(pageParam)}`, backupListSchema, { signal }),
    getNextPageParam: (page) => page.cursor ?? undefined,
  });
  const active = useQuery({
    queryKey: ['backup', activeId],
    enabled: !!activeId,
    queryFn: ({ signal }) => api(`/backups/${activeId ?? ''}`, backupStatusSchema, { signal }),
    refetchInterval: (query) => (terminalStates.has(query.state.data?.status ?? '') ? false : 2000),
  });
  const create = useMutation({
    mutationFn: () => api('/backups', backupStatusSchema, { method: 'POST' }),
    onSuccess: (backup) => {
      setActiveId(backup.id);
    },
  });
  useEffect(() => {
    if (active.data?.status === 'complete') {
      void queryClient.invalidateQueries({ queryKey: backupsKey });
    }
  }, [active.data?.id, active.data?.status, queryClient]);

  return {
    rows: list.data?.pages.flatMap((page) => page.backups) ?? [],
    status: activeId ? (active.data?.status ?? 'queued') : undefined,
    isRunning: !!activeId && !terminalStates.has(active.data?.status ?? ''),
    isCreating: create.isPending,
    isLoadingMore: list.isFetchingNextPage,
    hasMore: list.hasNextPage,
    error: create.error ?? active.error ?? list.error,
    create: () => {
      create.mutate();
    },
    loadMore: () => {
      void list.fetchNextPage();
    },
  };
}
