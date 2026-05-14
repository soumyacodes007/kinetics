export async function buyLicense(args) {
    return args.licenseRegistry.buyLicense(args.packId, args.buyerPubkey, args.priceWei);
}
//# sourceMappingURL=buy-license.js.map