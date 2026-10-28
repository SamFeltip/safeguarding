import { useEffect, useRef, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Download, Eye, FileText } from 'lucide-react';
import type { OnboardingDocument } from '../../shared/documents';
import { useAuthenticatedRequest } from '@/hooks/use-authenticated-request';
import { downloadBlob } from '@/lib/download';
import { Failure } from './feedback';
import { Button } from './ui/button';
import {
  Attachment,
  AttachmentContent,
  AttachmentDescription,
  AttachmentMedia,
  AttachmentTitle,
} from './ui/attachment';

function Preview({ path, name, image }: { path: string; name: string; image: boolean }) {
  const request = useAuthenticatedRequest();
  const query = useQuery({
    queryKey: ['attachment', path],
    queryFn: async () => {
      const response = await request(path);
      return response.blob();
    },
    gcTime: 0,
  });
  const imageReference = useRef<HTMLImageElement>(null);
  const pdfReference = useRef<HTMLIFrameElement>(null);
  useEffect(() => {
    if (!query.data) return;
    const value = URL.createObjectURL(query.data);
    const element = image ? imageReference.current : pdfReference.current;
    if (element) element.src = value;
    return () => {
      URL.revokeObjectURL(value);
    };
  }, [query.data, image]);
  if (query.error) return <Failure error={query.error} />;
  if (!query.data) return <p role="status">Loading preview…</p>;
  return (
    <div className="space-y-3">
      {image ? (
        <img
          ref={imageReference}
          alt={name}
          className="max-h-96 w-full rounded-md object-contain"
        />
      ) : (
        <iframe
          ref={pdfReference}
          title={`Preview ${name}`}
          className="h-96 w-full rounded-md border"
        />
      )}
      <Button
        variant="outline"
        onClick={() => {
          downloadBlob(query.data, name);
        }}
      >
        <Download />
        Download
      </Button>
    </div>
  );
}

export function DocumentAttachments({ document }: { document: OnboardingDocument }) {
  const [opened, setOpened] = useState<number[]>([]);
  const attachments = document.attachments?.length
    ? document.attachments
    : document.pdf
      ? [{ ...document.pdf, contentType: 'application/pdf' }]
      : [];
  return (
    <div className="space-y-4">
      {attachments.map((file, index) => (
        <div key={file.key} className="space-y-3">
          <Attachment className="w-full">
            <AttachmentMedia>
              <FileText />
            </AttachmentMedia>
            <AttachmentContent>
              <AttachmentTitle title={file.name}>{file.name}</AttachmentTitle>
              <AttachmentDescription>
                {(file.size / 1024).toFixed(0)} KiB ·{' '}
                {file.contentType === 'application/pdf' ? 'PDF' : 'Image'}
              </AttachmentDescription>
            </AttachmentContent>
          </Attachment>
          <Button
            variant="outline"
            aria-expanded={opened.includes(index)}
            onClick={() => {
              setOpened((values) =>
                values.includes(index)
                  ? values.filter((value) => value !== index)
                  : [...values, index],
              );
            }}
          >
            <Eye />
            {opened.includes(index) ? 'Hide preview' : 'Preview'}
          </Button>
          {opened.includes(index) ? (
            <Preview
              path={
                document.attachments?.length
                  ? `/documents/${document.id}/attachments/${String(index)}`
                  : `/documents/${document.id}/pdf`
              }
              name={file.name}
              image={file.contentType.startsWith('image/')}
            />
          ) : null}
        </div>
      ))}
    </div>
  );
}
