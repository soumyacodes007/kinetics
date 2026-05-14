import { Wallet } from "ethers";
import { KineticsChainAddresses } from "@kinetics/core";
export interface KineticsMcpConfig {
    chainId: number;
    rpcUrl: string;
    indexerRpc: string;
    addresses?: Partial<KineticsChainAddresses>;
    sourceClient: string;
    accessGrantWaitMs: number;
    accessGrantPollMs: number;
    wallet: Wallet;
}
export declare function loadConfigFromEnv(): KineticsMcpConfig;
//# sourceMappingURL=config.d.ts.map