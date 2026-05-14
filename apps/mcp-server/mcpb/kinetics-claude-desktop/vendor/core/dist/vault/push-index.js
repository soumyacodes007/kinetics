import { keccak256, toUtf8Bytes } from "ethers";
import { getMerkleRoot } from "../merkle/tree.js";
import { uploadEncryptedSnapshot } from "../storage/snapshots.js";
export function computeVaultMerkleRoot(snapshot) {
    return getMerkleRoot(snapshot.entries.map((entry) => entry.blobRoot));
}
export function computeLocalDaCommitment(snapshotBlobRoot, snapshotVersion) {
    return keccak256(toUtf8Bytes(`local:${snapshotBlobRoot}:v${snapshotVersion}`));
}
export async function publishVaultSnapshot(args) {
    const merkleRoot = computeVaultMerkleRoot(args.snapshot);
    const uploaded = await uploadEncryptedSnapshot(args.storage, { ...args.snapshot, merkleRoot }, args.vaultMasterKey);
    const latestIndex = await args.memoryPass.setLatestIndex(args.passState.vaultId, args.snapshot.version, merkleRoot, uploaded.rootHash);
    return {
        snapshotBlobRoot: uploaded.rootHash,
        latestIndexTxHash: latestIndex.transactionHash,
        merkleRoot
    };
}
export async function pushVaultIndex(args) {
    const published = await publishVaultSnapshot({
        snapshot: args.snapshot,
        storage: args.storage,
        vaultMasterKey: args.vaultMasterKey,
        memoryPass: args.memoryPass,
        passState: args.passState
    });
    const daCommitment = args.daCommitment ?? computeLocalDaCommitment(published.snapshotBlobRoot, args.snapshot.version);
    const registryTxHash = await args.memoryRegistry.updateRoot(published.merkleRoot, daCommitment);
    return {
        snapshotBlobRoot: published.snapshotBlobRoot,
        latestIndexTxHash: published.latestIndexTxHash,
        registryTxHash,
        daCommitment,
        merkleRoot: published.merkleRoot
    };
}
//# sourceMappingURL=push-index.js.map