import { ContractClientsConfig } from "./common.js";
export interface RegistryMemoryState {
    merkleRoot: string;
    blockNumber: bigint;
    daTxHash: string;
    timestamp: bigint;
}
export declare class MemoryRegistryClient {
    private readonly config;
    constructor(config: ContractClientsConfig);
    private contract;
    updateRoot(merkleRoot: string, daTxHash: string): Promise<string>;
    getLatest(agent: string): Promise<RegistryMemoryState>;
    historyLength(agent: string): Promise<bigint>;
    verifyInclusion(agent: string, leaf: string, proof: string[], root: string): Promise<boolean>;
}
//# sourceMappingURL=memory-registry.d.ts.map