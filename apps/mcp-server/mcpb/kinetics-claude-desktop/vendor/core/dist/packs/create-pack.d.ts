import { EncryptedPackBundlePayload, PackPreviewManifest, PackKind } from "../types/pack.js";
export interface CreatePackDraftInput {
    slug: string;
    title: string;
    shortDescription: string;
    packKind: PackKind;
    tags: string[];
    keywords: string[];
    previewFiles: string[];
    files: EncryptedPackBundlePayload["files"];
    knowledgeDocs?: EncryptedPackBundlePayload["knowledgeDocs"];
    mountInstructions: EncryptedPackBundlePayload["mountInstructions"];
    changelog?: string;
    priceWei: string;
    licenseDurationDays: number;
    creator: string;
    now?: number;
}
export declare function createPackDraft(input: CreatePackDraftInput): {
    manifest: PackPreviewManifest;
    bundle: EncryptedPackBundlePayload;
};
//# sourceMappingURL=create-pack.d.ts.map