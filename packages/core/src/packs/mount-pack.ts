import { hexToBytes } from "../utils/hex.js";
import { readBuyerAccessGrant, readEncryptedPackBundle, readPreviewManifest } from "../storage/manifests.js";
import { MountedPack } from "../types/pack.js";
import { ReadableStorage } from "../storage/download.js";
import { PackLicenseState } from "../types/license.js";

export interface LicenseReader {
  getLicense(licenseId: number | bigint): Promise<PackLicenseState>;
  hasActiveLicense(packId: number | bigint, buyer: string): Promise<boolean>;
}

export interface PackManifestReader {
  getPack(packId: number | bigint): Promise<{
    currentPreviewRoot: string;
  }>;
}

export async function mountPack(args: {
  licenseId: number | bigint;
  buyer: string;
  licenseRegistry: LicenseReader;
  knowledgePack: PackManifestReader;
  storage: ReadableStorage;
}): Promise<MountedPack> {
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
