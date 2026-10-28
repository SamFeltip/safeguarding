import { useSearchParams } from 'react-router-dom';
import { permissions, readableAudiences } from '../../shared/documents';
import { usePermissions } from '@/components/identity';
import { useCreateDocument } from '@/hooks/use-documents';
import { useCase, usePerson } from '@/hooks/use-records';
import { OnboardingForm } from '@/components/onboarding-form';
import { DocumentContextPicker } from '@/components/document-context-picker';
import { Failure, Loading } from '@/components/feedback';
import { PageBreadcrumb } from '@/components/page-breadcrumb';
import { Card, CardContent } from '@/components/ui/card';

export function NewDocumentPage() {
  const [query, setQuery] = useSearchParams();
  const caseId = query.get('caseId') ?? undefined;
  const selectedCase = useCase(caseId);
  const personId = query.get('personId') ?? selectedCase.data?.personId;
  const person = usePerson(personId);
  const grants = usePermissions();
  const upload = useCreateDocument();
  const allowed = readableAudiences(grants);
  if (!grants.includes(permissions.create) || allowed.length === 0) {
    return <Failure error={new Error('Your role cannot create documents.')} />;
  }
  if ((caseId && selectedCase.isPending) || (personId && person.isPending)) return <Loading />;
  const error = selectedCase.error ?? person.error;
  if (error) return <Failure error={error} />;
  if (selectedCase.data && personId !== selectedCase.data.personId) {
    return <Failure error={new Error('The case belongs to a different person.')} />;
  }
  const links = { ...(personId ? { personId } : {}), ...(caseId ? { caseId } : {}) };
  const update = (personId?: string, caseId?: string) => {
    setQuery({ ...(personId ? { personId } : {}), ...(caseId ? { caseId } : {}) });
  };
  const parent = selectedCase.data
    ? { label: selectedCase.data.title, to: `/cases/${selectedCase.data.id}` }
    : person.data
      ? { label: person.data.fullName, to: `/people/${person.data.id}` }
      : { label: 'Documents', to: '/' };
  return (
    <div className="mx-auto max-w-4xl space-y-8">
      <PageBreadcrumb items={[parent, { label: 'New document' }]} />
      <h1 className="text-3xl font-semibold tracking-tight sm:text-4xl">New document</h1>
      <DocumentContextPicker
        {...links}
        onPerson={(id) => {
          update(id);
        }}
        onCase={(id) => {
          update(personId, id);
        }}
      />
      <Card>
        <CardContent>
          <OnboardingForm
            key={`${personId ?? ''}-${caseId ?? ''}`}
            links={links}
            cancelTo={parent.to}
            defaults={person.data}
            allowed={allowed}
            pending={upload.isPending}
            error={upload.error}
            onSubmit={(form) => {
              upload.mutate(form);
            }}
          />
        </CardContent>
      </Card>
    </div>
  );
}
