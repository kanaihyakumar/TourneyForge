const encoder = new TextEncoder();

const textBytes = (value: string): number => encoder.encode(value).length;

export function estimateBytes(value: unknown): number {
  if (value === null || value === undefined) return 1;
  if (typeof value === 'string') return textBytes(value) + 1;
  if (typeof value === 'number') return 8;
  if (typeof value === 'boolean') return 1;
  if (Array.isArray(value))
    return value.reduce<number>((sum, item) => sum + estimateBytes(item), 0);
  return Object.entries(value as Record<string, unknown>).reduce(
    (sum, [key, item]) => sum + textBytes(key) + 1 + estimateBytes(item),
    0,
  );
}

export function estimateDocBytes(collectionId: string, docId: string, data: unknown): number {
  return textBytes(collectionId) + 1 + textBytes(docId) + 1 + estimateBytes(data) + 32;
}

export function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  const units = ['KB', 'MB', 'GB'];
  let value = bytes / 1024;
  let unit = 0;
  while (value >= 1024 && unit < units.length - 1) {
    value /= 1024;
    unit++;
  }
  return `${value.toFixed(value >= 100 ? 0 : 1)} ${units[unit]}`;
}
