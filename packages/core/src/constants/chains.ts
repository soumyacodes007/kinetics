import { KINETICS_DEPLOYED_ADDRESSES } from "@kinetics/abi";

export interface KineticsChainAddresses {
  MemoryPass: string;
  MemoryRegistry: string;
  KnowledgePackNFT: string;
  PackLicenseRegistry: string;
}

export interface KineticsChainConfig {
  chainId: number;
  name: string;
  rpcUrl: string;
  storageIndexer: string;
  explorerUrl: string;
  contracts: KineticsChainAddresses;
}

export const KINETICS_0G_TESTNET: KineticsChainConfig = {
  chainId: 16602,
  name: "0g-testnet",
  rpcUrl: "https://evmrpc-testnet.0g.ai",
  storageIndexer: "https://indexer-storage-testnet-turbo.0g.ai",
  explorerUrl: "https://chainscan-galileo.0g.ai",
  contracts: KINETICS_DEPLOYED_ADDRESSES
};

export { KINETICS_DEPLOYED_ADDRESSES };
