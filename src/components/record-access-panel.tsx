import { usePeople, useCases } from '@/hooks/use-records';
import { AccessSelect } from './access-select';
import { Failure, Loading } from './feedback';
import { Button } from './ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from './ui/table';
import type { Audience } from '../../shared/documents';

function RecordAccessPanel({
  collection,
  rows,
  pending,
  error,
  more,
  fetching,
  loadMore,
}: {
  collection: 'people' | 'cases';
  rows: { id: string; fullName: string; audience: Audience }[];
  pending: boolean;
  error: Error | null;
  more: boolean;
  fetching: boolean;
  loadMore: () => void;
}) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>{collection === 'people' ? 'People' : 'Cases'} access</CardTitle>
        <CardDescription>
          Person and case restrictions also apply to linked documents.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {pending ? <Loading /> : null}
        {error ? <Failure error={error} /> : null}
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>Who can view</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.map((row) => (
              <TableRow key={row.id}>
                <TableCell className="max-w-36 whitespace-normal break-words">
                  {row.fullName}
                </TableCell>
                <TableCell>
                  <AccessSelect collection={collection} document={row} />
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
        {more ? (
          <Button variant="outline" disabled={fetching} onClick={loadMore}>
            Load more
          </Button>
        ) : null}
      </CardContent>
    </Card>
  );
}
export function PeopleAccessPanel() {
  const query = usePeople();
  return (
    <RecordAccessPanel
      collection="people"
      rows={query.data?.pages.flatMap((page) => page.people) ?? []}
      pending={query.isPending}
      error={query.error}
      more={query.hasNextPage}
      fetching={query.isFetchingNextPage}
      loadMore={() => {
        void query.fetchNextPage();
      }}
    />
  );
}
export function CasesAccessPanel() {
  const query = useCases();
  const rows =
    query.data?.pages.flatMap((page) =>
      page.cases.map((record) => ({ ...record, fullName: record.title })),
    ) ?? [];
  return (
    <RecordAccessPanel
      collection="cases"
      rows={rows}
      pending={query.isPending}
      error={query.error}
      more={query.hasNextPage}
      fetching={query.isFetchingNextPage}
      loadMore={() => {
        void query.fetchNextPage();
      }}
    />
  );
}
