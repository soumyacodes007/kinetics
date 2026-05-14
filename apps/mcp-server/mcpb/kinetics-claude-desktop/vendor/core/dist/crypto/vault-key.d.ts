export interface VaultKeyTypedData {
    domain: {
        name: "0G Mem";
        version: string;
        chainId: number;
    };
    types: {
        VaultKey: readonly [
            {
                name: "vaultId";
                type: "uint256";
            },
            {
                name: "version";
                type: "uint256";
            }
        ];
    };
    message: {
        vaultId: bigint;
        version: bigint;
    };
}
export declare function getVaultKeyTypedData(chainId: number, vaultId: bigint, version: bigint): VaultKeyTypedData;
export declare function deriveVaultMasterKeyFromSignature(signatureHex: string): Promise<Uint8Array>;
//# sourceMappingURL=vault-key.d.ts.map