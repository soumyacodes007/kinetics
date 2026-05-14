import { toUtf8Bytes } from "ethers";
import { hexToBytes } from "../utils/hex.js";
import { hkdfSha256 } from "./hkdf.js";

export interface VaultKeyTypedData {
  domain: {
    name: "0G Mem";
    version: string;
    chainId: number;
  };
  types: {
    VaultKey: readonly [
      { name: "vaultId"; type: "uint256" },
      { name: "version"; type: "uint256" }
    ];
  };
  message: {
    vaultId: bigint;
    version: bigint;
  };
}

const DEFAULT_SALT = toUtf8Bytes("kinetics-v1-vault-master-key");
const DEFAULT_INFO = toUtf8Bytes("0g-mem-vault-key");

export function getVaultKeyTypedData(chainId: number, vaultId: bigint, version: bigint): VaultKeyTypedData {
  return {
    domain: {
      name: "0G Mem",
      version: "1",
      chainId
    },
    types: {
      VaultKey: [
        { name: "vaultId", type: "uint256" },
        { name: "version", type: "uint256" }
      ]
    },
    message: {
      vaultId,
      version
    }
  };
}

export async function deriveVaultMasterKeyFromSignature(signatureHex: string): Promise<Uint8Array> {
  return hkdfSha256(hexToBytes(signatureHex), DEFAULT_SALT, DEFAULT_INFO, 32);
}
