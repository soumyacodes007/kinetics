export declare function withTempFile<T>(bytes: Uint8Array, filename: string, fn: (filePath: string) => Promise<T>): Promise<T>;
export declare function readFileBytes(filePath: string): Promise<Uint8Array>;
//# sourceMappingURL=temp-file.d.ts.map