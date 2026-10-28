import { Link } from 'react-router-dom';
import { ArrowRight } from 'lucide-react';
import { useCases } from '@/hooks/use-records';
import { Failure, Loading } from './feedback';
import { Button } from './ui/button';
import { Card, CardAction, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Empty, EmptyHeader, EmptyTitle } from './ui/empty';

export function CaseList({ personId }: { personId?: string }) {
  const query = useCases(personId);
  const records = query.data?.pages.flatMap((page) => page.cases) ?? [];
  return (
    <div className="space-y-4">
      {query.isPending ? <Loading /> : null}
      {query.error ? <Failure error={query.error} /> : null}
      {!query.isPending && !query.error && records.length === 0 ? (
        <Empty>
          <EmptyHeader>
            <EmptyTitle>No cases</EmptyTitle>
          </EmptyHeader>
        </Empty>
      ) : null}
      <ul className="grid gap-4">
        {records.map((record) => (
          <li key={record.id}>
            <Card>
              <CardHeader>
                <CardTitle>
                  <h2>{record.title}</h2>
                </CardTitle>
                <CardDescription>
                  Created {new Date(record.createdAt).toLocaleDateString()}
                </CardDescription>
                <CardAction>
                  <Button asChild variant="outline" size="icon">
                    <Link to={`/cases/${record.id}`} aria-label={`View ${record.title}`}>
                      <ArrowRight />
                    </Link>
                  </Button>
                </CardAction>
              </CardHeader>
            </Card>
          </li>
        ))}
      </ul>
      {query.hasNextPage ? (
        <Button
          variant="outline"
          disabled={query.isFetchingNextPage}
          onClick={() => {
            void query.fetchNextPage();
          }}
        >
          Load more
        </Button>
      ) : null}
    </div>
  );
}
