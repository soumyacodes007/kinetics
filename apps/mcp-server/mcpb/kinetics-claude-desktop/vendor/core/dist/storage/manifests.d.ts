import { BuyerAccessGrant } from "../types/license.js";
import { EncryptedPackBundlePayload, PackPreviewManifest } from "../types/pack.js";
import { ReadableStorage } from "./download.js";
import { WritableStorage } from "./upload.js";
export declare function uploadPreviewManifest(storage: WritableStorage, manifest: PackPreviewManifest): Promise<{
    rootHash: string;
    transactionHash: string;
}>;
export declare function readPreviewManifest(storage: ReadableStorage, rootHash: string): Promise<PackPreviewManifest>;
export declare function uploadEncryptedPackBundle(storage: WritableStorage, bundle: EncryptedPackBundlePayload, packVersionKey: Uint8Array): Promise<{
    rootHash: string;
    transactionHash: string;
}>;
export declare function readEncryptedPackBundle(storage: ReadableStorage, rootHash: string, packVersionKey: Uint8Array): Promise<EncryptedPackBundlePayload>;
export declare function uploadBuyerAccessGrant(storage: WritableStorage, grant: BuyerAccessGrant): Promise<{
    rootHash: string;
    transactionHash: string;
}>;
export declare function readBuyerAccessGrant(storage: ReadableStorage, rootHash: string): Promise<BuyerAccessGrant>;
//# sourceMappingURL=manifests.d.ts.map