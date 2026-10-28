import { Link, useNavigate, useParams } from 'react-router-dom';
import { Plus } from 'lucide-react';
import { permissions } from '../../shared/documents';
import { usePermissions } from '@/components/identity';
import { usePerson } from '@/hooks/use-records';
import { Failure, Loading } from '@/components/feedback';
import { CaseList } from '@/components/case-list';
import { LinkedDocuments } from '@/components/linked-documents';
import { RecordCreateDialog } from '@/components/record-create-dialog';
import { PageBreadcrumb } from '@/components/page-breadcrumb';
import { Button } from '@/components/ui/button';
import { CardDescription } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

export function PersonPage() {
  const { id } = useParams();
  const query = usePerson(id);
  const grants = usePermissions();
  const navigate = useNavigate();
  if (query.isPending) return <Loading />;
  if (query.error) return <Failure error={query.error} />;
  const person = query.data;
  return (
    <div className="space-y-8">
      <PageBreadcrumb items={[{ label: 'People', to: '/people' }, { label: person.fullName }]} />
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div className="space-y-3">
          <h1 className="text-4xl font-semibold tracking-tight">{person.fullName}</h1>
          <CardDescription className="text-lg">{person.email}</CardDescription>
        </div>
        {grants.includes(permissions.create) ? (
          <div className="flex flex-wrap gap-2">
            <RecordCreateDialog
              collection="cases"
              personId={person.id}
              onCreated={(id) => {
                void navigate(`/cases/${id}`);
              }}
            />
            <Button asChild>
              <Link to={`/documents/new?personId=${person.id}`}>
                <Plus />
                New document
              </Link>
            </Button>
          </div>
        ) : null}
      </div>
      <Tabs defaultValue="cases">
        <TabsList>
          <TabsTrigger value="cases">Cases</TabsTrigger>
          <TabsTrigger value="documents">Documents</TabsTrigger>
        </TabsList>
        <TabsContent value="cases" className="pt-4">
          <CaseList personId={person.id} />
        </TabsContent>
        <TabsContent value="documents" className="pt-4">
          <LinkedDocuments filters={{ personId: person.id }} />
        </TabsContent>
      </Tabs>
    </div>
  );
}
