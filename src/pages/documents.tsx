import { Link } from 'react-router-dom';
import { FileText, Plus } from 'lucide-react';
import { permissions } from '../../shared/documents';
import { usePermissions } from '@/components/identity';
import { useDocuments } from '@/hooks/use-documents';
import { CaseDocumentCard } from '@/components/case-document-card';
import { Failure, Loading } from '@/components/feedback';
import { Empty, EmptyHeader, EmptyMedia, EmptyTitle } from '@/components/ui/empty';
import { Button } from '@/components/ui/button';

export function DocumentsPage() {
  const grants = usePermissions();
  const query = useDocuments();
  const documents = query.data?.pages.flatMap((page) => page.documents) ?? [];
  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <h1 className="text-4xl font-semibold tracking-tight sm:text-5xl">Documents</h1>
        {grants.includes(permissions.create) ? (
          <Button asChild size="lg">
            <Link to="/documents/new">
              <Plus />
              Add document
            </Link>
          </Button>
        ) : null}
      </div>
      {query.isPending ? <Loading /> : null}
      {query.isError ? (
        <Failure
          error={query.error}
          retry={() => {
            void query.refetch();
          }}
        />
      ) : null}
      {!query.isPending && documents.length === 0 && !query.isError ? (
        <Empty>
          <EmptyHeader>
            <EmptyMedia variant="icon">
              <FileText />
            </EmptyMedia>
            <EmptyTitle>No documents</EmptyTitle>
          </EmptyHeader>
        </Empty>
      ) : null}
      <ul className="grid grid-cols-[repeat(auto-fill,8rem)] justify-center gap-x-4 gap-y-6 sm:justify-start sm:gap-x-6">
        {documents.map((document) => (
          <li key={document.id}>
            <CaseDocumentCard document={document} />
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
          {query.isFetchingNextPage ? 'Loading…' : 'Load more'}
        </Button>
      ) : null}
    </div>
  );
}
