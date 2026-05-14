# Kinetics

**Repo strategy:** start a fresh TypeScript-first repo for Kinetics and use `/0g-agent-skills` and `/0G-Mem` only as implementation inspiration/reference. Reuse the ideas and logic from `0G-Mem`, but do not carry over its Python repo structure or its Python-specific implementation choices. Because Kinetics is TypeScript-first, it should use the 0G TypeScript SDK directly and must not keep the old Python-to-Node subprocess bridge from `0G-Mem`.

## 1. What We Are Building

We are building **Kinetics**, a **portable memory and skill-pack layer for AI agents** with two separate products on top of the same 0G-backed infrastructure:

1. **Private Memory Pass**
   - A user buys a pass on 0G Chain.
   - That pass unlocks a private encrypted memory vault.
   - Any connected MCP-compatible agent can read and write to the same vault.
   - The memory belongs to the user, not to a single app.

2. **Public Skill Pack Marketplace**
   - Experts create curated "skill packs" made of Markdown, code snippets, instructions, and optional attached knowledge/memory corpus.
   - The creator mints the pack as an iNFT-backed asset and lists it for sale.
   - Buyers purchase a **time-based license**, not ownership.
   - Agents can search, buy, mount, and use these packs through MCP or the frontend.

The key product distinction:

- **Private personal memory** is private by default and never public unless explicitly exported.
- **Public skill packs** are explicit creator-published assets for monetization.

---

## 2. Product Goal

Current agent tools are siloed:

- Claude forgets the user between sessions.
- Codex/Cursor do not automatically know what another agent learned.
- Expert knowledge is trapped in repos, docs, chats, and local files.

This project solves both:

- **Memory portability** across agents for the same user.
- **Knowledge monetization** for creators packaging reusable skill/context bundles.

---

## 3. Primary Demo

### Demo A: Cross-Agent Private Memory

1. Open Codex without MCP memory connected.
2. Ask: "What is my preferred hackathon track?"
3. Codex cannot answer because it has no memory.
4. Go to OpenClaw, connect wallet, buy a **Memory Pass**.
5. In OpenClaw, say: "My preferred hackathon track is Track 3."
6. OpenClaw writes this into the user's private 0G memory vault.
7. Go back to Codex with the 0G memory MCP connected.
8. Ask the same question again.
9. Codex reads the synced private memory vault and answers correctly.

### Demo B: Public Skill Pack Marketplace

1. Creator opens frontend, creates a "Solidity Research Skill Pack".
2. Creator uploads Markdown/code/examples and optional attached knowledge corpus.
3. Creator mints the pack, sets price and license duration, and lists it.
4. Buyer searches for the pack by keyword through frontend or MCP.
5. Buyer purchases the pack license.
6. Buyer mounts the pack into their agent.
7. The agent can now use that expert pack during answers.

Demo A is required.

Demo B is the marketplace bonus demo and should be built if time allows after Demo A is stable.

---

## 4. Core Product Rules

### Rule 1: Personal memory is private by default

Everything a user says in normal conversation is treated as private unless explicitly exported into a public skill pack.

Examples of private memory:

- personal profile
- preferences
- hackathon context
- coding preferences
- wallet rules
- ordinary chats with Claude/OpenClaw/Codex

This data must:

- be encrypted before storage
- not be publicly searchable
- not appear in marketplace results
- only be available to the user's own agents or explicitly granted agents

### Rule 2: Public monetization requires explicit publishing

If a user wants to monetize something, they must create a **Skill Pack** explicitly.

That means:

- selecting content to publish
- defining title/description/price
- minting the pack asset
- listing it in the marketplace

Nothing from private memory becomes public automatically.

### Rule 3: iNFT is proof of creator ownership, not perfect DRM

The iNFT proves:

- who created the pack
- which bundle/version is the canonical one
- provenance and update history

It does **not** guarantee impossible-to-copy content after a buyer decrypts it locally.

For MVP, the iNFT is used for:

- creator ownership
- provenance
- version history
- marketplace identity

The actual buyer right is a **license**, not transfer of ownership.

### Rule 4: Buyers purchase timed access

When a buyer purchases a pack, they receive:

- access for a fixed period
- creator updates while their license is active
- ability to mount the pack in their agent while active

They do not receive:

- transfer ownership of the pack
- permanent rights to all future versions unless they renew

---

## 5. High-Level Architecture

For the hackathon MVP, the system should be implemented with **three application areas plus contracts**:

1. **Frontend**
   - wallet connect
   - pass purchase
   - private memory dashboard
   - creator studio
   - marketplace search/detail
   - owned packs and mounting

2. **Shared package**
   - all storage logic
   - encryption/decryption
   - vault sync
   - retrieval logic
   - pack publishing/mounting logic
   - chain wrappers

3. **MCP Server**
   - private memory tools
   - skill pack marketplace tools
   - pack mount/unmount tools
   - entitlement checks
   - direct reads from chain + storage using the shared package

4. **0G Chain Contracts**
   - MemoryPass
   - MemoryRegistry
   - KnowledgePackNFT
   - PackLicenseRegistry

5. **0G Storage / Optional DA**
   - encrypted private memory blobs
   - encrypted vault index snapshots
   - public preview manifests
   - encrypted skill pack bundles
   - encrypted buyer access grants

### No dedicated backend for MVP

If we avoid a dedicated backend for the hackathon:

- the **frontend publishes pack manifests directly**
- the **MCP server reads chain + storage directly**
- the shared `package/` contains the reusable read/write logic used by both

This keeps the MVP smaller and is the preferred hackathon architecture.

---

## 6. Identity and Key Model

### 6.1 User identity

- Canonical owner identity = wallet address
- Canonical personal vault identity = `vaultId`
- `vaultId` = MemoryPass tokenId

### 6.2 Personal vault key

We should not describe the product as "derive everything directly from the raw private key".

Use this model instead:

- Browser clients derive the vault key from an **EIP-712 typed signature**:
  - domain: `0G Mem`
  - message: `VaultKey(chainId, vaultId, version)`
- Apply HKDF-SHA256 to the signature output to produce a symmetric `vaultMasterKey`
- Use that key to encrypt personal memory and index snapshots

For local MCP clients:

- the client already has `AGENT_KEY`
- it signs the same typed message locally
- it derives the same `vaultMasterKey`

Result:

- frontend and local MCP can derive the same vault key
- backend never needs the plaintext vault key
- storage providers cannot read the data

### 6.3 Pack keys

Each public pack version gets a random symmetric content key:

- `packVersionKey`

The encrypted pack bundle is stored on 0G Storage with this key.

When a buyer purchases a license:

- the access broker encrypts `packVersionKey` for that buyer
- the buyer receives a buyer-specific encrypted access grant

---

## 7. Onchain Contracts

## 7.1 MemoryPass

Purpose:

- represents user entitlement for private memory
- creates canonical `vaultId`
- stores plan and latest vault index pointer

This should be **non-transferable in MVP**.

Reason:

- transferring a memory pass should not silently transfer personal memory ownership in the demo version

### MemoryPass state

```solidity
struct PassPlan {
    uint256 durationSeconds;
    uint256 storageQuotaBytes;
    uint256 writeQuotaPerPeriod;
    uint256 periodSeconds;
    uint256 priceWei;
    bool active;
}

struct PassState {
    uint256 vaultId;
    address owner;
    uint256 planId;
    uint256 expiresAt;
    uint256 storageQuotaBytes;
    uint256 writeQuotaPerPeriod;
    uint256 latestIndexVersion;
    bytes32 latestIndexRoot;
    bytes32 latestIndexBlobRoot;
}
```

### MemoryPass functions

```solidity
buyPass(uint256 planId) external payable returns (uint256 vaultId);
renewPass(uint256 vaultId, uint256 planId) external payable;
getPassByOwner(address owner) external view returns (PassState memory);
setLatestIndex(
    uint256 vaultId,
    uint256 version,
    bytes32 indexRoot,
    bytes32 indexBlobRoot
) external;
isPassActive(uint256 vaultId) external view returns (bool);
```

### MVP plan model

Use **time + quota**.

Example testnet plans:

- Starter: 30 days, 25 MB, 2,000 writes
- Pro: 90 days, 200 MB, 20,000 writes

### Pass behavior

- If pass expires, reads of already-owned private memory still work.
- New writes and sync updates are blocked until renewal.

## 7.2 MemoryRegistry

Purpose:

- append-only history of personal memory state roots
- verifiable proof trail for private vault state changes

This contract is reusable from the current project with minor cleanup.

### MemoryRegistry functions

```solidity
updateRoot(bytes32 merkleRoot, bytes32 daTxHash) external;
getLatest(address agent) external view returns (MemoryState memory);
getAt(address agent, uint256 index) external view returns (MemoryState memory);
historyLength(address agent) external view returns (uint256);
verifyInclusion(address agent, bytes32 leaf, bytes32[] calldata proof, bytes32 root)
    external
    pure
    returns (bool);
```

## 7.3 KnowledgePackNFT

Purpose:

- creator-owned public pack identity
- provenance
- version tracking
- marketplace listing anchor

This should use ERC-7857-inspired semantics because the asset is "intelligent content", but the first version can stay implementation-light if needed.

### KnowledgePackNFT state

```solidity
struct PackState {
    uint256 packId;
    address creator;
    string slug;
    uint8 packKind; // 0 = skill_only, 1 = knowledge_only, 2 = hybrid
    uint256 currentVersion;
    bytes32 currentPreviewRoot;
    bytes32 currentBundleRoot;
    uint256 priceWei;
    uint256 licenseDurationSeconds;
    bool active;
}
```

### KnowledgePackNFT functions

```solidity
mintPack(
    string calldata slug,
    uint8 packKind,
    bytes32 previewRoot,
    bytes32 bundleRoot
) external returns (uint256 packId);

publishVersion(
    uint256 packId,
    uint256 version,
    bytes32 previewRoot,
    bytes32 bundleRoot
) external;

setSaleTerms(
    uint256 packId,
    uint256 priceWei,
    uint256 licenseDurationSeconds,
    bool active
) external;
```

## 7.4 PackLicenseRegistry

Purpose:

- buyer license state
- timed entitlement
- buyer-specific access grant history

### PackLicenseRegistry state

```solidity
struct LicenseState {
    uint256 licenseId;
    uint256 packId;
    address buyer;
    uint256 startsAt;
    uint256 expiresAt;
    bytes buyerPubkey;
    uint256 latestGrantVersion;
    bytes32 latestGrantRoot;
    bool active;
}
```

### PackLicenseRegistry functions

```solidity
buyLicense(uint256 packId, bytes calldata buyerPubkey)
    external
    payable
    returns (uint256 licenseId);

renewLicense(uint256 licenseId) external payable;
hasActiveLicense(uint256 packId, address buyer) external view returns (bool);
publishAccessGrant(
    uint256 licenseId,
    uint256 grantVersion,
    bytes32 grantRoot
) external;
```

---

## 8. Offchain Data Schemas

## 8.0 Hackathon retrieval scope

For the hackathon MVP, do **not** use local embeddings or Python `sentence-transformers`.

The retrieval layer should use only:

- `title`
- `summary`
- `tags`
- `namespaces`
- keyword search
- simple text scoring
- optional recency/strength boosts

Reason:

- this is enough for the core demo
- it reduces implementation risk
- it keeps the TypeScript stack much simpler
- it avoids local ML/runtime complexity that is not necessary to prove the product

Embeddings can be added later as a post-hackathon improvement.

## 8.1 Private memory blob

Stored on 0G Storage, encrypted.

```json
{
  "vaultId": 12,
  "memoryId": "mem_01JV...",
  "memoryType": "episodic",
  "sourceClient": "openclaw",
  "createdAt": 1747210000,
  "updatedAt": 1747210000,
  "plaintext": {
    "title": "Hackathon preference",
    "text": "My preferred hackathon track is Track 3",
    "summary": "Preferred hackathon track",
    "tags": ["hackathon", "preference"],
    "namespaces": ["personal", "hackathon"]
  }
}
```

This entire object is encrypted before upload.

## 8.2 Encrypted vault index snapshot

This is the **canonical shared state** used for cross-client sync.

```json
{
  "vaultId": 12,
  "version": 7,
  "bytesUsed": 18233,
  "writeCountCurrentPeriod": 31,
  "merkleRoot": "0x...",
  "entries": [
    {
      "memoryId": "mem_01JV...",
      "blobRoot": "0x...",
      "memoryType": "episodic",
      "title": "Hackathon preference",
      "summary": "Preferred hackathon track",
      "tags": ["hackathon", "preference"],
      "namespaces": ["personal", "hackathon"],
      "createdAt": 1747210000,
      "lastAccessedAt": 1747210400,
      "strength": 0.78,
      "stale": false,
      "sourceClient": "openclaw"
    }
  ]
}
```

This snapshot is encrypted with `vaultMasterKey`.

The title, summary, tags, and namespaces are repeated in the encrypted index because they are required for fast cross-client retrieval. They are not public; they are only visible to clients that can decrypt the vault snapshot.

## 8.3 Public preview manifest for marketplace

Public and searchable.

```json
{
  "packId": 44,
  "slug": "solidity-research-pack",
  "title": "Solidity Research Skill Pack",
  "shortDescription": "Audit patterns, common vuln heuristics, and code review workflows",
  "packKind": "hybrid",
  "tags": ["solidity", "security", "auditing"],
  "keywords": ["reentrancy", "auth", "erc20", "foundry"],
  "priceWei": "10000000000000000",
  "licenseDurationDays": 30,
  "previewFiles": [
    "README.md",
    "examples/sample-report.md"
  ],
  "currentVersion": 3,
  "creator": "0x...",
  "createdAt": 1747210000,
  "updatedAt": 1747210900
}
```

## 8.4 Encrypted pack bundle

Encrypted with `packVersionKey`.

```json
{
  "packId": 44,
  "version": 3,
  "packKind": "hybrid",
  "files": [
    {
      "path": "SKILL.md",
      "content": "..."
    },
    {
      "path": "examples/reentrancy-checklist.md",
      "content": "..."
    }
  ],
  "knowledgeDocs": [
    {
      "docId": "doc_1",
      "title": "Common auth bypass patterns",
      "text": "...",
      "embedding": [0.1, 0.2, 0.3]
    }
  ],
  "mountInstructions": {
    "systemPromptAddition": "Use this pack for Solidity security tasks",
    "recommendedTools": ["grep", "foundry", "slither"]
  },
  "changelog": "Added unsafe delegatecall review checklist"
}
```

## 8.5 Buyer access grant

Encrypted for the buyer.

```json
{
  "licenseId": 91,
  "packId": 44,
  "version": 3,
  "bundleRoot": "0x...",
  "encryptedVersionKey": "0x...",
  "issuedAt": 1747211000,
  "expiresAt": 1749803000
}
```

---

## 9. Storage and Search Strategy

### No DB for private memory

For the hackathon MVP, private memory must **not** depend on a traditional database.

Private memory state is composed from:

- encrypted memory blobs on 0G Storage
- encrypted vault index snapshots on 0G Storage
- MemoryPass latest index pointer on 0G Chain
- MemoryRegistry root history on 0G Chain

This means:

- no Postgres for private memory
- no Supabase for private memory
- no central vector DB for private memory

The user's private vault should be reconstructable from 0G Storage + 0G Chain + the user's vault key.

### Private memory

Private memory is **not** publicly searchable.

Private retrieval is done only by:

- the user's MCP clients
- authorized agent runtimes
- local semantic search over the user's decrypted index

### Public pack search

For the hackathon MVP, there is no dedicated search backend or database.

Pack discovery is **chain-event-driven**:

- scan `KnowledgePackNFT` mint and publish events directly from 0G Chain
- resolve each pack's public preview manifest from 0G Storage using the on-chain blob root
- filter and rank results client-side using title, tags, and keywords from the manifest

This means:

- no Goldsky indexer required for MVP
- no Postgres for pack manifests
- no backend search API

For the hackathon demo, the creator and buyer are controlled by the demonstrator. The buyer can navigate directly to a known `packId` or the frontend scans recent chain events to show available packs. A proper search DB (Goldsky + Postgres) can be added post-hackathon.

Search is only over public preview manifests, not private memory.

---

## 10. MCP Tool Surface

## 10.1 Private memory tools

```text
memory_pass_status()
memory_pass_list_plans()
memory_pass_buy(plan_id)
memory_pass_renew(vault_id, plan_id)
memory_pass_upgrade(vault_id, plan_id)
memory_add(text, title="", tags=[], namespaces=[], memory_type="episodic")
memory_query(query, top_k=5)
memory_summary()
memory_stats()
memory_sync()
memory_push_index()
memory_pull_index(index_blob_id="")
memory_verify(proof_json)
```

Behavior:

- all write tools check active pass + quota
- read tools work even after pass expiry for existing local/owned vault data
- pass management tools are used before the first write or when renewal is needed

### Private memory write behavior

When an agent wants to store a memory, it should call `memory_add`.

Tool contract:

```text
memory_add(
  text: string,
  title: string = "",
  tags: string[] = [],
  namespaces: string[] = [],
  memory_type: "episodic" | "semantic" | "procedural" | "working" = "episodic"
)
```

Rules:

- `text` is required and is the full memory content.
- `title` is optional. If omitted, the memory service generates one deterministically from the content.
- `tags` are optional. The caller may pass them, or the memory service may derive them.
- `namespaces` are optional group labels used for retrieval narrowing, such as `hackathon`, `coding`, `wallet`, `personal`.
- `memory_type` defaults to `episodic` for normal user conversations.

Write pipeline:

1. MCP agent decides a message is worth remembering.
2. MCP agent calls `memory_add(...)`.
3. Memory service builds a normalized plaintext object with:
   - `title`
   - `text`
   - `summary`
   - `tags`
   - `namespaces`
   - `memory_type`
   - `sourceClient`
4. The full plaintext object is encrypted with the user's `vaultMasterKey`.
5. The encrypted blob is uploaded to 0G Storage.
6. A `memoryId` is created and added to the encrypted vault index snapshot.
7. The index snapshot version increments.
8. The new snapshot is uploaded to 0G Storage.
9. `MemoryPass.setLatestIndex(...)` updates the canonical latest snapshot pointer.
10. `MemoryRegistry.updateRoot(...)` anchors the new private-memory Merkle root.

The frontend and OpenClaw should expose this to the user as:

- "Remember this"
- "Save to memory"
- automatic memory write after explicit user confirmation

For the hackathon demo, the simplest flow is explicit:

- user tells OpenClaw a fact
- OpenClaw calls `memory_add`
- receipt is shown in UI

### Demo-relevant MCP flow

For the primary hackathon demo, use this exact sequence.

OpenClaw side:

1. `memory_pass_list_plans()`
2. `memory_pass_buy(plan_id)`
3. `memory_add(...)`

Codex MCP side:

1. `memory_pass_status()`
2. `memory_pull_index()`
3. `memory_query(...)`

### Title and metadata generation

Users should not be forced to manually title every memory.

Default policy:

- if `title` is passed by the MCP caller, store it as-is
- otherwise derive:
  - `title`: a short 2-6 word label
  - `summary`: one sentence
  - `tags`: 2-5 keywords
  - `namespaces`: optional inferred grouping labels

Example:

- user says: "My preferred hackathon track is Track 3"
- stored memory becomes:
  - `title = "Hackathon preference"`
  - `summary = "Preferred hackathon track is Track 3"`
  - `tags = ["hackathon", "preference"]`
  - `namespaces = ["personal", "hackathon"]`

## 10.2 Marketplace tools

Use the word **skill** in MCP because that matches user expectations.

```text
skill_search(keyword="", tags=[], pack_kind="")
skill_get(pack_id)
skill_buy(pack_id)
skill_list_owned()
skill_mount(pack_id)
skill_unmount(pack_id)
skill_publish(draft_json)
skill_publish_version(pack_id, draft_json)
```

### MCP behavior rules

- `skill_search` searches only public preview manifests
- `skill_buy` performs the purchase and waits for access grant
- `skill_mount` downloads the buyer's encrypted grant and mounts the pack for retrieval
- mounted packs are treated as external knowledge sources, not personal memory

### Retrieval order

When an agent needs context:

1. personal private memory
2. mounted licensed packs
3. merge and rerank
4. return source labels

Source labels must make it clear whether content came from:

- private vault
- mounted pack

### Private memory retrieval behavior

There can be many memories under one wallet, so retrieval cannot depend on a single blob name. Retrieval should use the decrypted vault index snapshot, not a public search database.

The system should treat each memory as an indexed record with:

- `memoryId`
- `title`
- `summary`
- `tags`
- `namespaces`
- `timestamps`
- `strength`
- `stale`

Query pipeline:

1. User asks a question such as: "What is my hackathon preference?"
2. Agent calls `memory_query("hackathon preference", top_k=5)`.
3. MCP server decrypts the latest vault index snapshot.
4. Retrieval runs in two stages:
   - lexical scoring over `title`, `tags`, and `namespaces`
   - keyword/text scoring over `summary` and `text`
5. Scores are merged and reranked.
6. Top matching memory entries are selected.
7. Matching encrypted blobs are fetched from 0G Storage and decrypted.
8. Results are returned with source metadata and proof material.

Retrieval must not rely on exact title matching only.

The title is a strong retrieval hint, but the user may ask:

- "what is my hackathon preference?"
- "which track did I say I liked?"
- "what did I decide about APAC?"

All of these should hit the same memory because retrieval uses both:

- lexical match on title/tags/namespaces
- keyword/text match on summary and text

Recommended ranking formula for MVP:

```text
final_score =
  0.55 * lexical_title_tag_namespace_match +
  0.25 * summary_text_keyword_match +
  0.10 * recency_boost +
  0.10 * strength_boost
```

This is enough for the hackathon version and can be refined later.

### Query result shape

`memory_query` should return:

- `memoryId`
- `title`
- `summary`
- `text`
- `tags`
- `namespaces`
- `score`
- `sourceClient`
- `createdAt`
- proof fields

That gives the calling agent enough signal to answer naturally and cite the relevant memory internally.

---

## 11. Frontend Screens

## 11.1 Buy Pass

- connect wallet
- show available Memory Pass plans
- buy or renew
- show current quota and expiry

## 11.2 Private Memory Dashboard

- latest memory root
- vault usage
- write count
- last sync version
- recent private memories

## 11.3 Creator Studio

- create a skill pack
- upload files and notes
- choose hybrid/skill-only/knowledge-only
- set title/description/tags
- set price and license duration
- mint and publish

## 11.4 Marketplace Search

- keyword search
- tag filters
- pack kind filter
- detail page

## 11.5 Owned Packs

- list active licenses
- mount/unmount packs
- show expiry

---

## 12. Direct MVP Service Responsibilities

There is no mandatory dedicated backend in the hackathon MVP.

Instead:

- the **frontend** performs creator-side publish flows directly through the shared package
- the **MCP server** performs pass checks, vault sync, pack reads, and pack mounting directly through the shared package
- the **shared package** owns storage, chain, crypto, and retrieval logic

If a lightweight helper process is added later, it should remain optional and should not be required for the main demo.

---

## 13. Implementation Flow

## Integration Constraints

These are hard binding rules between the deployed contracts and the TypeScript `package/` layer. Violating them will cause on-chain proof verification to fail silently.

### Merkle tree convention

`MemoryRegistry.sol` `verifyInclusion` uses **sorted keccak256 pair hashing**:

```solidity
if (computed <= sibling) {
    computed = keccak256(abi.encodePacked(computed, sibling));
} else {
    computed = keccak256(abi.encodePacked(sibling, computed));
}
```

The TypeScript vault package **must** generate Merkle proofs with the same convention.

Use `merkletreejs` with these exact options:

```typescript
import { MerkleTree } from "merkletreejs";
import { keccak256 } from "viem";

const tree = new MerkleTree(leaves, keccak256, { sortPairs: true });
```

`sortPairs: true` produces the same sorted ordering as the contract. Any other configuration will produce proofs that fail `verifyInclusion` on-chain.

Do **not** roll a custom Merkle implementation. Use `merkletreejs` + `sortPairs: true` and the proofs will match automatically.

### Exact payment

`MemoryPass.buyPass` and `PackLicenseRegistry.buyLicense` require `msg.value == priceWei` exactly. The frontend must pass the exact plan price with no rounding. Use `viem`'s `parseEther` or read `priceWei` directly from the contract and pass it as-is.

---

## Phase 1: Core private memory demo

1. Create fresh repo.
2. Add `MemoryPass.sol`.
3. Keep/adapt `MemoryRegistry.sol`.
4. Implement pass purchase + latest index pointer logic.
5. Refactor memory SDK to:
   - use `vaultId`
   - use typed-signature-derived vault key
   - treat encrypted index snapshot as canonical shared state
6. Update MCP server to:
   - check pass status
   - auto-pull latest index snapshot
7. Update frontend/OpenClaw integration:
   - buy pass
   - write private memory
8. Validate Demo A end to end.

## Phase 2: Marketplace

1. Add `KnowledgePackNFT.sol`.
2. Add `PackLicenseRegistry.sol`.
3. Add creator studio.
4. Add public preview manifest publishing.
5. Add pack search API and UI.
6. Add MCP marketplace tools.
7. Add buyer mount flow.
8. Validate Demo B end to end.

---

## 14. Fresh Repo Structure

```text
frontend/
  package.json
  next.config.ts
  tsconfig.json
  src/
    app/
      buy-pass/
      memory/
      creator/
      marketplace/
      owned-packs/
    components/
    lib/
    hooks/

package/
  package.json
  tsconfig.json
  src/
    chain/
      memory-pass.ts
      memory-registry.ts
      knowledge-pack.ts
      pack-license.ts
    storage/
      upload.ts
      download.ts
      manifests.ts
      snapshots.ts
    crypto/
      vault-key.ts
      encrypt.ts
      decrypt.ts
    vault/
      add-memory.ts
      query-memory.ts
      push-index.ts
      pull-index.ts
      sync.ts
    retrieval/
      lexical-score.ts
      rank.ts
    packs/
      create-pack.ts
      publish-pack.ts
      mount-pack.ts
      unmount-pack.ts
    licenses/
      buy-license.ts
      access-grant.ts
    types/
      memory.ts
      pass.ts
      pack.ts
      license.ts
    constants/
      chains.ts
      plans.ts

mcp-server/
  package.json
  tsconfig.json
  src/
    server.ts
    tools/
      memory-pass.ts
      memory.ts
      skill-pack.ts
    config/

contracts/
  package.json
  foundry.toml
  src/
    MemoryPass.sol
    MemoryRegistry.sol
    KnowledgePackNFT.sol
    PackLicenseRegistry.sol
  script/
  test/
```

---

## 15. What We Reuse from the Existing 0G Mem Repo

## Reusable

- encrypted blob storage pattern
- Merkle root anchoring
- proof verification concepts
- `memory_push_index` / `memory_pull_index`
- MCP server structure
- local semantic retrieval approach
- frontend wallet integration direction
- 0G Storage bridge approach

## Not reusable as-is

- `MemoryNFT` contract
- direct raw-private-key KDF story
- "one NFT forever equals everything" model
- public/private memory mixed mental model
- DA as mandatory core path on Galileo
- current repo naming if we want a fresh product-first story
- the Python-to-Node subprocess bridge used for 0G Storage in `0G-Mem`; Kinetics should call the 0G TypeScript SDK directly inside the TypeScript package layer

---

## 16. Important MVP Simplifications

- Use native `0G` payments on Galileo testnet.
- Keep `MemoryPass` non-transferable.
- **No dedicated backend for MVP.** The frontend and MCP server call the shared `package/` directly for all storage, chain, and crypto operations.
- **Pack bundles use a shared content key for MVP.** The `packVersionKey` is stored in the on-chain access grant and is the same for all buyers of a given pack version. Buyer-specific key wrapping (encrypting `packVersionKey` per buyer's pubkey) is a post-hackathon improvement. This is acceptable because the plan already states that perfect anti-copy protection is not a goal.
- **Pack discovery is chain-event-driven for MVP.** There is no search DB or Goldsky indexer. The frontend scans `KnowledgePackNFT` events and resolves preview manifests directly from 0G Storage. A Goldsky + Postgres search layer can be added post-hackathon.
- Keep DA optional/fallback because Galileo does not have a frictionless public disperser path for all environments.
- Do not attempt perfect anti-copy protection for purchased packs.

---

## 17. Final Product Summary

This product is not just "decentralized memory".

It is:

- a **private portable memory pass** for users
- plus a **public monetizable skill pack marketplace** for creators
- both accessible through MCP
- both backed by 0G Storage and 0G Chain

The core value:

- teach one agent something once
- every other connected agent can use it
- and experts can sell reusable context/skills without giving up ownership
