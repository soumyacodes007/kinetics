export interface PackLicenseState {
    licenseId: bigint;
    packId: bigint;
    buyer: string;
    startsAt: bigint;
    expiresAt: bigint;
    buyerPubkey: string;
    latestGrantVersion: bigint;
    latestGrantRoot: string;
    active: boolean;
}
export interface BuyerAccessGrant {
    licenseId: number;
    packId: number;
    version: number;
    previewRoot: string;
    bundleRoot: string;
    encryptedVersionKey: string;
    issuedAt: number;
    expiresAt: number;
}
//# sourceMappingURL=license.d.ts.map