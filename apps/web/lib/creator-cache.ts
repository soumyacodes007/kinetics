export interface CreatorPackVersionRecord {
  packId: number;
  version: number;
  previewRoot: string;
  bundleRoot: string;
  versionKeyHex: string;
  slug: string;
  title: string;
  updatedAt: number;
}

function keyFor(address: string): string {
  return `kinetics:creator:${address.toLowerCase()}:versions`;
}

export function loadCreatorVersions(address: string): CreatorPackVersionRecord[] {
  if (typeof window === "undefined") {
    return [];
  }

  try {
    const raw = window.localStorage.getItem(keyFor(address));
    if (!raw) {
      return [];
    }

    return JSON.parse(raw) as CreatorPackVersionRecord[];
  } catch {
    return [];
  }
}

export function saveCreatorVersion(address: string, record: CreatorPackVersionRecord): CreatorPackVersionRecord[] {
  const current = loadCreatorVersions(address);
  const next = [
    ...current.filter((entry) => !(entry.packId === record.packId && entry.version === record.version)),
    record
  ].sort((left, right) => left.packId - right.packId || left.version - right.version);

  window.localStorage.setItem(keyFor(address), JSON.stringify(next));
  return next;
}

export function findCreatorVersion(address: string, packId: number, version: number): CreatorPackVersionRecord | null {
  return loadCreatorVersions(address).find((entry) => entry.packId === packId && entry.version === version) ?? null;
}
