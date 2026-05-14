import { Indexer, ZgFile } from "@0glabs/0g-ts-sdk";
import { Signer } from "ethers";
import { withTempFile } from "../utils/temp-file.js";

export interface ZeroGStorageConfig {
  indexerRpc: string;
  blockchainRpc: string;
  signer: Signer;
}

export interface UploadedRoot {
  rootHash: string;
  transactionHash: string;
}

export interface WritableStorage {
  uploadBytes(bytes: Uint8Array, filename: string): Promise<UploadedRoot>;
}

export class ZeroGStorageWriter implements WritableStorage {
  constructor(private readonly config: ZeroGStorageConfig) {}

  async uploadBytes(bytes: Uint8Array, filename: string): Promise<UploadedRoot> {
    return withTempFile(bytes, filename, async (filePath) => {
      const indexer = new Indexer(this.config.indexerRpc);
      const file = await ZgFile.fromFilePath(filePath);

      try {
        const [tree, treeErr] = await file.merkleTree();
        if (treeErr || tree === null) {
          throw new Error(`0G merkle tree generation failed: ${treeErr?.message ?? "unknown error"}`);
        }

        const [tx, uploadErr] = await indexer.upload(file, this.config.blockchainRpc, this.config.signer as any);
        if (uploadErr || tx === null) {
          throw new Error(`0G upload failed: ${uploadErr?.message ?? "unknown error"}`);
        }
        const rootHash = tree.rootHash();
        if (!rootHash) {
          throw new Error("0G upload failed: root hash missing");
        }

        return {
          rootHash,
          transactionHash: tx.txHash
        };
      } finally {
        await file.close();
      }
    });
  }
}
