import { ContractClientsConfig } from "./common.js";
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
export declare class KnowledgePackClient {
    private readonly config;
    constructor(config: ContractClientsConfig);
    private contract;
    getPack(packId: number | bigint): Promise<PackState>;
    getTotalSupply(): Promise<bigint>;
    getCreatorPackIds(creator: string): Promise<bigint[]>;
    mintPack(slug: string, packKind: number, previewRoot: string, bundleRoot: string): Promise<string>;
    publishVersion(packId: number | bigint, version: number | bigint, previewRoot: string, bundleRoot: string): Promise<string>;
    setSaleTerms(packId: number | bigint, priceWei: bigint, licenseDurationSeconds: bigint, active: boolean): Promise<string>;
}
//# sourceMappingURL=knowledge-pack.d.ts.map