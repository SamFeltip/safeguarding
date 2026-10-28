import { useBackups } from '@/hooks/use-backups';
import { Plus } from 'lucide-react';
import { Failure } from './feedback';
import { Badge } from './ui/badge';
import { Button } from './ui/button';
import { Card, CardAction, CardContent, CardHeader, CardTitle } from './ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from './ui/table';

export function BackupPanel() {
  const backup = useBackups();
  return (
    <Card>
      <CardHeader>
        <CardTitle>Backups</CardTitle>
        <CardAction>
          <Button
            variant="outline"
            disabled={backup.isCreating || backup.isRunning}
            onClick={backup.create}
          >
            <Plus />
            Create backup
          </Button>
        </CardAction>
      </CardHeader>
      <CardContent className="space-y-4">
        {backup.status ? <Badge variant="secondary">{backup.status}</Badge> : null}
        {backup.error ? <Failure error={backup.error} /> : null}
        {backup.rows.length > 0 ? (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Backup</TableHead>
                <TableHead>Created</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {backup.rows.map((row) => (
                <TableRow key={row.id}>
                  <TableCell className="max-w-36 whitespace-normal break-all">{row.id}</TableCell>
                  <TableCell className="whitespace-normal">
                    {new Date(row.completedAt).toLocaleString()}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        ) : null}
        {backup.hasMore ? (
          <Button variant="outline" onClick={backup.loadMore} disabled={backup.isLoadingMore}>
            Load more
          </Button>
        ) : null}
      </CardContent>
    </Card>
  );
}
