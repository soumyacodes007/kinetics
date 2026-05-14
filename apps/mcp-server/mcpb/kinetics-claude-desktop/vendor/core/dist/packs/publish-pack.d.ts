import { WritableStorage } from "../storage/upload.js";
import { EncryptedPackBundlePayload, PackPreviewManifest } from "../types/pack.js";
export interface PackPublisher {
    mintPack(slug: string, packKind: number, previewRoot: string, bundleRoot: string): Promise<string>;
    publishVersion(packId: number | bigint, version: number | bigint, previewRoot: string, bundleRoot: string): Promise<string>;
    setSaleTerms(packId: number | bigint, priceWei: bigint, licenseDurationSeconds: bigint, active: boolean): Promise<string>;
}
export declare function publishPack(args: {
    manifest: PackPreviewManifest;
    bundle: EncryptedPackBundlePayload;
    storage: WritableStorage;
    chain: PackPublisher;
    existingPackId?: number;
    existingVersion?: number;
    packVersionKeyHex?: string;
}): Promise<{
    previewRoot: string;
    bundleRoot: string;
    versionKeyHex: string;
}>;
//# sourceMappingURL=publish-pack.d.ts.map