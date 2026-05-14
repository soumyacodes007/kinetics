import { TransactionReceipt, TransactionResponse } from "ethers";
import { ContractClientsConfig, getContract } from "./common.js";
import { LatestIndexReceipt, MemoryPassPlan, MemoryPassState } from "../types/pass.js";
import { ensureHex32 } from "../utils/hex.js";

async function waitForReceipt(tx: TransactionResponse): Promise<string> {
  const receipt = (await tx.wait()) as TransactionReceipt | null;
  return receipt?.hash ?? tx.hash;
}

export class MemoryPassClient {
  constructor(private readonly config: ContractClientsConfig) {}

  private contract() {
    return getContract("MemoryPass", this.config);
  }

  async getPlan(planId: number | bigint): Promise<MemoryPassPlan> {
    const plan = await this.contract().passPlans(planId);
    return {
      durationSeconds: plan[0],
      storageQuotaBytes: plan[1],
      writeQuotaPerPeriod: plan[2],
      periodSeconds: plan[3],
      priceWei: plan[4],
      active: plan[5]
    };
  }

  async getPassByOwner(owner: string): Promise<MemoryPassState> {
    const state = await this.contract().getPassByOwner(owner);
    return {
      vaultId: state[0],
      owner: state[1],
      planId: state[2],
      expiresAt: state[3],
      storageQuotaBytes: state[4],
      writeQuotaPerPeriod: state[5],
      latestIndexVersion: state[6],
      latestIndexRoot: ensureHex32(state[7]),
      latestIndexBlobRoot: ensureHex32(state[8])
    };
  }

  async buyPass(planId: number | bigint, priceWei: bigint): Promise<{ vaultId: bigint; transactionHash: string }> {
    const tx = await this.contract().buyPass(planId, { value: priceWei });
    const transactionHash = await waitForReceipt(tx);
    return {
      vaultId: BigInt(0),
      transactionHash
    };
  }

  async renewPass(vaultId: number | bigint, planId: number | bigint, priceWei: bigint): Promise<string> {
    const tx = await this.contract().renewPass(vaultId, planId, { value: priceWei });
    return waitForReceipt(tx);
  }

  async isPassActive(vaultId: number | bigint): Promise<boolean> {
    return this.contract().isPassActive(vaultId);
  }

  async setLatestIndex(
    vaultId: number | bigint,
    version: number | bigint,
    indexRoot: string,
    indexBlobRoot: string
  ): Promise<LatestIndexReceipt> {
    const tx = await this.contract().setLatestIndex(vaultId, version, ensureHex32(indexRoot), ensureHex32(indexBlobRoot));
    return {
      vaultId: BigInt(vaultId),
      version: BigInt(version),
      indexRoot: ensureHex32(indexRoot),
      indexBlobRoot: ensureHex32(indexBlobRoot),
      transactionHash: await waitForReceipt(tx)
    };
  }
}
