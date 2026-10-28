import { pdfSizeLabel, uploadLimits } from '../shared/limits';
import { HTTPException } from 'hono/http-exception';

export async function validatePdf(file: File) {
  if (file.size === 0 || file.size > uploadLimits.pdfBytes) {
    throw new HTTPException(400, { message: `PDF must be between 1 byte and ${pdfSizeLabel}.` });
  }
  if (file.type !== 'application/pdf' || !file.name.toLowerCase().endsWith('.pdf')) {
    throw new HTTPException(400, { message: 'Upload a PDF file.' });
  }
  const bytes = await file.arrayBuffer();
  const header = new TextDecoder().decode(bytes.slice(0, 8));
  const trailer = new TextDecoder().decode(bytes.slice(-1024));
  if (!/^%PDF-(?:1\.[0-7]|2\.0)/u.test(header) || !trailer.includes('%%EOF')) {
    throw new HTTPException(400, { message: 'This file does not appear to be a valid PDF.' });
  }
  const digest = await crypto.subtle.digest('SHA-256', bytes);
  const sha256 = [...new Uint8Array(digest)]
    .map((byte) => byte.toString(16).padStart(2, '0'))
    .join('');
  return { bytes, sha256 };
}
