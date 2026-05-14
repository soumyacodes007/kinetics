import { MemoryPassState, PackKind, PackPreviewManifest, VaultSnapshot } from "@kinetics/core";

const ZERO_HEX_32 = `0x${"00".repeat(32)}`;

export interface SearchablePack {
  packId: number;
  active: boolean;
  manifest: PackPreviewManifest;
  priceWei: string;
  licenseDurationSeconds: number;
}

export interface NormalizedProofEntry {
  leaf: string;
  proof: string[];
  merkleRoot: string;
}

export function toJsonValue(value: unknown): unknown {
  if (typeof value === "bigint") {
    return value.toString();
  }

  if (Array.isArray(value)) {
    return value.map((item) => toJsonValue(item));
  }

  if (value && typeof value === "object") {
    return Object.fromEntries(
      Object.entries(value as Record<string, unknown>).map(([key, item]) => [key, toJsonValue(item)])
    );
  }

  return value;
}

export function toJsonText(value: unknown): string {
  return JSON.stringify(toJsonValue(value), null, 2);
}

export function packKindFromContract(value: number): PackKind {
  if (value === 1) return "knowledge_only";
  if (value === 2) return "hybrid";
  return "skill_only";
}

export function buildMemoryStats(passState: MemoryPassState, active: boolean, snapshot: VaultSnapshot) {
  const byType = {
    episodic: 0,
    semantic: 0,
    procedural: 0,
    working: 0
  };

  for (const entry of snapshot.entries) {
    byType[entry.memoryType] += 1;
  }

  const recent = [...snapshot.entries]
    .sort((left, right) => right.createdAt - left.createdAt)
    .slice(0, 5)
    .map((entry) => ({
      memoryId: entry.memoryId,
      title: entry.title,
      summary: entry.summary,
      memoryType: entry.memoryType,
      tags: entry.tags,
      namespaces: entry.namespaces,
      createdAt: entry.createdAt
    }));

  return {
    vaultId: Number(passState.vaultId),
    planId: Number(passState.planId),
    active,
    expiresAt: Number(passState.expiresAt),
    latestIndexVersion: Number(passState.latestIndexVersion),
    latestIndexRoot: passState.latestIndexRoot,
    latestIndexBlobRoot: passState.latestIndexBlobRoot,
    storageQuotaBytes: Number(passState.storageQuotaBytes),
    writeQuotaPerPeriod: Number(passState.writeQuotaPerPeriod),
    snapshotVersion: snapshot.version,
    bytesUsed: snapshot.bytesUsed,
    writeCountCurrentPeriod: snapshot.writeCountCurrentPeriod,
    totalEntries: snapshot.entries.length,
    staleEntries: snapshot.entries.filter((entry) => entry.stale).length,
    byType,
    recent
  };
}

export function buildMemorySummaryText(snapshot: VaultSnapshot): string {
  if (snapshot.entries.length === 0) {
    return "No private memories are stored in the vault yet.";
  }

  const typeCounts = snapshot.entries.reduce<Record<string, number>>((acc, entry) => {
    acc[entry.memoryType] = (acc[entry.memoryType] ?? 0) + 1;
    return acc;
  }, {});

  const namespaceCounts = snapshot.entries.reduce<Record<string, number>>((acc, entry) => {
    for (const namespace of entry.namespaces) {
      acc[namespace] = (acc[namespace] ?? 0) + 1;
    }
    return acc;
  }, {});

  const recentTitles = [...snapshot.entries]
    .sort((left, right) => right.createdAt - left.createdAt)
    .slice(0, 5)
    .map((entry) => `- ${entry.title} [${entry.memoryType}]`)
    .join("\n");

  return [
    `Vault snapshot version ${snapshot.version} contains ${snapshot.entries.length} memories.`,
    `By type: ${Object.entries(typeCounts)
      .map(([key, count]) => `${key}=${count}`)
      .join(", ")}.`,
    `Top namespaces: ${Object.entries(namespaceCounts)
      .sort((left, right) => right[1] - left[1])
      .slice(0, 5)
      .map(([key, count]) => `${key}=${count}`)
      .join(", ")}.`,
    "Most recent memories:",
    recentTitles
  ].join("\n");
}

export function filterSearchablePacks(
  packs: SearchablePack[],
  keyword: string,
  tags: string[],
  packKind: PackKind | ""
): SearchablePack[] {
  const normalizedKeyword = keyword.trim().toLowerCase();
  const normalizedTags = tags.map((tag) => tag.trim().toLowerCase()).filter(Boolean);

  return packs.filter((pack) => {
    if (!pack.active) {
      return false;
    }

    if (packKind && pack.manifest.packKind !== packKind) {
      return false;
    }

    if (normalizedTags.length > 0) {
      const manifestTags = pack.manifest.tags.map((tag) => tag.toLowerCase());
      if (!normalizedTags.every((tag) => manifestTags.includes(tag))) {
        return false;
      }
    }

    if (!normalizedKeyword) {
      return true;
    }

    const haystack = [
      pack.manifest.slug,
      pack.manifest.title,
      pack.manifest.shortDescription,
      ...pack.manifest.tags,
      ...pack.manifest.keywords
    ]
      .join(" ")
      .toLowerCase();

    return haystack.includes(normalizedKeyword);
  });
}

export function normalizeProofInput(value: unknown): NormalizedProofEntry[] {
  if (!value || typeof value !== "object") {
    throw new Error("Proof payload must be a JSON object");
  }

  const objectValue = value as Record<string, unknown>;

  if (Array.isArray(objectValue.results)) {
    return objectValue.results.flatMap((result) => normalizeProofInput(result));
  }

  if (objectValue.proof && typeof objectValue.proof === "object") {
    const proofValue = objectValue.proof as Record<string, unknown>;
    return [
      {
        leaf: String(proofValue.leaf ?? ""),
        proof: Array.isArray(proofValue.proof) ? proofValue.proof.map(String) : [],
        merkleRoot: String(proofValue.merkleRoot ?? proofValue.root ?? objectValue.merkleRoot ?? ZERO_HEX_32)
      }
    ];
  }

  if (Array.isArray(objectValue.proof) || typeof objectValue.leaf === "string") {
    return [
      {
        leaf: String(objectValue.leaf ?? ""),
        proof: Array.isArray(objectValue.proof) ? objectValue.proof.map(String) : [],
        merkleRoot: String(objectValue.merkleRoot ?? objectValue.root ?? ZERO_HEX_32)
      }
    ];
  }

  throw new Error("Proof payload did not contain a recognized proof structure");
}
