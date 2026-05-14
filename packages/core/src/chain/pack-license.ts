import { TransactionReceipt, TransactionResponse, toUtf8Bytes } from "ethers";
import { ContractClientsConfig, getContract } from "./common.js";
import { ensureHex, ensureHex32 } from "../utils/hex.js";
import { PackLicenseState } from "../types/license.js";

async function waitForReceipt(tx: TransactionResponse): Promise<string> {
  const receipt = (await tx.wait()) as TransactionReceipt | null;
  return receipt?.hash ?? tx.hash;
}

export class PackLicenseClient {
  constructor(private readonly config: ContractClientsConfig) {}

  private contract() {
    return getContract("PackLicenseRegistry", this.config);
  }

  async getLicense(licenseId: number | bigint): Promise<PackLicenseState> {
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

  async buyLicense(packId: number | bigint, buyerPubkey: string | Uint8Array, priceWei: bigint): Promise<string> {
    const bytes = typeof buyerPubkey === "string" ? toUtf8Bytes(buyerPubkey) : buyerPubkey;
    const tx = await this.contract().buyLicense(packId, bytes, { value: priceWei });
    return waitForReceipt(tx);
  }

  async renewLicense(licenseId: number | bigint, priceWei: bigint): Promise<string> {
    const tx = await this.contract().renewLicense(licenseId, { value: priceWei });
    return waitForReceipt(tx);
  }

  async hasActiveLicense(packId: number | bigint, buyer: string): Promise<boolean> {
    return this.contract().hasActiveLicense(packId, buyer);
  }

  async publishAccessGrant(licenseId: number | bigint, grantVersion: number | bigint, grantRoot: string): Promise<string> {
    const tx = await this.contract().publishAccessGrant(licenseId, grantVersion, ensureHex32(grantRoot));
    return waitForReceipt(tx);
  }
}
