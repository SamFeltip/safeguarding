import { Link } from 'react-router-dom';
import { FolderOpen, UserRound } from 'lucide-react';
import type { DocumentLinks } from '../../shared/records';
import { useCase, usePerson } from '@/hooks/use-records';
import { Button } from './ui/button';
import { Failure } from './feedback';

export function DocumentRelationships({ links }: { links: DocumentLinks }) {
  const person = usePerson(links.personId);
  const record = useCase(links.caseId);
  if (!links.personId && !links.caseId) return null;
  return (
    <nav aria-label="Document relationships" className="flex flex-wrap gap-2">
      {person.data ? (
        <Button
          asChild
          variant="outline"
          className="h-auto min-w-0 max-w-full whitespace-normal text-left"
        >
          <Link to={`/people/${person.data.id}`}>
            <UserRound />
            {person.data.fullName}
          </Link>
        </Button>
      ) : null}
      {record.data ? (
        <Button
          asChild
          variant="outline"
          className="h-auto min-w-0 max-w-full whitespace-normal text-left"
        >
          <Link to={`/cases/${record.data.id}`}>
            <FolderOpen />
            {record.data.title}
          </Link>
        </Button>
      ) : null}
      {person.error || record.error ? (
        <Failure error={person.error ?? record.error ?? new Error('Record unavailable.')} />
      ) : null}
    </nav>
  );
}
