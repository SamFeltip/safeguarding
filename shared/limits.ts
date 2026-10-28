const mebibyte = 1024 * 1024;
export const uploadLimits = {
  pdfBytes: 10 * mebibyte,
  requestBytes: 51 * mebibyte,
  attachmentCount: 10,
  totalAttachmentBytes: 50 * mebibyte,
  formCharacters: 16 * 1024,
  shortText: 120,
  email: 254,
  equipment: 1000,
  notes: 4000,
} as const;
export const storageLimits = { cursorCharacters: 2048, pageSize: 100 } as const;
export const backupLimits = { objectBytes: 16 * mebibyte, pageSize: 20 } as const;

export const pdfSizeLabel = `${String(uploadLimits.pdfBytes / mebibyte)} MiB`;
export const requestSizeLabel = `${String(uploadLimits.requestBytes / mebibyte)} MiB`;
