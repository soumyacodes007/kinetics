function mergeEntry(existing, incoming) {
    return {
        ...existing,
        ...incoming,
        tags: [...new Set([...existing.tags, ...incoming.tags])],
        namespaces: [...new Set([...existing.namespaces, ...incoming.namespaces])],
        strength: Math.max(existing.strength, incoming.strength),
        lastAccessedAt: Math.max(existing.lastAccessedAt, incoming.lastAccessedAt),
        stale: existing.stale && incoming.stale
    };
}
export function syncVaultSnapshots(local, remote) {
    if (remote.version > local.version) {
        return remote;
    }
    if (local.version > remote.version) {
        return local;
    }
    const merged = new Map();
    for (const entry of local.entries) {
        merged.set(entry.memoryId, entry);
    }
    for (const entry of remote.entries) {
        merged.set(entry.memoryId, merged.has(entry.memoryId) ? mergeEntry(merged.get(entry.memoryId), entry) : entry);
    }
    return {
        ...local,
        bytesUsed: Math.max(local.bytesUsed, remote.bytesUsed),
        writeCountCurrentPeriod: Math.max(local.writeCountCurrentPeriod, remote.writeCountCurrentPeriod),
        merkleRoot: remote.merkleRoot || local.merkleRoot,
        entries: [...merged.values()].sort((left, right) => left.createdAt - right.createdAt)
    };
}
//# sourceMappingURL=sync.js.map