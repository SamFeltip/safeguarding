import { Link, useNavigate } from 'react-router-dom';
import { ArrowRight } from 'lucide-react';
import { permissions } from '../../shared/documents';
import { usePermissions } from '@/components/identity';
import { usePeople } from '@/hooks/use-records';
import { RecordCreateDialog } from '@/components/record-create-dialog';
import { Failure, Loading } from '@/components/feedback';
import { Button } from '@/components/ui/button';
import { Card, CardAction, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Empty, EmptyHeader, EmptyTitle } from '@/components/ui/empty';

export function PeoplePage() {
  const query = usePeople();
  const grants = usePermissions();
  const navigate = useNavigate();
  const people = query.data?.pages.flatMap((page) => page.people) ?? [];
  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <h1 className="text-4xl font-semibold tracking-tight sm:text-5xl">People</h1>
        {grants.includes(permissions.create) ? (
          <RecordCreateDialog
            collection="people"
            onCreated={(id) => {
              void navigate(`/people/${id}`);
            }}
          />
        ) : null}
      </div>
      {query.isPending ? <Loading /> : null}
      {query.error ? <Failure error={query.error} /> : null}
      {!query.isPending && !query.error && people.length === 0 ? (
        <Empty>
          <EmptyHeader>
            <EmptyTitle>No people</EmptyTitle>
          </EmptyHeader>
        </Empty>
      ) : null}
      <ul className="grid gap-4">
        {people.map((person) => (
          <li key={person.id}>
            <Card>
              <CardHeader>
                <CardTitle>
                  <h2 className="text-xl">{person.fullName}</h2>
                </CardTitle>
                <CardDescription>
                  {person.email}
                  {person.department ? ` · ${person.department}` : ''}
                </CardDescription>
                <CardAction>
                  <Button asChild variant="outline" size="icon">
                    <Link to={`/people/${person.id}`} aria-label={`View ${person.fullName}`}>
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
