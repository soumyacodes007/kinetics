import { decryptJson } from "../crypto/decrypt.js";
import { encryptJson } from "../crypto/encrypt.js";
import { BuyerAccessGrant } from "../types/license.js";
import { EncryptedPackBundlePayload, PackPreviewManifest } from "../types/pack.js";
import { ReadableStorage } from "./download.js";
import { WritableStorage } from "./upload.js";

export async function uploadPreviewManifest(
  storage: WritableStorage,
  manifest: PackPreviewManifest
): Promise<{ rootHash: string; transactionHash: string }> {
  return storage.uploadBytes(new TextEncoder().encode(JSON.stringify(manifest)), `${manifest.slug}-preview.json`);
}

export async function readPreviewManifest(storage: ReadableStorage, rootHash: string): Promise<PackPreviewManifest> {
  const bytes = await storage.readBytes(rootHash);
  return JSON.parse(new TextDecoder().decode(bytes)) as PackPreviewManifest;
}

export async function uploadEncryptedPackBundle(
  storage: WritableStorage,
  bundle: EncryptedPackBundlePayload,
  packVersionKey: Uint8Array
): Promise<{ rootHash: string; transactionHash: string }> {
  const ciphertextHex = await encryptJson(bundle, packVersionKey);
  return storage.uploadBytes(new TextEncoder().encode(ciphertextHex), `pack-${bundle.packId}-v${bundle.version}.enc`);
}

export async function readEncryptedPackBundle(
  storage: ReadableStorage,
  rootHash: string,
  packVersionKey: Uint8Array
): Promise<EncryptedPackBundlePayload> {
  const bytes = await storage.readBytes(rootHash);
  const ciphertextHex = new TextDecoder().decode(bytes);
  return decryptJson<EncryptedPackBundlePayload>(ciphertextHex, packVersionKey);
}

export async function uploadBuyerAccessGrant(
  storage: WritableStorage,
  grant: BuyerAccessGrant
): Promise<{ rootHash: string; transactionHash: string }> {
  return storage.uploadBytes(new TextEncoder().encode(JSON.stringify(grant)), `grant-${grant.licenseId}-v${grant.version}.json`);
}

export async function readBuyerAccessGrant(storage: ReadableStorage, rootHash: string): Promise<BuyerAccessGrant> {
  const bytes = await storage.readBytes(rootHash);
  return JSON.parse(new TextDecoder().decode(bytes)) as BuyerAccessGrant;
}
