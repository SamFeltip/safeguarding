import { Link, useParams } from 'react-router-dom';
import { Plus, UserRound } from 'lucide-react';
import { permissions } from '../../shared/documents';
import { usePermissions } from '@/components/identity';
import { useCase, usePerson } from '@/hooks/use-records';
import { Failure, Loading } from '@/components/feedback';
import { LinkedDocuments } from '@/components/linked-documents';
import { PageBreadcrumb } from '@/components/page-breadcrumb';
import { Button } from '@/components/ui/button';
import { CardDescription } from '@/components/ui/card';

export function CasePage() {
  const { id } = useParams();
  const query = useCase(id);
  const person = usePerson(query.data?.personId);
  const grants = usePermissions();
  if (query.isPending || (query.data && person.isPending)) return <Loading />;
  const error = query.error ?? person.error;
  if (error) return <Failure error={error} />;
  if (!query.data) return <Failure error={new Error('Case not found.')} />;
  const record = query.data;
  return (
    <div className="space-y-8">
      <PageBreadcrumb items={[{ label: 'Cases', to: '/cases' }, { label: record.title }]} />
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div className="space-y-3">
          <h1 className="text-4xl font-semibold tracking-tight">{record.title}</h1>
          <Button
            asChild
            variant="link"
            className="h-auto min-w-0 max-w-full whitespace-normal text-left"
          >
            <Link to={`/people/${record.personId}`}>
              <UserRound />
              {person.data?.fullName ?? 'Person'}
            </Link>
          </Button>
          <CardDescription>
            Created {new Date(record.createdAt).toLocaleDateString()}
          </CardDescription>
        </div>
        {grants.includes(permissions.create) ? (
          <Button asChild>
            <Link to={`/documents/new?personId=${record.personId}&caseId=${record.id}`}>
              <Plus />
              New document
            </Link>
          </Button>
        ) : null}
      </div>
      <section className="space-y-4" aria-label="Case documents">
        <h2 className="text-xl font-semibold">Documents</h2>
        <LinkedDocuments filters={{ caseId: record.id }} />
      </section>
    </div>
  );
}
