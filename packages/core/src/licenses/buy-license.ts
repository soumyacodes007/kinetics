export interface LicenseBuyer {
  buyLicense(packId: number | bigint, buyerPubkey: string | Uint8Array, priceWei: bigint): Promise<string>;
}

export async function buyLicense(args: {
  packId: number | bigint;
  buyerPubkey: string | Uint8Array;
  priceWei: bigint;
  licenseRegistry: LicenseBuyer;
}): Promise<string> {
  return args.licenseRegistry.buyLicense(args.packId, args.buyerPubkey, args.priceWei);
}
