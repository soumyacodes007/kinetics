import { describe, expect, it } from "vitest";
import { keccak256, toUtf8Bytes } from "ethers";
import {
  addMemory,
  buildSortedMerkleTree,
  createPackDraft,
  decryptJson,
  deriveVaultMasterKeyFromSignature,
  encryptJson,
  getMerkleProof,
  KINETICS_DEPLOYED_ADDRESSES,
  mountPack,
  publishAccessGrant,
  publishPack,
  queryMemory,
  rankVaultEntries,
  syncVaultSnapshots,
  verifySortedMerkleProof
} from "../src/index.js";
import type { BuyerAccessGrant, MemoryPassState, VaultSnapshot } from "../src/index.js";

class InMemoryStorage {
  public readonly blobs = new Map<string, Uint8Array>();

  async uploadBytes(bytes: Uint8Array): Promise<{ rootHash: string; transactionHash: string }> {
    const rootHash = keccak256(bytes);
    this.blobs.set(rootHash, bytes);
    return {
      rootHash,
      transactionHash: keccak256(toUtf8Bytes(`tx:${rootHash}`))
    };
  }

  async readBytes(rootHash: string): Promise<Uint8Array> {
    const bytes = this.blobs.get(rootHash);
    if (!bytes) {
      throw new Error(`Blob not found: ${rootHash}`);
    }
    return bytes;
  }
}

class FakeMemoryPass {
  public latestIndexCalls: Array<{ version: number | bigint; indexRoot: string; indexBlobRoot: string }> = [];

  constructor(private readonly state: MemoryPassState) {}

  async getPassByOwner(): Promise<MemoryPassState> {
    return this.state;
  }

  async setLatestIndex(
    _vaultId: number | bigint,
    version: number | bigint,
    indexRoot: string,
    indexBlobRoot: string
  ): Promise<{ transactionHash?: string }> {
    this.state.latestIndexVersion = BigInt(version);
    this.state.latestIndexRoot = indexRoot;
    this.state.latestIndexBlobRoot = indexBlobRoot;
    this.latestIndexCalls.push({ version, indexRoot, indexBlobRoot });
    return { transactionHash: keccak256(toUtf8Bytes(`index:${version}`)) };
  }
}

class FakeMemoryRegistry {
  public readonly updates: Array<{ merkleRoot: string; daTxHash: string }> = [];

  async updateRoot(merkleRoot: string, daTxHash: string): Promise<string> {
    this.updates.push({ merkleRoot, daTxHash });
    return keccak256(toUtf8Bytes(`${merkleRoot}:${daTxHash}`));
  }
}

class FakePackPublisher {
  public readonly minted: Array<{ slug: string; packKind: number; previewRoot: string; bundleRoot: string }> = [];
  public readonly versions: Array<{ packId: number | bigint; version: number | bigint; previewRoot: string; bundleRoot: string }> = [];
  public readonly saleTerms: Array<{ packId: number | bigint; priceWei: bigint; licenseDurationSeconds: bigint; active: boolean }> = [];

  async mintPack(slug: string, packKind: number, previewRoot: string, bundleRoot: string): Promise<string> {
    this.minted.push({ slug, packKind, previewRoot, bundleRoot });
    return "mint-tx";
  }

  async publishVersion(packId: number | bigint, version: number | bigint, previewRoot: string, bundleRoot: string): Promise<string> {
    this.versions.push({ packId, version, previewRoot, bundleRoot });
    return "publish-version-tx";
  }

  async setSaleTerms(packId: number | bigint, priceWei: bigint, licenseDurationSeconds: bigint, active: boolean): Promise<string> {
    this.saleTerms.push({ packId, priceWei, licenseDurationSeconds, active });
    return "sale-terms-tx";
  }
}

class FakeAccessGrantPublisher {
  public readonly published: Array<{ licenseId: number | bigint; grantVersion: number | bigint; grantRoot: string }> = [];

  async publishAccessGrant(licenseId: number | bigint, grantVersion: number | bigint, grantRoot: string): Promise<string> {
    this.published.push({ licenseId, grantVersion, grantRoot });
    return "grant-tx";
  }
}

describe("crypto", () => {
  it("derives a deterministic vault key and round-trips encrypted JSON", async () => {
    const signature = "0x" + "11".repeat(65);
    const key = await deriveVaultMasterKeyFromSignature(signature);
    const ciphertext = await encryptJson({ hello: "world" }, key);
    const plaintext = await decryptJson<{ hello: string }>(ciphertext, key);

    expect(Buffer.from(key).toString("hex")).toHaveLength(64);
    expect(plaintext.hello).toBe("world");
  });
});

describe("merkle", () => {
  it("matches the sorted pair proof convention expected by MemoryRegistry", () => {
    const leaves = [keccak256(toUtf8Bytes("a")), keccak256(toUtf8Bytes("b")), keccak256(toUtf8Bytes("c"))];
    const proof = getMerkleProof(leaves, leaves[1]);

    expect(proof.root).not.toBe("0x");
    expect(verifySortedMerkleProof(proof.leaf, proof.proof, proof.root)).toBe(true);
    expect(buildSortedMerkleTree(leaves).getHexRoot().toLowerCase()).toBe(proof.root.toLowerCase());
  });
});

describe("retrieval", () => {
  it("ranks the relevant memory entry first", () => {
    const ranked = rankVaultEntries("hackathon track preference", [
      {
        memoryId: "1",
        blobRoot: keccak256(toUtf8Bytes("1")),
        memoryType: "episodic",
        title: "Hackathon preference",
        summary: "Preferred track is Track 3",
        tags: ["hackathon", "preference"],
        namespaces: ["personal", "hackathon"],
        createdAt: Math.floor(Date.now() / 1000),
        lastAccessedAt: 0,
        strength: 0.8,
        stale: false,
        sourceClient: "openclaw"
      },
      {
        memoryId: "2",
        blobRoot: keccak256(toUtf8Bytes("2")),
        memoryType: "episodic",
        title: "Favorite editor",
        summary: "Likes VS Code",
        tags: ["editor"],
        namespaces: ["coding"],
        createdAt: Math.floor(Date.now() / 1000),
        lastAccessedAt: 0,
        strength: 0.4,
        stale: false,
        sourceClient: "openclaw"
      }
    ]);

    expect(ranked[0]?.entry.memoryId).toBe("1");
    expect(ranked[0]?.finalScore).toBeGreaterThan(ranked[1]?.finalScore ?? 0);
  });
});

describe("vault flow", () => {
  it("adds memory, pushes the encrypted snapshot, and queries it back", async () => {
    const storage = new InMemoryStorage();
    const passState: MemoryPassState = {
      vaultId: 1n,
      owner: "0xowner",
      planId: 1n,
      expiresAt: BigInt(Math.floor(Date.now() / 1000) + 3600),
      storageQuotaBytes: 1024n * 1024n,
      writeQuotaPerPeriod: 100n,
      latestIndexVersion: 0n,
      latestIndexRoot: "0x" + "00".repeat(32),
      latestIndexBlobRoot: "0x" + "00".repeat(32)
    };
    const memoryPass = new FakeMemoryPass(passState);
    const memoryRegistry = new FakeMemoryRegistry();
    const vaultMasterKey = await deriveVaultMasterKeyFromSignature("0x" + "22".repeat(65));

    const receipt = await addMemory({
      owner: "0xowner",
      memoryPass,
      memoryRegistry,
      storage,
      vaultMasterKey,
      text: "My preferred hackathon track is Track 3",
      sourceClient: "openclaw",
      metadata: {
        namespaces: ["personal", "hackathon"],
        tags: ["hackathon", "preference"]
      }
    });

    expect(receipt.snapshotVersion).toBe(1);
    expect(memoryPass.latestIndexCalls).toHaveLength(1);
    expect(memoryRegistry.updates).toHaveLength(1);

    const snapshot = await syncVaultSnapshots(
      {
        vaultId: 1,
        version: 0,
        bytesUsed: 0,
        writeCountCurrentPeriod: 0,
        merkleRoot: "0x" + "00".repeat(32),
        entries: []
      },
      await (async () => {
        const bytes = await storage.readBytes(passState.latestIndexBlobRoot);
        const ciphertextHex = new TextDecoder().decode(bytes);
        return decryptJson<VaultSnapshot>(ciphertextHex, vaultMasterKey);
      })()
    );

    const results = await queryMemory({
      query: "which track did I say I liked",
      snapshot,
      storage,
      vaultMasterKey,
      topK: 1
    });

    expect(results).toHaveLength(1);
    expect(results[0]?.text).toContain("Track 3");
    expect(results[0]?.proof.merkleRoot).toBe(receipt.merkleRoot);
  });
});

describe("pack publishing and mounting", () => {
  it("publishes preview + bundle, stores a grant, and mounts the pack", async () => {
    const storage = new InMemoryStorage();
    const publisher = new FakePackPublisher();
    const grantPublisher = new FakeAccessGrantPublisher();
    const { manifest, bundle } = createPackDraft({
      slug: "solidity-research-pack",
      title: "Solidity Research Skill Pack",
      shortDescription: "Audit patterns and workflows",
      packKind: "hybrid",
      tags: ["solidity", "security"],
      keywords: ["reentrancy", "auth"],
      previewFiles: ["README.md"],
      files: [{ path: "SKILL.md", content: "Use this pack for audits." }],
      knowledgeDocs: [{ docId: "doc_1", title: "Auth bypass", text: "Review auth boundaries." }],
      mountInstructions: {
        systemPromptAddition: "Use for Solidity security tasks",
        recommendedTools: ["rg", "forge"]
      },
      priceWei: "10000000000000000",
      licenseDurationDays: 30,
      creator: "0xcreator"
    });

    const published = await publishPack({
      manifest: { ...manifest, packId: 1, currentVersion: 1 },
      bundle: { ...bundle, packId: 1, version: 1 },
      storage,
      chain: publisher
    });

    expect(publisher.minted).toHaveLength(1);

    const grant: BuyerAccessGrant = {
      licenseId: 91,
      packId: 1,
      version: 1,
      bundleRoot: published.bundleRoot,
      encryptedVersionKey: published.versionKeyHex,
      issuedAt: 1,
      expiresAt: 999_999
    };

    const grantResult = await publishAccessGrant({
      grant,
      storage,
      licenseRegistry: grantPublisher
    });

    expect(grantPublisher.published[0]?.grantRoot).toBe(grantResult.rootHash);

    const mounted = await mountPack({
      licenseId: 91,
      buyer: "0xbuyer",
      licenseRegistry: {
        async getLicense() {
          return {
            licenseId: 91n,
            packId: 1n,
            buyer: "0xbuyer",
            startsAt: 1n,
            expiresAt: 999_999n,
            buyerPubkey: "0x1234",
            latestGrantVersion: 1n,
            latestGrantRoot: grantResult.rootHash,
            active: true
          };
        },
        async hasActiveLicense() {
          return true;
        }
      },
      knowledgePack: {
        async getPack() {
          return {
            currentPreviewRoot: published.previewRoot
          };
        }
      },
      storage
    });

    expect(mounted.packId).toBe(1);
    expect(mounted.bundle.files[0]?.path).toBe("SKILL.md");
    expect(mounted.manifest.slug).toBe("solidity-research-pack");
  });
});

describe("exports", () => {
  it("exposes deployed contract metadata", () => {
    expect(KINETICS_DEPLOYED_ADDRESSES.MemoryPass).toMatch(/^0x/i);
  });
});
