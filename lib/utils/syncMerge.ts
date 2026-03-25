export interface SyncRecord {
  id: string;
  updatedAt: number;
  deletedAt?: number | null;
  [key: string]: any;
}

export function mergeRecordsLww(
  local: SyncRecord[],
  remote: SyncRecord[],
): SyncRecord[] {
  const map = new Map<string, SyncRecord>();

  for (const r of local) {
    map.set(r.id, r);
  }

  for (const r of remote) {
    const existing = map.get(r.id);
    if (!existing) {
      map.set(r.id, r);
      continue;
    }

    if ((r.updatedAt || 0) >= (existing.updatedAt || 0)) {
      map.set(r.id, r);
    }
  }

  return [...map.values()];
}

export function filterActiveRecords(records: SyncRecord[]): SyncRecord[] {
  return records.filter((r) => !r.deletedAt);
}
