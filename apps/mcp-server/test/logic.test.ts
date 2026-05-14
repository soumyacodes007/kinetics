import { describe, expect, it } from "vitest";
import { buildMemorySummaryText, buildMemoryStats, filterSearchablePacks, normalizeProofInput, packKindFromContract } from "../src/logic.js";
import type { MemoryPassState, VaultSnapshot } from "@kinetics/core";

describe("mcp logic helpers", () => {
  const passState: MemoryPassState = {
    vaultId: 7n,
    owner: "0xabc",
    planId: 1n,
    expiresAt: 2_000_000_000n,
    storageQuotaBytes: 1_024n,
    writeQuotaPerPeriod: 10n,
    latestIndexVersion: 3n,
    latestIndexRoot: "0x1234",
    latestIndexBlobRoot: "0xabcd"
  };

  const snapshot: VaultSnapshot = {
    vaultId: 7,
    version: 3,
    bytesUsed: 128,
    writeCountCurrentPeriod: 2,
    merkleRoot: "0xroot",
    entries: [
      {
        memoryId: "m1",
        blobRoot: "0x1",
        memoryType: "episodic",
        title: "Hackathon preference",
        summary: "Prefers small teams",
        tags: ["hackathon", "team"],
        namespaces: ["personal"],
        createdAt: 100,
        lastAccessedAt: 100,
        strength: 0.4,
        stale: false,
        sourceClient: "mcp"
      },
      {
        memoryId: "m2",
        blobRoot: "0x2",
        memoryType: "semantic",
        title: "Solidity note",
        summary: "Prefers foundry",
        tags: ["solidity"],
        namespaces: ["research"],
        createdAt: 200,
        lastAccessedAt: 200,
        strength: 0.8,
        stale: true,
        sourceClient: "mcp"
      }
    ]
  };

  it("builds memory stats", () => {
    const stats = buildMemoryStats(passState, true, snapshot);
    expect(stats.totalEntries).toBe(2);
    expect(stats.byType.episodic).toBe(1);
    expect(stats.byType.semantic).toBe(1);
    expect(stats.staleEntries).toBe(1);
  });

  it("builds summary text", () => {
    const summary = buildMemorySummaryText(snapshot);
    expect(summary).toContain("Vault snapshot version 3");
    expect(summary).toContain("Hackathon preference");
  });

  it("filters searchable packs", () => {
    const results = filterSearchablePacks(
      [
        {
          packId: 1,
          active: true,
          priceWei: "1",
          licenseDurationSeconds: 86_400,
          manifest: {
            packId: 1,
            slug: "solidity-research",
            title: "Solidity Research",
            shortDescription: "EVM notes",
            packKind: "skill_only",
            tags: ["solidity", "evm"],
            keywords: ["foundry"],
            priceWei: "1",
            licenseDurationDays: 1,
            previewFiles: [],
            currentVersion: 1,
            creator: "0xcreator",
            createdAt: 0,
            updatedAt: 0
          }
        },
        {
          packId: 2,
          active: false,
          priceWei: "1",
          licenseDurationSeconds: 86_400,
          manifest: {
            packId: 2,
            slug: "inactive",
            title: "Inactive",
            shortDescription: "Should not show",
            packKind: "hybrid",
            tags: ["misc"],
            keywords: [],
            priceWei: "1",
            licenseDurationDays: 1,
            previewFiles: [],
            currentVersion: 1,
            creator: "0xcreator",
            createdAt: 0,
            updatedAt: 0
          }
        }
      ],
      "solidity",
      ["evm"],
      "skill_only"
    );

    expect(results).toHaveLength(1);
    expect(results[0]?.packId).toBe(1);
  });

  it("normalizes proof input from a query result shape", () => {
    const proofs = normalizeProofInput({
      memoryId: "m1",
      proof: {
        leaf: "0xleaf",
        proof: ["0xa", "0xb"],
        merkleRoot: "0xroot"
      }
    });

    expect(proofs).toEqual([
      {
        leaf: "0xleaf",
        proof: ["0xa", "0xb"],
        merkleRoot: "0xroot"
      }
    ]);
  });

  it("maps numeric pack kinds", () => {
    expect(packKindFromContract(0)).toBe("skill_only");
    expect(packKindFromContract(1)).toBe("knowledge_only");
    expect(packKindFromContract(2)).toBe("hybrid");
  });
});
