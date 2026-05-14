import { JsonRpcProvider, Wallet } from "ethers";
import { KINETICS_0G_TESTNET } from "@kinetics/core";
function readNumberEnv(name, fallback) {
    const raw = process.env[name];
    if (!raw) {
        return fallback;
    }
    const value = Number(raw);
    if (!Number.isFinite(value) || value < 0) {
        throw new Error(`${name} must be a non-negative number`);
    }
    return value;
}
function readOptionalAddressOverrides() {
    const overrides = {};
    const fields = [
        "MemoryPass",
        "MemoryRegistry",
        "KnowledgePackNFT",
        "PackLicenseRegistry"
    ];
    for (const field of fields) {
        const value = process.env[field.toUpperCase()] ?? process.env[`KINETICS_${field.toUpperCase()}`];
        if (value) {
            overrides[field] = value;
        }
    }
    return Object.keys(overrides).length > 0 ? overrides : undefined;
}
export function loadConfigFromEnv() {
    const privateKey = process.env.KINETICS_PRIVATE_KEY ?? process.env.PRIVATE_KEY;
    if (!privateKey) {
        throw new Error("KINETICS_PRIVATE_KEY or PRIVATE_KEY is required");
    }
    const rpcUrl = process.env.KINETICS_RPC_URL ?? process.env.RPC_URL ?? KINETICS_0G_TESTNET.rpcUrl;
    const indexerRpc = process.env.KINETICS_INDEXER_RPC ??
        process.env.INDEXER_RPC_URL ??
        process.env.INDEXER_RPC ??
        KINETICS_0G_TESTNET.storageIndexer;
    const provider = new JsonRpcProvider(rpcUrl);
    return {
        chainId: readNumberEnv("KINETICS_CHAIN_ID", KINETICS_0G_TESTNET.chainId),
        rpcUrl,
        indexerRpc,
        addresses: readOptionalAddressOverrides(),
        sourceClient: process.env.KINETICS_SOURCE_CLIENT ?? process.env.AGENT_ID ?? "mcp-server",
        accessGrantWaitMs: readNumberEnv("KINETICS_ACCESS_GRANT_WAIT_MS", 15000),
        accessGrantPollMs: readNumberEnv("KINETICS_ACCESS_GRANT_POLL_MS", 1500),
        wallet: new Wallet(privateKey, provider)
    };
}
//# sourceMappingURL=config.js.map