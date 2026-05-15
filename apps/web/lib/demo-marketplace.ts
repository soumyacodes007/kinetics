import type { PackPreviewManifest } from "@kinetics/core/browser";

export interface DemoMarketplaceItem {
  packId: number;
  creator: string;
  currentVersion: number;
  priceWei: bigint;
  licenseDurationSeconds: bigint;
  manifest: PackPreviewManifest;
  demo: true;
}

export const DEMO_MARKETPLACE_ITEMS: DemoMarketplaceItem[] = [
  {
    packId: 9901,
    creator: "0x1234567890abcdef1234567890abcdef12345678",
    currentVersion: 2,
    priceWei: BigInt("50000000000000000"),
    licenseDurationSeconds: BigInt(30 * 24 * 60 * 60),
    demo: true,
    manifest: {
      packId: 9901,
      slug: "ethers-pro",
      title: "Ethers.js Pro Patterns",
      shortDescription:
        "Advanced contract interaction patterns, multicall batching, and event listening strategies for high-performance agentic wallets.",
      packKind: "hybrid",
      tags: ["solidity", "ethers", "agent"],
      keywords: ["rpc", "multicall", "events"],
      priceWei: "50000000000000000",
      licenseDurationDays: 30,
      previewFiles: ["README.md", "patterns/multicall.md"],
      currentVersion: 2,
      creator: "0x1234567890abcdef1234567890abcdef12345678",
      createdAt: 1715700000,
      updatedAt: 1718400000
    }
  },
  {
    packId: 9902,
    creator: "0xabcdef1234567890abcdef1234567890abcdef12",
    currentVersion: 1,
    priceWei: BigInt("100000000000000000"),
    licenseDurationSeconds: BigInt(60 * 24 * 60 * 60),
    demo: true,
    manifest: {
      packId: 9902,
      slug: "mcp-templates",
      title: "MCP Server Templates",
      shortDescription:
        "A complete set of robust Model Context Protocol server templates in Node.js and Python with built-in stdio transport and tool router.",
      packKind: "skill_only",
      tags: ["mcp", "python", "typescript"],
      keywords: ["server", "tools", "prompts"],
      priceWei: "100000000000000000",
      licenseDurationDays: 60,
      previewFiles: ["index.ts", "server.py"],
      currentVersion: 1,
      creator: "0xabcdef1234567890abcdef1234567890abcdef12",
      createdAt: 1718200000,
      updatedAt: 1718300000
    }
  },
  {
    packId: 9903,
    creator: "0x9999999999999999999999999999999999999999",
    currentVersion: 4,
    priceWei: BigInt("25000000000000000"),
    licenseDurationSeconds: BigInt(100 * 24 * 60 * 60),
    demo: true,
    manifest: {
      packId: 9903,
      slug: "defi-knowledge",
      title: "DeFi Yield Protocols",
      shortDescription:
        "Extensive knowledge base covering Aave V3, Uniswap V3 concentrated liquidity, and Curve stableswap mechanics for AI analysis.",
      packKind: "knowledge_only",
      tags: ["defi", "finance", "knowledge"],
      keywords: ["yield", "aave", "uniswap"],
      priceWei: "25000000000000000",
      licenseDurationDays: 100,
      previewFiles: ["aave-v3.md", "uni-v3.md"],
      currentVersion: 4,
      creator: "0x9999999999999999999999999999999999999999",
      createdAt: 1717200000,
      updatedAt: 1719000000
    }
  }
];

export function findDemoMarketplaceItem(packId: number) {
  return DEMO_MARKETPLACE_ITEMS.find((item) => item.packId === packId) ?? null;
}
