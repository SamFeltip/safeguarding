import { Link } from 'react-router-dom';
import type { DocumentSummary } from '../../shared/documents';
import { Button } from './ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Separator } from './ui/separator';

export function CaseDocumentCard({ document }: { document: DocumentSummary }) {
  const submitted = new Date(document.createdAt).toLocaleDateString('en-GB');
  const title = document.title ?? 'Onboarding';
  return (
    <Button
      asChild
      variant="ghost"
      className="h-auto w-full min-w-0 flex-col gap-2 whitespace-normal p-0"
    >
      <Link to={`/documents/${document.id}`} aria-label={`View ${title}, submitted ${submitted}`}>
        <Card
          aria-hidden="true"
          className="aspect-[210/297] w-full max-w-32 min-w-0 gap-2 overflow-hidden rounded-md py-4 text-left"
        >
          <CardHeader className="gap-1 px-3">
            <CardDescription className="text-[5px] uppercase tracking-widest">
              Onboarding
            </CardDescription>
            <CardTitle className="line-clamp-2 break-words text-[9px] leading-tight">
              {document.fullName}
            </CardTitle>
            <CardDescription className="line-clamp-2 break-words text-[6px] leading-snug">
              {document.jobTitle}
            </CardDescription>
          </CardHeader>
          <CardContent className="min-h-0 space-y-2 overflow-hidden px-3">
            <Separator />
            <div className="space-y-0.5">
              <CardDescription className="text-[5px]">Department</CardDescription>
              <p className="line-clamp-2 break-words text-[7px] leading-snug">
                {document.department}
              </p>
            </div>
            <div className="space-y-0.5">
              <CardDescription className="text-[5px]">Start date</CardDescription>
              <p className="text-[7px] leading-snug">{document.startDate}</p>
            </div>
          </CardContent>
        </Card>
        <span className="grid w-full min-w-0 gap-1 text-center">
          <span className="line-clamp-2 break-words text-sm leading-snug" title={title}>
            {title}
          </span>
          <span className="text-xs font-normal text-muted-foreground">{submitted}</span>
        </span>
      </Link>
    </Button>
  );
}
