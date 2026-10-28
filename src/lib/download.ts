export function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = filename;
  try {
    anchor.click();
  } finally {
    setTimeout(() => {
      URL.revokeObjectURL(url);
    }, 1000);
  }
}
