import { Indexer, ZgFile } from "@0gfoundation/0g-storage-ts-sdk";
import { mkdir, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { withTempFile } from "../utils/temp-file.js";
const MVP_UPLOAD_OPTIONS = {
    tags: "0x",
    finalityRequired: false,
    taskSize: 1,
    expectedReplica: 1,
    skipTx: false,
    fee: 0n
};
export class ZeroGStorageWriter {
    config;
    constructor(config) {
        this.config = config;
    }
    cacheDir() {
        return this.config.cacheDir ?? path.join(os.homedir(), ".kinetics", "storage-cache");
    }
    cachePathFor(rootHash) {
        return path.join(this.cacheDir(), `${rootHash.replace(/^0x/i, "").toLowerCase()}.bin`);
    }
    async uploadBytes(bytes, filename) {
        return withTempFile(bytes, filename, async (filePath) => {
            const indexer = new Indexer(this.config.indexerRpc);
            const file = await ZgFile.fromFilePath(filePath);
            try {
                const [tree, treeErr] = await file.merkleTree();
                if (treeErr || tree === null) {
                    throw new Error(`0G merkle tree generation failed: ${treeErr?.message ?? "unknown error"}`);
                }
                const [tx, uploadErr] = await indexer.upload(file, this.config.blockchainRpc, this.config.signer, MVP_UPLOAD_OPTIONS);
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
                await mkdir(this.cacheDir(), { recursive: true });
                await writeFile(this.cachePathFor(rootHash), bytes);
                return {
                    rootHash,
                    transactionHash
                };
            }
            finally {
                await file.close();
            }
        });
    }
}
//# sourceMappingURL=upload.js.map