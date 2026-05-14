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
export declare const KINETICS_0G_TESTNET: KineticsChainConfig;
export { KINETICS_DEPLOYED_ADDRESSES };
//# sourceMappingURL=chains.d.ts.map