export interface LicenseBuyer {
    buyLicense(packId: number | bigint, buyerPubkey: string | Uint8Array, priceWei: bigint): Promise<string>;
}
export declare function buyLicense(args: {
    packId: number | bigint;
    buyerPubkey: string | Uint8Array;
    priceWei: bigint;
    licenseRegistry: LicenseBuyer;
}): Promise<string>;
//# sourceMappingURL=buy-license.d.ts.map