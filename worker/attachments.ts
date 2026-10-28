import { HTTPException } from 'hono/http-exception';
import { uploadLimits } from '../shared/limits';
import { validatePdf } from './pdf';

export async function validateAttachment(file: File) {
  if (file.type === 'application/pdf')
    return { ...(await validatePdf(file)), contentType: file.type };
  if (file.size === 0 || file.size > uploadLimits.pdfBytes)
    throw new HTTPException(400, { message: 'Each attachment must be between 1 byte and 10 MiB.' });
  const bytes = await file.arrayBuffer();
  const data = new Uint8Array(bytes);
  const starts = (...signature: number[]) =>
    signature.every((value, index) => data[index] === value);
  const text = new TextDecoder().decode(bytes.slice(0, 12));
  const valid =
    (file.type === 'image/png' && starts(137, 80, 78, 71, 13, 10, 26, 10)) ||
    (file.type === 'image/jpeg' && starts(255, 216, 255)) ||
    (file.type === 'image/gif' && /^GIF8[79]a/u.test(text)) ||
    (file.type === 'image/webp' && text.startsWith('RIFF') && text.slice(8) === 'WEBP');
  if (!valid)
    throw new HTTPException(400, { message: 'Upload a valid PDF, JPEG, PNG, GIF or WebP image.' });
  const digest = await crypto.subtle.digest('SHA-256', bytes);
  return {
    bytes,
    contentType: file.type,
    sha256: [...new Uint8Array(digest)].map((byte) => byte.toString(16).padStart(2, '0')).join(''),
  };
}
