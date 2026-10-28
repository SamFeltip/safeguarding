import { useState } from 'react';
import { casePeople } from '../../shared/records';
import { PeoplePicker } from '@/components/people-picker';
import { Link, useParams } from 'react-router-dom';
import { Plus, UserRound } from 'lucide-react';
import { permissions } from '../../shared/documents';
import { usePermissions } from '@/components/identity';
import { useCase, usePerson, useUpdateCasePeople } from '@/hooks/use-records';
import { Failure, Loading } from '@/components/feedback';
import { LinkedDocuments } from '@/components/linked-documents';
import { PageBreadcrumb } from '@/components/page-breadcrumb';
import { Button } from '@/components/ui/button';
import { CardDescription } from '@/components/ui/card';

export function CasePage() {
  const { id } = useParams();
  const query = useCase(id);

  const grants = usePermissions();
  if (query.isPending) return <Loading />;
  const error = query.error;
  if (error) return <Failure error={error} />;
  const record = query.data;
  return (
    <div className="space-y-8">
      <PageBreadcrumb items={[{ label: 'Cases', to: '/cases' }, { label: record.title }]} />
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div className="space-y-3">
          <h1 className="text-4xl font-semibold tracking-tight">{record.title}</h1>
          <div className="flex flex-wrap gap-2">
            {casePeople(record).map((personId) => (
              <PersonLink key={personId} id={personId} />
            ))}
          </div>
          <CardDescription>
            Created {new Date(record.createdAt).toLocaleDateString()}
          </CardDescription>
        </div>
        {grants.includes(permissions.create) ? (
          <Button asChild>
            <Link to={`/documents/new?caseId=${record.id}`}>
              <Plus />
              New document
            </Link>
          </Button>
        ) : null}
      </div>
      {grants.includes(permissions.create) ? (
        <CasePeople
          key={`${record.id}-${casePeople(record).join(',')}`}
          id={record.id}
          people={casePeople(record)}
        />
      ) : null}
      <section className="space-y-4" aria-label="Case documents">
        <h2 className="text-xl font-semibold">Documents</h2>
        <LinkedDocuments filters={{ caseId: record.id }} />
      </section>
    </div>
  );
}

function PersonLink({ id }: { id: string }) {
  const query = usePerson(id);
  return (
    <Button asChild variant="link">
      <Link to={`/people/${id}`}>
        <UserRound />
        {query.data?.fullName ?? 'Person'}
      </Link>
    </Button>
  );
}
function CasePeople({ id, people }: { id: string; people: string[] }) {
  const [values, setValues] = useState(people);
  const update = useUpdateCasePeople(id);
  return (
    <section className="max-w-xl space-y-3" aria-label="Case people">
      <h2 className="text-xl font-semibold">People (optional)</h2>
      <PeoplePicker values={values} onChange={setValues} />
      <Button
        disabled={update.isPending || JSON.stringify(values) === JSON.stringify(people)}
        onClick={() => {
          update.mutate(values);
        }}
      >
        {update.isPending ? 'Saving…' : 'Save people'}
      </Button>
      {update.error ? <Failure error={update.error} /> : null}
    </section>
  );
}
