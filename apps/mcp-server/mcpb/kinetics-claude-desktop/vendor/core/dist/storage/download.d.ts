export interface ReadableStorage {
    readBytes(rootHash: string, verified?: boolean): Promise<Uint8Array>;
}
export interface ZeroGStorageReaderOptions {
    cacheDir?: string;
    verifiedByDefault?: boolean;
}
export declare class ZeroGStorageReader implements ReadableStorage {
    private readonly indexerRpc;
    private readonly cacheDir;
    private readonly verifiedByDefault;
    constructor(indexerRpc: string, options?: ZeroGStorageReaderOptions);
    private cachePathFor;
    readBytes(rootHash: string, verified?: boolean): Promise<Uint8Array>;
}
//# sourceMappingURL=download.d.ts.map