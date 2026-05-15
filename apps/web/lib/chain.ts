import type { Signer } from "ethers";
import {
  KINETICS_0G_TESTNET,
  KnowledgePackClient,
  MemoryPassClient,
  MemoryRegistryClient,
  PackLicenseClient,
  type ContractClientsConfig
} from "@kinetics/core/browser";

export const KINETICS_CHAIN = KINETICS_0G_TESTNET;
export const ZERO_HEX_32 = `0x${"0".repeat(64)}`;

export function readConfig(): ContractClientsConfig {
  return {
    rpcUrl: KINETICS_CHAIN.rpcUrl
  };
}

export function signerConfig(signer: Signer): ContractClientsConfig {
  return {
    rpcUrl: KINETICS_CHAIN.rpcUrl,
    signer
  };
}

export function getMemoryPassClient(signer?: Signer) {
  return new MemoryPassClient(signer ? signerConfig(signer) : readConfig());
}

export function getMemoryRegistryClient(signer?: Signer) {
  return new MemoryRegistryClient(signer ? signerConfig(signer) : readConfig());
}

export function getKnowledgePackClient(signer?: Signer) {
  return new KnowledgePackClient(signer ? signerConfig(signer) : readConfig());
}

export function getPackLicenseClient(signer?: Signer) {
  return new PackLicenseClient(signer ? signerConfig(signer) : readConfig());
}

export function explorerTxUrl(hash: string): string {
  return `${KINETICS_CHAIN.explorerUrl}/tx/${hash}`;
}

export function explorerAddressUrl(address: string): string {
  return `${KINETICS_CHAIN.explorerUrl}/address/${address}`;
}
