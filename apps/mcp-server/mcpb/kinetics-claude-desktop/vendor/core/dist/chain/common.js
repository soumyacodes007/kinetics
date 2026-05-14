import { Contract, JsonRpcProvider } from "ethers";
import { KINETICS_DEPLOYED_ADDRESSES, KNOWLEDGE_PACK_NFT_ABI, MEMORY_PASS_ABI, MEMORY_REGISTRY_ABI, PACK_LICENSE_REGISTRY_ABI } from "@kinetics/abi";
export function getProvider(config) {
    return new JsonRpcProvider(config.rpcUrl);
}
export function getContractAddress(name, config) {
    return config.addresses?.[name] ?? KINETICS_DEPLOYED_ADDRESSES[name];
}
export function getContract(name, config) {
    const provider = getProvider(config);
    const signerWithProvider = config.signer && "provider" in config.signer && config.signer.provider
        ? config.signer
        : config.signer && "connect" in config.signer
            ? config.signer.connect(provider)
            : config.signer;
    const runner = signerWithProvider ?? provider;
    switch (name) {
        case "MemoryPass":
            return new Contract(getContractAddress(name, config), MEMORY_PASS_ABI, runner);
        case "MemoryRegistry":
            return new Contract(getContractAddress(name, config), MEMORY_REGISTRY_ABI, runner);
        case "KnowledgePackNFT":
            return new Contract(getContractAddress(name, config), KNOWLEDGE_PACK_NFT_ABI, runner);
        case "PackLicenseRegistry":
            return new Contract(getContractAddress(name, config), PACK_LICENSE_REGISTRY_ABI, runner);
    }
    throw new Error(`Unsupported contract: ${String(name)}`);
}
//# sourceMappingURL=common.js.map