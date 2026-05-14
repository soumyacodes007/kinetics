import { Contract, JsonRpcProvider, Signer } from "ethers";
import { KINETICS_DEPLOYED_ADDRESSES } from "@kinetics/abi";
export interface ContractClientsConfig {
    rpcUrl: string;
    signer?: Signer;
    addresses?: Partial<Record<keyof typeof KINETICS_DEPLOYED_ADDRESSES, string>>;
}
export declare function getProvider(config: ContractClientsConfig): JsonRpcProvider;
export declare function getContractAddress(name: keyof typeof KINETICS_DEPLOYED_ADDRESSES, config: ContractClientsConfig): string;
export declare function getContract(name: "MemoryPass", config: ContractClientsConfig): Contract;
export declare function getContract(name: "MemoryRegistry", config: ContractClientsConfig): Contract;
export declare function getContract(name: "KnowledgePackNFT", config: ContractClientsConfig): Contract;
export declare function getContract(name: "PackLicenseRegistry", config: ContractClientsConfig): Contract;
//# sourceMappingURL=common.d.ts.map