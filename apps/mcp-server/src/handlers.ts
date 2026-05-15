import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import * as z from "zod/v4";
import { PackKind } from "@kinetics/core";
import { KineticsMcpService, PublishDraftInput } from "./service.js";
import { toJsonText, toJsonValue } from "./logic.js";

const memoryTypeSchema = z.enum(["episodic", "semantic", "procedural", "working"]);
const packKindSchema = z.enum(["skill_only", "knowledge_only", "hybrid"]);

const publishDraftSchema = z.object({
  slug: z.string().min(1),
  title: z.string().min(1),
  shortDescription: z.string().min(1),
  packKind: packKindSchema,
  tags: z.array(z.string()).default([]),
  keywords: z.array(z.string()).default([]),
  previewFiles: z.array(z.string()).default([]),
  files: z.array(
    z.object({
      path: z.string().min(1),
      content: z.string()
    })
  ),
  knowledgeDocs: z
    .array(
      z.object({
        docId: z.string().min(1),
        title: z.string().min(1),
        text: z.string().min(1)
      })
    )
    .optional(),
  mountInstructions: z.object({
    systemPromptAddition: z.string().default(""),
    recommendedTools: z.array(z.string()).default([])
  }),
  changelog: z.string().optional(),
  priceWei: z.string().min(1),
  licenseDurationDays: z.number().int().positive()
});

function result(structuredContent: unknown, summary?: string) {
  return {
    content: [
      {
        type: "text" as const,
        text: summary ?? toJsonText(structuredContent)
      }
    ],
    structuredContent: toJsonValue(structuredContent) as Record<string, unknown>
  };
}

function parseDraftJson(draftJson: string): PublishDraftInput {
  const parsed = JSON.parse(draftJson) as unknown;
  return publishDraftSchema.parse(parsed);
}

export function registerKineticsTools(server: McpServer, service: KineticsMcpService): void {
  server.registerTool(
    "memory_pass_status",
    {
      title: "Memory Pass Status",
      description: "Return the configured wallet's current Memory Pass state, quota, expiry, and latest index pointers.",
      inputSchema: z.object({})
    },
    async () => result(await service.memoryPassStatus())
  );

  server.registerTool(
    "memory_pass_list_plans",
    {
      title: "List Memory Pass Plans",
      description: "List active Memory Pass plans and their current on-chain pricing.",
      inputSchema: z.object({})
    },
    async () => result(await service.memoryPassListPlans())
  );

  server.registerTool(
    "memory_pass_buy",
    {
      title: "Buy Memory Pass",
      description: "Buy a Memory Pass using the exact on-chain price for the selected plan.",
      inputSchema: z.object({
        plan_id: z.number().int().positive()
      })
    },
    async ({ plan_id }) => result(await service.memoryPassBuy(plan_id))
  );

  server.registerTool(
    "memory_pass_renew",
    {
      title: "Renew Memory Pass",
      description: "Renew an existing Memory Pass, optionally switching to a different plan.",
      inputSchema: z.object({
        vault_id: z.number().int().positive(),
        plan_id: z.number().int().positive()
      })
    },
    async ({ vault_id, plan_id }) => result(await service.memoryPassRenew(vault_id, plan_id, "renew"))
  );

  server.registerTool(
    "memory_pass_upgrade",
    {
      title: "Upgrade Memory Pass",
      description: "Upgrade a Memory Pass by renewing it onto a different active plan.",
      inputSchema: z.object({
        vault_id: z.number().int().positive(),
        plan_id: z.number().int().positive()
      })
    },
    async ({ vault_id, plan_id }) => result(await service.memoryPassRenew(vault_id, plan_id, "upgrade"))
  );

  server.registerTool(
    "memory_add",
    {
      title: "Add Private Memory",
      description: "Encrypt and store a private memory entry with a fast local vault update, then anchor the new memory root on-chain.",
      inputSchema: z.object({
        text: z.string().min(1),
        title: z.string().default(""),
        tags: z.array(z.string()).default([]),
        namespaces: z.array(z.string()).default([]),
        memory_type: memoryTypeSchema.default("episodic")
      })
    },
    async ({ text, title, tags, namespaces, memory_type }) =>
      result(await service.memoryAdd({ text, title, tags, namespaces, memoryType: memory_type }))
  );

  server.registerTool(
    "memory_query",
    {
      title: "Query Private Memory",
      description:
        "Search only the private memory vault for entries whose title, summary, tags, namespaces, or text match the query. Use specific names, phrases, tags, or topics. Broad words like plan, info, or test are not good inventory queries and may return no results if no stored memory actually matches.",
      inputSchema: z.object({
        query: z.string().min(1),
        top_k: z.number().int().min(1).max(20).default(5)
      })
    },
    async ({ query, top_k }) => result(await service.memoryQuery(query, top_k))
  );

  server.registerTool(
    "memory_summary",
    {
      title: "Summarize Private Memory",
      description: "Return a plain-English summary of what is currently stored in the private vault snapshot.",
      inputSchema: z.object({})
    },
    async () => {
      const summary = await service.memorySummary();
      return result(summary, summary.summary);
    }
  );

  server.registerTool(
    "memory_stats",
    {
      title: "Memory Stats",
      description:
        "Return vault usage, counts by memory type, quota information, and recent items. Use this when you want inventory or overview rather than semantic recall.",
      inputSchema: z.object({})
    },
    async () => result(await service.memoryStats())
  );

  server.registerTool(
    "memory_sync",
    {
      title: "Sync Memory Snapshot",
      description: "Pull the latest vault snapshot from chain and storage and merge it into the current MCP session cache.",
      inputSchema: z.object({})
    },
    async () => result(await service.memorySync())
  );

  server.registerTool(
    "memory_push_index",
    {
      title: "Push Memory Index",
      description: "Upload the current encrypted vault snapshot and update the Memory Pass latest-index pointer for cross-client sync.",
      inputSchema: z.object({})
    },
    async () => result(await service.memoryPushIndex())
  );

  server.registerTool(
    "memory_pull_index",
    {
      title: "Pull Memory Index",
      description: "Pull a vault snapshot by blob root, or pull the latest snapshot referenced by the Memory Pass if no blob id is provided.",
      inputSchema: z.object({
        index_blob_id: z.string().default("")
      })
    },
    async ({ index_blob_id }) => result(await service.memoryPullIndex(index_blob_id))
  );

  server.registerTool(
    "memory_verify",
    {
      title: "Verify Memory Proof",
      description: "Verify one or more Merkle inclusion proofs against the on-chain private memory root history.",
      inputSchema: z.object({
        proof_json: z.string().min(2)
      })
    },
    async ({ proof_json }) => result(await service.memoryVerify(proof_json))
  );

  server.registerTool(
    "skill_search",
    {
      title: "Search Public Skill Packs",
      description: "Search public preview manifests for listed skill packs by keyword, tags, and pack kind.",
      inputSchema: z.object({
        keyword: z.string().default(""),
        tags: z.array(z.string()).default([]),
        pack_kind: z.union([packKindSchema, z.literal("")]).default("")
      })
    },
    async ({ keyword, tags, pack_kind }) => result(await service.skillSearch(keyword, tags, pack_kind as PackKind | ""))
  );

  server.registerTool(
    "skill_get",
    {
      title: "Get Skill Pack",
      description: "Read the current on-chain state and preview manifest for one public skill pack.",
      inputSchema: z.object({
        pack_id: z.number().int().positive()
      })
    },
    async ({ pack_id }) => result(await service.skillGet(pack_id))
  );

  server.registerTool(
    "skill_buy",
    {
      title: "Buy Skill Pack License",
      description: "Purchase a timed skill-pack license and wait briefly for the creator to publish an access grant.",
      inputSchema: z.object({
        pack_id: z.number().int().positive()
      })
    },
    async ({ pack_id }) => result(await service.skillBuy(pack_id))
  );

  server.registerTool(
    "skill_list_owned",
    {
      title: "List Owned Skills",
      description: "List the configured wallet's pack licenses, expiry, grant state, and local mount status.",
      inputSchema: z.object({})
    },
    async () => result(await service.skillListOwned())
  );

  server.registerTool(
    "skill_mount",
    {
      title: "Mount Skill Pack",
      description: "Download a buyer access grant, decrypt the pack bundle, and mount it into the current MCP session.",
      inputSchema: z.object({
        pack_id: z.number().int().positive()
      })
    },
    async ({ pack_id }) => result(await service.skillMount(pack_id))
  );

  server.registerTool(
    "skill_publish_access_grant",
    {
      title: "Publish Skill Access Grant",
      description: "As the pack creator, publish a buyer access grant for a license using locally cached pack version metadata.",
      inputSchema: z.object({
        license_id: z.number().int().positive(),
        version: z.number().int().positive().optional()
      })
    },
    async ({ license_id, version }) => result(await service.skillPublishAccessGrant(license_id, version))
  );

  server.registerTool(
    "skill_unmount",
    {
      title: "Unmount Skill Pack",
      description: "Remove a mounted skill pack from the current MCP session.",
      inputSchema: z.object({
        pack_id: z.number().int().positive()
      })
    },
    async ({ pack_id }) => result(await service.skillUnmount(pack_id))
  );

  server.registerTool(
    "skill_publish",
    {
      title: "Publish Skill Pack",
      description: "Parse a creator draft JSON payload, upload the preview and bundle, mint a public pack, and activate sale terms.",
      inputSchema: z.object({
        draft_json: z.string().min(2)
      })
    },
    async ({ draft_json }) => result(await service.skillPublish(parseDraftJson(draft_json)))
  );

  server.registerTool(
    "skill_publish_version",
    {
      title: "Publish Skill Pack Version",
      description: "Upload a new encrypted bundle and preview manifest for an existing pack version.",
      inputSchema: z.object({
        pack_id: z.number().int().positive(),
        draft_json: z.string().min(2)
      })
    },
    async ({ pack_id, draft_json }) => result(await service.skillPublishVersion(pack_id, parseDraftJson(draft_json)))
  );
}
