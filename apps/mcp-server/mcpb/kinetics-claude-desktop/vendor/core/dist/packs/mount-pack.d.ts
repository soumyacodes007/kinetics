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
export declare function mountPack(args: {
    licenseId: number | bigint;
    buyer: string;
    licenseRegistry: LicenseReader;
    knowledgePack: PackManifestReader;
    storage: ReadableStorage;
}): Promise<MountedPack>;
//# sourceMappingURL=mount-pack.d.ts.map