import { Link } from 'react-router-dom';
import { useDocuments } from '@/hooks/use-documents';
import { AccessSelect } from './access-select';
import { Failure, Loading } from './feedback';
import { Button } from './ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Empty, EmptyHeader, EmptyTitle } from './ui/empty';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from './ui/table';

export function DocumentAccessPanel() {
  const query = useDocuments();
  const documents = query.data?.pages.flatMap((page) => page.documents) ?? [];
  return (
    <Card>
      <CardHeader>
        <CardTitle>Document access</CardTitle>
        <CardDescription>
          Company: all members. HR: HR and admins. Admins: admins only.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {query.isPending ? <Loading /> : null}
        {query.error ? <Failure error={query.error} /> : null}
        {!query.isPending && !query.error && documents.length === 0 ? (
          <Empty>
            <EmptyHeader>
              <EmptyTitle>No documents</EmptyTitle>
            </EmptyHeader>
          </Empty>
        ) : null}
        {documents.length > 0 ? (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Document</TableHead>
                <TableHead className="hidden sm:table-cell">Department</TableHead>
                <TableHead>Who can view</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {documents.map((document) => (
                <TableRow key={document.id}>
                  <TableCell className="max-w-36 whitespace-normal">
                    <Button
                      asChild
                      variant="link"
                      className="h-auto whitespace-normal break-words px-0 text-left"
                    >
                      <Link to={`/documents/${document.id}`}>{document.fullName}</Link>
                    </Button>
                  </TableCell>
                  <TableCell className="hidden sm:table-cell">{document.department}</TableCell>
                  <TableCell>
                    <AccessSelect document={document} />
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        ) : null}
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
      </CardContent>
    </Card>
  );
}
