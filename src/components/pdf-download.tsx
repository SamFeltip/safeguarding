import { useMutation } from '@tanstack/react-query';
import { Download } from 'lucide-react';
import { useAuthenticatedRequest } from '@/hooks/use-authenticated-request';
import { downloadBlob } from '@/lib/download';
import { Button } from '@/components/ui/button';
import { Failure } from './feedback';

export function PdfDownload({ id }: { id: string }) {
  const request = useAuthenticatedRequest();
  const download = useMutation({
    mutationFn: async () => {
      const response = await request(`/documents/${id}/pdf`);
      downloadBlob(await response.blob(), `onboarding-${id}.pdf`);
    },
  });
  return (
    <div className="space-y-3">
      <Button
        variant="outline"
        disabled={download.isPending}
        onClick={() => {
          download.mutate();
        }}
      >
        <Download />
        {download.isPending ? 'Downloading…' : 'Download PDF'}
      </Button>
      {download.error ? <Failure error={download.error} /> : null}
    </div>
  );
}
