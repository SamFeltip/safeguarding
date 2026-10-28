import { Link } from 'react-router-dom';
import { ArrowRight, CalendarDays } from 'lucide-react';
import type { DocumentSummary } from '../../shared/documents';
import { Button } from './ui/button';
import { Card, CardAction, CardDescription, CardFooter, CardHeader, CardTitle } from './ui/card';

export function DocumentCard({ document }: { document: DocumentSummary }) {
  const title = document.title ?? 'Onboarding';
  return (
    <Card>
      <CardHeader>
        <CardTitle>
          <h2 className="text-xl">{title}</h2>
        </CardTitle>
        <CardDescription>
          {document.fullName} · {document.department}
        </CardDescription>
        <CardAction>
          <Button asChild variant="outline" size="icon">
            <Link to={`/documents/${document.id}`} aria-label={`View ${title}`}>
              <ArrowRight />
            </Link>
          </Button>
        </CardAction>
      </CardHeader>
      <CardFooter className="gap-2">
        <CalendarDays className="size-4 text-muted-foreground" />
        <CardDescription>
          Starts <time dateTime={document.startDate}>{document.startDate}</time>
        </CardDescription>
      </CardFooter>
    </Card>
  );
}
