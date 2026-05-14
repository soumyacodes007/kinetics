import { Indexer, ZgFile } from "@0gfoundation/0g-storage-ts-sdk";
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

const MVP_UPLOAD_OPTIONS = {
  tags: "0x",
  finalityRequired: true,
  taskSize: 1,
  expectedReplica: 1,
  skipTx: false,
  fee: 0n
} as const;

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

        const [tx, uploadErr] = await indexer.upload(
          file,
          this.config.blockchainRpc,
          this.config.signer as any,
          MVP_UPLOAD_OPTIONS
        );
        if (uploadErr || tx === null) {
          throw new Error(`0G upload failed: ${uploadErr?.message ?? "unknown error"}`);
        }
        const rootHash = tree.rootHash();
        if (!rootHash) {
          throw new Error("0G upload failed: root hash missing");
        }
        const transactionHash = "txHash" in tx ? tx.txHash : tx.txHashes[0];
        if (!transactionHash) {
          throw new Error("0G upload failed: transaction hash missing");
        }

        return {
          rootHash,
          transactionHash
        };
      } finally {
        await file.close();
      }
    });
  }
}
