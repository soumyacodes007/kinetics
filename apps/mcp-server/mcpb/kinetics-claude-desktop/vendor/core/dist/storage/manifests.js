import { decryptJson } from "../crypto/decrypt.js";
import { encryptJson } from "../crypto/encrypt.js";
export async function uploadPreviewManifest(storage, manifest) {
    return storage.uploadBytes(new TextEncoder().encode(JSON.stringify(manifest)), `${manifest.slug}-preview.json`);
}
export async function readPreviewManifest(storage, rootHash) {
    const bytes = await storage.readBytes(rootHash);
    return JSON.parse(new TextDecoder().decode(bytes));
}
export async function uploadEncryptedPackBundle(storage, bundle, packVersionKey) {
    const ciphertextHex = await encryptJson(bundle, packVersionKey);
    return storage.uploadBytes(new TextEncoder().encode(ciphertextHex), `pack-${bundle.packId}-v${bundle.version}.enc`);
}
export async function readEncryptedPackBundle(storage, rootHash, packVersionKey) {
    const bytes = await storage.readBytes(rootHash);
    const ciphertextHex = new TextDecoder().decode(bytes);
    return decryptJson(ciphertextHex, packVersionKey);
}
export async function uploadBuyerAccessGrant(storage, grant) {
    return storage.uploadBytes(new TextEncoder().encode(JSON.stringify(grant)), `grant-${grant.licenseId}-v${grant.version}.json`);
}
export async function readBuyerAccessGrant(storage, rootHash) {
    const bytes = await storage.readBytes(rootHash);
    return JSON.parse(new TextDecoder().decode(bytes));
}
//# sourceMappingURL=manifests.js.map