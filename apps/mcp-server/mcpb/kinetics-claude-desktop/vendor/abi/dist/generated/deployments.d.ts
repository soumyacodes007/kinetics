export interface KineticsDeploymentRecord {
    network: string;
    rpcUrl: string;
    deployer: string;
    deployedAt: string;
    contracts: {
        MemoryPass: string;
        MemoryRegistry: string;
        KnowledgePackNFT: string;
        PackLicenseRegistry: string;
    };
}
export declare const KINETICS_LATEST_DEPLOYMENT: {
    readonly network: "0g-testnet";
    readonly rpcUrl: "https://evmrpc-testnet.0g.ai";
    readonly deployer: "0x85C54b01080992fFfe78B3FE539494b8734a2210";
    readonly deployedAt: "2026-05-14T15:08:33.863Z";
    readonly contracts: {
        readonly MemoryPass: "0xE2f5f82F138A6D1d94C3A8fFD6c1dC24D5384Fde";
        readonly MemoryRegistry: "0x0Ca3d9da269F1a167365A59513a0428b1c2C9f00";
        readonly KnowledgePackNFT: "0xF02c676411a3877770c9b15dfDb64141231D3a6F";
        readonly PackLicenseRegistry: "0xFC34fB17db0726B70Df171BBC8CBac792Ae7FFbB";
    };
};
export declare const KINETICS_DEPLOYED_ADDRESSES: {
    readonly MemoryPass: "0xE2f5f82F138A6D1d94C3A8fFD6c1dC24D5384Fde";
    readonly MemoryRegistry: "0x0Ca3d9da269F1a167365A59513a0428b1c2C9f00";
    readonly KnowledgePackNFT: "0xF02c676411a3877770c9b15dfDb64141231D3a6F";
    readonly PackLicenseRegistry: "0xFC34fB17db0726B70Df171BBC8CBac792Ae7FFbB";
};
//# sourceMappingURL=deployments.d.ts.map