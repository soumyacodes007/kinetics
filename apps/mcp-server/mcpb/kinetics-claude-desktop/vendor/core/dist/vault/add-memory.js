import { deriveDefaultSummary, deriveDefaultTitle, createMemoryId } from "../utils/ids.js";
import { uniqueTokens } from "../utils/text.js";
import { encryptJson } from "../crypto/encrypt.js";
import { pullVaultIndex } from "./pull-index.js";
import { computeLocalDaCommitment, computeVaultMerkleRoot, pushVaultIndex } from "./push-index.js";
function deriveMetadata(text, metadata) {
    const title = metadata.title?.trim() || deriveDefaultTitle(text);
    const summary = metadata.summary?.trim() || deriveDefaultSummary(text);
    const tags = metadata.tags?.length ? [...new Set(metadata.tags)] : uniqueTokens(summary).slice(0, 5);
    const namespaces = metadata.namespaces?.length ? [...new Set(metadata.namespaces)] : ["personal"];
    return {
        title,
        summary,
        tags,
        namespaces
    };
}
function assertWritable(passState, snapshot, newBytes, now) {
    if (passState.expiresAt !== 0n && Number(passState.expiresAt) < now) {
        throw new Error("Memory pass is not active");
    }
    if (snapshot.writeCountCurrentPeriod >= Number(passState.writeQuotaPerPeriod)) {
        throw new Error("Memory pass write quota exceeded");
    }
    if (snapshot.bytesUsed + newBytes > Number(passState.storageQuotaBytes)) {
        throw new Error("Memory pass storage quota exceeded");
    }
}
function appendMemoryToSnapshot(args) {
    return {
        ...args.snapshot,
        vaultId: Number(args.passState.vaultId),
        version: args.snapshot.version + 1,
        bytesUsed: args.snapshot.bytesUsed + args.plaintextBytes.length,
        writeCountCurrentPeriod: args.snapshot.writeCountCurrentPeriod + 1,
        merkleRoot: args.snapshot.merkleRoot,
        entries: [
            ...args.snapshot.entries,
            {
                memoryId: args.memory.memoryId,
                blobRoot: args.blobRoot,
                memoryType: args.memory.memoryType,
                title: args.memory.plaintext.title,
                summary: args.memory.plaintext.summary,
                tags: args.memory.plaintext.tags,
                namespaces: args.memory.plaintext.namespaces,
                createdAt: args.memory.createdAt,
                lastAccessedAt: args.memory.createdAt,
                strength: 0.5,
                stale: false,
                sourceClient: args.memory.sourceClient
            }
        ]
    };
}
async function uploadEncryptedMemory(args) {
    const memory = {
        vaultId: Number(args.passState.vaultId),
        memoryId: createMemoryId(args.now * 1000),
        memoryType: args.memoryType,
        sourceClient: args.sourceClient,
        createdAt: args.now,
        updatedAt: args.now,
        plaintext: {
            title: args.metadata.title,
            text: args.text,
            summary: args.metadata.summary,
            tags: args.metadata.tags,
            namespaces: args.metadata.namespaces
        }
    };
    const plaintextBytes = new TextEncoder().encode(JSON.stringify(memory));
    const encryptedHex = await encryptJson(memory, args.vaultMasterKey);
    const blobUpload = await args.storage.uploadBytes(new TextEncoder().encode(encryptedHex), `${memory.memoryId}.enc`);
    return {
        memory,
        plaintextBytes,
        blobRoot: blobUpload.rootHash
    };
}
export async function addMemory(args) {
    const now = args.now ?? Math.floor(Date.now() / 1000);
    const passState = await args.memoryPass.getPassByOwner(args.owner);
    const snapshot = await pullVaultIndex({
        owner: args.owner,
        memoryPass: args.memoryPass,
        storage: args.storage,
        vaultMasterKey: args.vaultMasterKey
    });
    const normalized = deriveMetadata(args.text, args.metadata ?? {});
    const uploaded = await uploadEncryptedMemory({
        storage: args.storage,
        vaultMasterKey: args.vaultMasterKey,
        text: args.text,
        sourceClient: args.sourceClient,
        memoryType: args.memoryType ?? "episodic",
        metadata: normalized,
        passState,
        now
    });
    const plaintextBytes = uploaded.plaintextBytes;
    assertWritable(passState, snapshot, plaintextBytes.length, now);
    const nextSnapshot = appendMemoryToSnapshot({
        snapshot,
        passState,
        memory: uploaded.memory,
        plaintextBytes,
        blobRoot: uploaded.blobRoot
    });
    const pushed = await pushVaultIndex({
        snapshot: nextSnapshot,
        storage: args.storage,
        vaultMasterKey: args.vaultMasterKey,
        memoryPass: args.memoryPass,
        memoryRegistry: args.memoryRegistry,
        passState
    });
    return {
        memoryId: uploaded.memory.memoryId,
        blobRoot: uploaded.blobRoot,
        snapshotBlobRoot: pushed.snapshotBlobRoot,
        merkleRoot: pushed.merkleRoot,
        snapshotVersion: nextSnapshot.version,
        chain: {
            latestIndexTxHash: pushed.latestIndexTxHash,
            registryTxHash: pushed.registryTxHash,
            daCommitment: pushed.daCommitment
        }
    };
}
export async function addMemoryFast(args) {
    const now = args.now ?? Math.floor(Date.now() / 1000);
    const normalized = deriveMetadata(args.text, args.metadata ?? {});
    const uploaded = await uploadEncryptedMemory({
        storage: args.storage,
        vaultMasterKey: args.vaultMasterKey,
        text: args.text,
        sourceClient: args.sourceClient,
        memoryType: args.memoryType ?? "episodic",
        metadata: normalized,
        passState: args.passState,
        now
    });
    assertWritable(args.passState, args.snapshot, uploaded.plaintextBytes.length, now);
    const nextSnapshot = appendMemoryToSnapshot({
        snapshot: args.snapshot,
        passState: args.passState,
        memory: uploaded.memory,
        plaintextBytes: uploaded.plaintextBytes,
        blobRoot: uploaded.blobRoot
    });
    const merkleRoot = computeVaultMerkleRoot(nextSnapshot);
    nextSnapshot.merkleRoot = merkleRoot;
    const daCommitment = computeLocalDaCommitment(uploaded.blobRoot, nextSnapshot.version);
    const registryTxHash = await args.memoryRegistry.updateRoot(merkleRoot, daCommitment);
    return {
        memoryId: uploaded.memory.memoryId,
        blobRoot: uploaded.blobRoot,
        merkleRoot,
        snapshotVersion: nextSnapshot.version,
        chain: {
            registryTxHash,
            daCommitment
        },
        snapshot: nextSnapshot,
        pendingSnapshotSync: true
    };
}
//# sourceMappingURL=add-memory.js.map