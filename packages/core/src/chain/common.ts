import { Contract, JsonRpcProvider, Signer } from "ethers";
import {
  KINETICS_DEPLOYED_ADDRESSES,
  KNOWLEDGE_PACK_NFT_ABI,
  MEMORY_PASS_ABI,
  MEMORY_REGISTRY_ABI,
  PACK_LICENSE_REGISTRY_ABI
} from "@kinetics/abi";

export interface ContractClientsConfig {
  rpcUrl: string;
  signer?: Signer;
  addresses?: Partial<Record<keyof typeof KINETICS_DEPLOYED_ADDRESSES, string>>;
}

export function getProvider(config: ContractClientsConfig): JsonRpcProvider {
  return new JsonRpcProvider(config.rpcUrl);
}

export function getContractAddress(
  name: keyof typeof KINETICS_DEPLOYED_ADDRESSES,
  config: ContractClientsConfig
): string {
  return config.addresses?.[name] ?? KINETICS_DEPLOYED_ADDRESSES[name];
}

export function getContract(name: "MemoryPass", config: ContractClientsConfig): Contract;
export function getContract(name: "MemoryRegistry", config: ContractClientsConfig): Contract;
export function getContract(name: "KnowledgePackNFT", config: ContractClientsConfig): Contract;
export function getContract(name: "PackLicenseRegistry", config: ContractClientsConfig): Contract;
export function getContract(name: keyof typeof KINETICS_DEPLOYED_ADDRESSES, config: ContractClientsConfig): Contract {
  const provider = getProvider(config);
  const signerWithProvider =
    config.signer && "provider" in config.signer && config.signer.provider
      ? config.signer
      : config.signer && "connect" in (config.signer as object)
        ? (config.signer as Signer & { connect(provider: JsonRpcProvider): Signer }).connect(provider)
        : config.signer;
  const runner = signerWithProvider ?? provider;

  switch (name) {
    case "MemoryPass":
      return new Contract(getContractAddress(name, config), MEMORY_PASS_ABI, runner);
    case "MemoryRegistry":
      return new Contract(getContractAddress(name, config), MEMORY_REGISTRY_ABI, runner);
    case "KnowledgePackNFT":
      return new Contract(getContractAddress(name, config), KNOWLEDGE_PACK_NFT_ABI, runner);
    case "PackLicenseRegistry":
      return new Contract(getContractAddress(name, config), PACK_LICENSE_REGISTRY_ABI, runner);
  }

  throw new Error(`Unsupported contract: ${String(name)}`);
}
