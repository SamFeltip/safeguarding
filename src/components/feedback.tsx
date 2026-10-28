import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Spinner } from '@/components/ui/spinner';

export function Loading() {
  return <Spinner />;
}

export function Failure({ error, retry }: { error: Error; retry?: () => void }) {
  return (
    <Alert variant="destructive" role="alert">
      <AlertDescription>
        {error.message}
        {retry ? (
          <Button variant="outline" onClick={retry}>
            Try again
          </Button>
        ) : null}
      </AlertDescription>
    </Alert>
  );
}
