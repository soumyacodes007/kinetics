import { TransactionReceipt, TransactionResponse } from "ethers";
import { ContractClientsConfig, getContract } from "./common.js";
import { ensureHex32 } from "../utils/hex.js";

export interface RegistryMemoryState {
  merkleRoot: string;
  blockNumber: bigint;
  daTxHash: string;
  timestamp: bigint;
}

async function waitForReceipt(tx: TransactionResponse): Promise<string> {
  const receipt = (await tx.wait()) as TransactionReceipt | null;
  return receipt?.hash ?? tx.hash;
}

export class MemoryRegistryClient {
  constructor(private readonly config: ContractClientsConfig) {}

  private contract() {
    return getContract("MemoryRegistry", this.config);
  }

  async updateRoot(merkleRoot: string, daTxHash: string): Promise<string> {
    const tx = await this.contract().updateRoot(ensureHex32(merkleRoot), ensureHex32(daTxHash));
    return waitForReceipt(tx);
  }

  async getLatest(agent: string): Promise<RegistryMemoryState> {
    const state = await this.contract().getLatest(agent);
    return {
      merkleRoot: ensureHex32(state[0]),
      blockNumber: state[1],
      daTxHash: ensureHex32(state[2]),
      timestamp: state[3]
    };
  }

  async historyLength(agent: string): Promise<bigint> {
    return this.contract().historyLength(agent);
  }

  async verifyInclusion(agent: string, leaf: string, proof: string[], root: string): Promise<boolean> {
    return this.contract().verifyInclusion(agent, ensureHex32(leaf), proof.map(ensureHex32), ensureHex32(root));
  }
}
