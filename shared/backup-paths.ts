export const completedBackupPrefix = 'completed/';
export const backupPaths = {
  manifest: (id: string) => `runs/${id}/manifest.enc`,
  page: (id: string, index: number) => `runs/${id}/pages/${String(index)}.enc`,
  object: (id: string, hash: string) => `runs/${id}/objects/${hash}.enc`,
  completed: (id: string) => `${completedBackupPrefix}${id}.enc`,
};

export function isBackupObjectKey(id: string, storageKey: string) {
  const prefix = `runs/${id}/objects/`;
  return (
    storageKey.startsWith(prefix) && /^[a-f0-9]{64}\.enc$/u.test(storageKey.slice(prefix.length))
  );
}
