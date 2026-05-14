import { ContractClientsConfig } from "./common.js";
import { PackLicenseState } from "../types/license.js";
export declare class PackLicenseClient {
    private readonly config;
    constructor(config: ContractClientsConfig);
    private contract;
    getLicense(licenseId: number | bigint): Promise<PackLicenseState>;
    getBuyerLicenseIds(buyer: string): Promise<bigint[]>;
    getTotalSupply(): Promise<bigint>;
    getCreatorBalance(creator: string): Promise<bigint>;
    getLicenseIdForPackBuyer(packId: number | bigint, buyer: string): Promise<bigint>;
    buyLicense(packId: number | bigint, buyerPubkey: string | Uint8Array, priceWei: bigint): Promise<string>;
    renewLicense(licenseId: number | bigint, priceWei: bigint): Promise<string>;
    hasActiveLicense(packId: number | bigint, buyer: string): Promise<boolean>;
    publishAccessGrant(licenseId: number | bigint, grantVersion: number | bigint, grantRoot: string): Promise<string>;
}
//# sourceMappingURL=pack-license.d.ts.map