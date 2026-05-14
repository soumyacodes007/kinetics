import { Indexer } from "@0gfoundation/0g-storage-ts-sdk";
import { access, mkdir, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { readFileBytes } from "../utils/temp-file.js";

export interface ReadableStorage {
  readBytes(rootHash: string, verified?: boolean): Promise<Uint8Array>;
}

export interface ZeroGStorageReaderOptions {
  cacheDir?: string;
  verifiedByDefault?: boolean;
}

export class ZeroGStorageReader implements ReadableStorage {
  private readonly cacheDir: string;
  private readonly verifiedByDefault: boolean;

  constructor(
    private readonly indexerRpc: string,
    options: ZeroGStorageReaderOptions = {}
  ) {
    this.cacheDir = options.cacheDir ?? path.join(os.homedir(), ".kinetics", "storage-cache");
    this.verifiedByDefault = options.verifiedByDefault ?? false;
  }

  private cachePathFor(rootHash: string): string {
    return path.join(this.cacheDir, `${rootHash.replace(/^0x/i, "").toLowerCase()}.bin`);
  }

  async readBytes(rootHash: string, verified = this.verifiedByDefault): Promise<Uint8Array> {
    const cachePath = this.cachePathFor(rootHash);
    try {
      await access(cachePath);
      const content = await readFile(cachePath);
      return new Uint8Array(content);
    } catch {
      // Fall through to remote download.
    }

    const indexer = new Indexer(this.indexerRpc);
    const dir = await mkdtemp(path.join(os.tmpdir(), "kinetics-download-"));
    const outputPath = path.join(dir, "payload.bin");

    try {
      const err = await indexer.download(rootHash, outputPath, verified);
      if (err) {
        throw err;
      }

      const bytes = await readFileBytes(outputPath);
      await mkdir(this.cacheDir, { recursive: true });
      await writeFile(cachePath, bytes);
      return bytes;
    } finally {
      await rm(dir, { recursive: true, force: true });
    }
  }
}
