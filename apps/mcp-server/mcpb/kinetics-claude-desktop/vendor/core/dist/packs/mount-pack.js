import { hexToBytes } from "../utils/hex.js";
import { readBuyerAccessGrant, readEncryptedPackBundle, readPreviewManifest } from "../storage/manifests.js";
export async function mountPack(args) {
    const license = await args.licenseRegistry.getLicense(args.licenseId);
    const active = await args.licenseRegistry.hasActiveLicense(license.packId, args.buyer);
    if (!active) {
        throw new Error("License is not active");
    }
    const grant = await readBuyerAccessGrant(args.storage, license.latestGrantRoot);
    const manifest = await readPreviewManifest(args.storage, grant.previewRoot);
    const bundle = await readEncryptedPackBundle(args.storage, grant.bundleRoot, hexToBytes(grant.encryptedVersionKey));
    return {
        packId: grant.packId,
        version: grant.version,
        manifest,
        bundle,
        mountedAt: Math.floor(Date.now() / 1000)
    };
}
//# sourceMappingURL=mount-pack.js.map