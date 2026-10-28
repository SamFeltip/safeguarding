import { DocumentRelationships } from '@/components/document-relationships';
import { CalendarDays, FileText } from 'lucide-react';
import { useParams } from 'react-router-dom';
import { audienceLabels } from '@/lib/onboarding-fields';
import { DocumentFields } from '@/components/document-fields';
import { useDocument } from '@/hooks/use-documents';
import { Failure, Loading } from '@/components/feedback';
import { PdfDownload } from '@/components/pdf-download';
import { Badge } from '@/components/ui/badge';
import { PageBreadcrumb } from '@/components/page-breadcrumb';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Item, ItemContent, ItemDescription, ItemTitle } from '@/components/ui/item';
import {
  Attachment,
  AttachmentContent,
  AttachmentDescription,
  AttachmentMedia,
  AttachmentTitle,
} from '@/components/ui/attachment';
import { Separator } from '@/components/ui/separator';

export function DocumentPage() {
  const { id } = useParams();
  const query = useDocument(id ?? '');
  if (query.isPending) return <Loading />;
  if (query.isError)
    return (
      <Failure
        error={query.error}
        retry={() => {
          void query.refetch();
        }}
      />
    );
  const document = query.data;
  const title = document.title ?? 'Onboarding';
  return (
    <div className="space-y-8">
      <PageBreadcrumb items={[{ label: 'Documents', to: '/' }, { label: title }]} />
      <div className="space-y-3">
        <h1 className="text-4xl font-semibold tracking-tight sm:text-5xl">{title}</h1>
        <CardDescription className="text-lg">
          {document.fullName} · {document.jobTitle}
        </CardDescription>
        <div className="flex flex-wrap items-center gap-2">
          <Badge variant="secondary">{document.onboarding.employmentType}</Badge>
          <Badge variant="outline" className="max-w-full whitespace-normal">
            {document.department}
          </Badge>
        </div>
      </div>
      <DocumentRelationships links={document} />
      <div className="grid grid-cols-1 items-start gap-6 lg:grid-cols-[minmax(0,1fr)_20rem]">
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>
                <h2>Employment</h2>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <DocumentFields
                onboarding={document.onboarding}
                columns
                fields={[
                  'email',
                  'department',
                  'manager',
                  'location',
                  'employmentType',
                  'jobTitle',
                ]}
              />
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle>
                <h2>Onboarding</h2>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <DocumentFields onboarding={document.onboarding} fields={['equipment', 'notes']} />
            </CardContent>
          </Card>
        </div>
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardDescription className="flex items-center gap-2">
                <CalendarDays className="size-4" />
                Start date
              </CardDescription>
              <CardTitle className="text-2xl">
                <time dateTime={document.startDate}>
                  {new Date(`${document.startDate}T12:00:00`).toLocaleDateString('en-GB', {
                    day: 'numeric',
                    month: 'long',
                    year: 'numeric',
                  })}
                </time>
              </CardTitle>
            </CardHeader>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle>Record</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <Badge variant="outline">{audienceLabels[document.audience]}</Badge>
              <Separator />
              <Item size="sm">
                <ItemContent>
                  <ItemTitle>Submitted</ItemTitle>
                  <ItemDescription>{new Date(document.createdAt).toLocaleString()}</ItemDescription>
                </ItemContent>
              </Item>
              <Item size="sm">
                <ItemContent className="min-w-0">
                  <ItemTitle>Submitted by</ItemTitle>
                  <ItemDescription className="line-clamp-none break-words">
                    {document.createdBy}
                  </ItemDescription>
                </ItemContent>
              </Item>
            </CardContent>
          </Card>
          {document.pdf ? (
            <Card>
              <CardHeader>
                <CardTitle>Attachment</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <Attachment>
                  <AttachmentMedia>
                    <FileText />
                  </AttachmentMedia>
                  <AttachmentContent>
                    <AttachmentTitle title={document.pdf.name}>{document.pdf.name}</AttachmentTitle>
                    <AttachmentDescription>
                      {(document.pdf.size / 1024).toFixed(0)} KiB · PDF
                    </AttachmentDescription>
                  </AttachmentContent>
                </Attachment>
                <PdfDownload id={document.id} />
              </CardContent>
            </Card>
          ) : null}
        </div>
      </div>
    </div>
  );
}
