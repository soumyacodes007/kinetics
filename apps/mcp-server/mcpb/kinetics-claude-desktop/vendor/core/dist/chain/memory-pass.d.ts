import { ContractClientsConfig } from "./common.js";
import { LatestIndexReceipt, MemoryPassPlan, MemoryPassState } from "../types/pass.js";
export declare class MemoryPassClient {
    private readonly config;
    constructor(config: ContractClientsConfig);
    private contract;
    getPlan(planId: number | bigint): Promise<MemoryPassPlan>;
    getNextPlanId(): Promise<bigint>;
    getPass(vaultId: number | bigint): Promise<MemoryPassState>;
    getPassByOwner(owner: string): Promise<MemoryPassState>;
    buyPass(planId: number | bigint, priceWei: bigint): Promise<{
        vaultId: bigint;
        transactionHash: string;
    }>;
    renewPass(vaultId: number | bigint, planId: number | bigint, priceWei: bigint): Promise<string>;
    isPassActive(vaultId: number | bigint): Promise<boolean>;
    setLatestIndex(vaultId: number | bigint, version: number | bigint, indexRoot: string, indexBlobRoot: string): Promise<LatestIndexReceipt>;
}
//# sourceMappingURL=memory-pass.d.ts.map