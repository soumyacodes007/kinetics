import { hexToBytes } from "../utils/hex.js";
import { createPackVersionKey } from "../utils/ids.js";
import { uploadEncryptedPackBundle, uploadPreviewManifest } from "../storage/manifests.js";
import { WritableStorage } from "../storage/upload.js";
import { EncryptedPackBundlePayload, PackPreviewManifest } from "../types/pack.js";

export interface PackPublisher {
  mintPack(slug: string, packKind: number, previewRoot: string, bundleRoot: string): Promise<string>;
  publishVersion(packId: number | bigint, version: number | bigint, previewRoot: string, bundleRoot: string): Promise<string>;
  setSaleTerms(packId: number | bigint, priceWei: bigint, licenseDurationSeconds: bigint, active: boolean): Promise<string>;
}

function packKindToContractValue(packKind: PackPreviewManifest["packKind"]): number {
  if (packKind === "knowledge_only") return 1;
  if (packKind === "hybrid") return 2;
  return 0;
}

export async function publishPack(args: {
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
}> {
  const versionKeyHex = args.packVersionKeyHex ?? createPackVersionKey();
  const previewUpload = await uploadPreviewManifest(args.storage, args.manifest);
  const bundleUpload = await uploadEncryptedPackBundle(args.storage, args.bundle, hexToBytes(versionKeyHex));

  if (args.existingPackId && args.existingVersion) {
    await args.chain.publishVersion(args.existingPackId, args.existingVersion, previewUpload.rootHash, bundleUpload.rootHash);
    await args.chain.setSaleTerms(
      args.existingPackId,
      BigInt(args.manifest.priceWei),
      BigInt(args.manifest.licenseDurationDays * 24 * 60 * 60),
      true
    );
  } else {
    await args.chain.mintPack(
      args.manifest.slug,
      packKindToContractValue(args.manifest.packKind),
      previewUpload.rootHash,
      bundleUpload.rootHash
    );
  }

  return {
    previewRoot: previewUpload.rootHash,
    bundleRoot: bundleUpload.rootHash,
    versionKeyHex
  };
}
