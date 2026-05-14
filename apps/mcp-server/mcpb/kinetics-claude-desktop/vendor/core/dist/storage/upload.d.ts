import { Signer } from "ethers";
export interface ZeroGStorageConfig {
    indexerRpc: string;
    blockchainRpc: string;
    signer: Signer;
    cacheDir?: string;
}
export interface UploadedRoot {
    rootHash: string;
    transactionHash: string;
}
export interface WritableStorage {
    uploadBytes(bytes: Uint8Array, filename: string): Promise<UploadedRoot>;
}
export declare class ZeroGStorageWriter implements WritableStorage {
    private readonly config;
    constructor(config: ZeroGStorageConfig);
    private cacheDir;
    private cachePathFor;
    uploadBytes(bytes: Uint8Array, filename: string): Promise<UploadedRoot>;
}
//# sourceMappingURL=upload.d.ts.map