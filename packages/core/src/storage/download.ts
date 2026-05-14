import { Indexer } from "@0gfoundation/0g-storage-ts-sdk";
import { mkdtemp, rm } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { readFileBytes } from "../utils/temp-file.js";

export interface ReadableStorage {
  readBytes(rootHash: string, verified?: boolean): Promise<Uint8Array>;
}

export class ZeroGStorageReader implements ReadableStorage {
  constructor(private readonly indexerRpc: string) {}

  async readBytes(rootHash: string, verified = true): Promise<Uint8Array> {
    const indexer = new Indexer(this.indexerRpc);
    const dir = await mkdtemp(path.join(os.tmpdir(), "kinetics-download-"));
    const outputPath = path.join(dir, "payload.bin");

    try {
      const err = await indexer.download(rootHash, outputPath, verified);
      if (err) {
        throw err;
      }

      return await readFileBytes(outputPath);
    } finally {
      await rm(dir, { recursive: true, force: true });
    }
  }
}
