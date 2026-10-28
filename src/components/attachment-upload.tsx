import { useState } from 'react';
import { FileText, Upload } from 'lucide-react';
import { Input } from './ui/input';
import { FieldLabel } from './ui/field';
import {
  Attachment,
  AttachmentContent,
  AttachmentDescription,
  AttachmentMedia,
  AttachmentTitle,
} from './ui/attachment';

export function AttachmentUpload() {
  const [files, setFiles] = useState<File[]>([]);
  return (
    <div className="space-y-3">
      <FieldLabel htmlFor="attachments">Attachments (optional)</FieldLabel>
      <p id="attachment-help" className="text-sm text-muted-foreground">
        PDF, JPEG, PNG, GIF or WebP. Up to 10 files, 10 MiB each, 50 MiB total.
      </p>
      <div className="rounded-lg border border-dashed p-4 space-y-3">
        <Upload className="size-5 text-muted-foreground" aria-hidden="true" />
        <Input
          id="attachments"
          name="attachments"
          type="file"
          multiple
          accept="application/pdf,image/jpeg,image/png,image/gif,image/webp"
          aria-describedby="attachment-help"
          onChange={(event) => {
            setFiles([...(event.target.files ?? [])]);
          }}
        />
      </div>
      {files.map((file, index) => (
        <Attachment key={index}>
          <AttachmentMedia>
            <FileText />
          </AttachmentMedia>
          <AttachmentContent>
            <AttachmentTitle>{file.name}</AttachmentTitle>
            <AttachmentDescription>{(file.size / 1024).toFixed(0)} KiB</AttachmentDescription>
          </AttachmentContent>
        </Attachment>
      ))}
    </div>
  );
}
