import type { DocumentLinks } from '../../shared/records';
import { useDocuments } from '@/hooks/use-documents';
import { CaseDocumentCard } from './case-document-card';
import { DocumentCard } from './document-card';
import { Failure, Loading } from './feedback';
import { Button } from './ui/button';
import { Empty, EmptyHeader, EmptyTitle } from './ui/empty';

export function LinkedDocuments({ filters }: { filters: DocumentLinks }) {
  const query = useDocuments(filters);
  const records = query.data?.pages.flatMap((page) => page.documents) ?? [];
  return (
    <div className="space-y-4">
      {query.isPending ? <Loading /> : null}
      {query.error ? <Failure error={query.error} /> : null}
      {!query.isPending && !query.error && records.length === 0 ? (
        <Empty>
          <EmptyHeader>
            <EmptyTitle>No documents</EmptyTitle>
          </EmptyHeader>
        </Empty>
      ) : null}
      <ul
        className={
          filters.caseId
            ? 'grid grid-cols-[repeat(auto-fill,8rem)] justify-center gap-x-4 gap-y-6 sm:justify-start sm:gap-x-6'
            : 'grid gap-4'
        }
      >
        {records.map((record) => (
          <li key={record.id}>
            {filters.caseId ? (
              <CaseDocumentCard document={record} />
            ) : (
              <DocumentCard document={record} />
            )}
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
