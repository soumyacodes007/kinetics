import { TransactionReceipt, TransactionResponse } from "ethers";
import { ContractClientsConfig, getContract } from "./common.js";
import { ensureHex32 } from "../utils/hex.js";

export interface PackState {
  packId: bigint;
  creator: string;
  slug: string;
  packKind: number;
  currentVersion: bigint;
  currentPreviewRoot: string;
  currentBundleRoot: string;
  priceWei: bigint;
  licenseDurationSeconds: bigint;
  active: boolean;
}

async function waitForReceipt(tx: TransactionResponse): Promise<string> {
  const receipt = (await tx.wait()) as TransactionReceipt | null;
  return receipt?.hash ?? tx.hash;
}

export class KnowledgePackClient {
  constructor(private readonly config: ContractClientsConfig) {}

  private contract() {
    return getContract("KnowledgePackNFT", this.config);
  }

  async getPack(packId: number | bigint): Promise<PackState> {
    const state = await this.contract().getPack(packId);
    return {
      packId: state[0],
      creator: state[1],
      slug: state[2],
      packKind: Number(state[3]),
      currentVersion: state[4],
      currentPreviewRoot: ensureHex32(state[5]),
      currentBundleRoot: ensureHex32(state[6]),
      priceWei: state[7],
      licenseDurationSeconds: state[8],
      active: state[9]
    };
  }

  async getTotalSupply(): Promise<bigint> {
    return this.contract().totalSupply();
  }

  async getCreatorPackIds(creator: string): Promise<bigint[]> {
    return this.contract().getCreatorPackIds(creator);
  }

  async mintPack(slug: string, packKind: number, previewRoot: string, bundleRoot: string): Promise<string> {
    const tx = await this.contract().mintPack(slug, packKind, ensureHex32(previewRoot), ensureHex32(bundleRoot));
    return waitForReceipt(tx);
  }

  async publishVersion(packId: number | bigint, version: number | bigint, previewRoot: string, bundleRoot: string): Promise<string> {
    const tx = await this.contract().publishVersion(packId, version, ensureHex32(previewRoot), ensureHex32(bundleRoot));
    return waitForReceipt(tx);
  }

  async setSaleTerms(packId: number | bigint, priceWei: bigint, licenseDurationSeconds: bigint, active: boolean): Promise<string> {
    const tx = await this.contract().setSaleTerms(packId, priceWei, licenseDurationSeconds, active);
    return waitForReceipt(tx);
  }
}
