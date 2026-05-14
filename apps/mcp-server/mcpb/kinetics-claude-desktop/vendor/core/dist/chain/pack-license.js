import { toUtf8Bytes } from "ethers";
import { getContract } from "./common.js";
import { ensureHex, ensureHex32 } from "../utils/hex.js";
async function waitForReceipt(tx) {
    const receipt = (await tx.wait());
    return receipt?.hash ?? tx.hash;
}
export class PackLicenseClient {
    config;
    constructor(config) {
        this.config = config;
    }
    contract() {
        return getContract("PackLicenseRegistry", this.config);
    }
    async getLicense(licenseId) {
        const state = await this.contract().getLicense(licenseId);
        return {
            licenseId: state[0],
            packId: state[1],
            buyer: state[2],
            startsAt: state[3],
            expiresAt: state[4],
            buyerPubkey: ensureHex(state[5]),
            latestGrantVersion: state[6],
            latestGrantRoot: ensureHex32(state[7]),
            active: state[8]
        };
    }
    async getBuyerLicenseIds(buyer) {
        return this.contract().getBuyerLicenseIds(buyer);
    }
    async getTotalSupply() {
        return this.contract().totalSupply();
    }
    async getCreatorBalance(creator) {
        return this.contract().creatorBalances(creator);
    }
    async getLicenseIdForPackBuyer(packId, buyer) {
        return this.contract().packBuyerToLicenseId(packId, buyer);
    }
    async buyLicense(packId, buyerPubkey, priceWei) {
        const bytes = typeof buyerPubkey === "string" ? toUtf8Bytes(buyerPubkey) : buyerPubkey;
        const tx = await this.contract().buyLicense(packId, bytes, { value: priceWei });
        return waitForReceipt(tx);
    }
    async renewLicense(licenseId, priceWei) {
        const tx = await this.contract().renewLicense(licenseId, { value: priceWei });
        return waitForReceipt(tx);
    }
    async hasActiveLicense(packId, buyer) {
        return this.contract().hasActiveLicense(packId, buyer);
    }
    async publishAccessGrant(licenseId, grantVersion, grantRoot) {
        const tx = await this.contract().publishAccessGrant(licenseId, grantVersion, ensureHex32(grantRoot));
        return waitForReceipt(tx);
    }
}
//# sourceMappingURL=pack-license.js.map