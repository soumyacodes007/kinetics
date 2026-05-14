# Frontend Guide

This file is the frontend handoff for `apps/web`.

The frontend is responsible for:

- wallet connect
- Memory Pass purchase and renewal
- private memory write and query UX
- creator pack publishing UX
- public marketplace browse and buy UX
- owned pack mount and unmount UX

The frontend is not responsible for:

- running MCP tools
- holding private memory on a backend
- introducing a database for MVP
- making private memory public
- reimplementing storage or contract logic outside `@kinetics/core`

## Product Scope

Phase 1 is the required MVP:

- buy a `MemoryPass`
- derive a vault key in the browser
- write encrypted private memory
- read the same vault from another compatible client via MCP

Phase 2 is the marketplace:

- create and publish a pack
- browse public packs
- buy a timed license
- mount and use owned packs

The web app should be thin. Most business logic should come from `@kinetics/core` and contract metadata from `@kinetics/abi`.

## Recommended Route Map

Use the Next.js App Router under `apps/web/src/app`.

```text
/
/buy-pass
/memory
/creator
/marketplace
/marketplace/[packId]
/owned-packs
```

Optional later routes:

- `/settings`
- `/creator/[packId]`

## Route Responsibilities

### `/`

Purpose:

- explain the two product surfaces
- let the user connect wallet
- direct them to the correct next action

Needs:

- wallet status
- current pass state if connected
- basic CTA routing

Suggested blocks:

- hero with `Private Memory Pass` and `Skill Pack Marketplace`
- wallet connect button
- current pass badge: `No pass`, `Active`, `Expired`
- CTA buttons:
  - `Buy Pass`
  - `Open Memory`
  - `Browse Marketplace`
  - `Creator Studio`

### `/buy-pass`

Purpose:

- show available pass plans
- buy first pass
- renew existing pass
- show quota and expiry

Needs from `@kinetics/core`:

- `MemoryPassClient`
- `KINETICS_DEPLOYED_ADDRESSES`
- plan constants from `constants/plans`

Required UI:

- wallet gate
- list of available plans
- current pass card
- buy button per plan
- renew button for active or expired pass
- tx pending and tx success states

Required reads:

- `memoryPass.getPlan(planId)`
- `memoryPass.getPassByOwner(owner)`
- `memoryPass.isPassActive(vaultId)`

Required writes:

- `memoryPass.buyPass(planId, priceWei)`
- `memoryPass.renewPass(vaultId, planId, priceWei)`

Rules:

- use the exact `priceWei` returned from the contract
- do not hardcode payment values in the UI
- if the user has no pass, primary CTA is `Buy`
- if the user has a pass, show current plan, expiry, quota, latest index version

### `/memory`

Purpose:

- show private vault status
- add memory
- search/query memory
- inspect recent memories

Needs from `@kinetics/core`:

- `getVaultKeyTypedData`
- `deriveVaultMasterKeyFromSignature`
- `pullVaultIndex`
- `addMemory`
- `queryMemory`
- `syncVaultSnapshots`
- `MemoryPassClient`
- `MemoryRegistryClient`

Required UI:

- wallet gate
- pass status card
- vault stats:
  - latest root
  - snapshot version
  - bytes used
  - write count
  - recent entry count
- memory composer:
  - text
  - title optional
  - summary optional
  - tags
  - namespaces
  - source client label
- query box
- recent memories list
- query results list with score and metadata

Required flow:

1. Load pass state from chain.
2. Ask user to sign the vault-key message.
3. Derive the vault master key in browser memory only.
4. Pull the latest vault snapshot from storage.
5. Allow write and query operations against that snapshot.

Rules:

- never store the vault master key in a database
- do not send plaintext memory to any backend for MVP
- private memory must never appear in marketplace views
- if no active pass exists, route user back to `/buy-pass`

Write action:

- `addMemory(...)` should handle encryption, blob upload, snapshot update, Merkle rebuild, and chain update

Query action:

- `queryMemory(...)` should rank candidate entries and decrypt the top matches

### `/creator`

Purpose:

- create and publish public skill packs

Needs from `@kinetics/core`:

- `createPackDraft`
- `publishPack`
- `KnowledgePackClient`
- `PackLicenseClient`
- storage manifest helpers

Required UI:

- wallet gate
- pack form:
  - title
  - slug
  - summary
  - description
  - tags
  - namespaces
  - pack kind: `skill_only`, `knowledge_only`, `hybrid`
  - price
  - license duration days
- bundle input:
  - markdown
  - code snippets
  - notes
  - optional attached files
- preview section
- publish button
- publish result state:
  - preview root
  - bundle root
  - transaction hashes

Required flow:

1. Build the public preview manifest.
2. Build the encrypted bundle payload.
3. Upload preview manifest and bundle.
4. Mint the pack or publish a new version.
5. Set sale terms.

Rules:

- preview manifest is public and searchable
- encrypted bundle is not public plaintext
- do not auto-publish anything from the private vault
- publication must be explicit

### `/marketplace`

Purpose:

- browse public packs
- filter by keyword, tag, and kind
- navigate to a pack detail page

Needs from `@kinetics/core`:

- `KnowledgePackClient`
- `readPreviewManifest`
- retrieval helpers if local search is used

Required UI:

- search box
- tag filters
- pack kind filter
- result cards with:
  - title
  - slug
  - summary
  - tags
  - creator
  - price
  - license duration
  - pack kind

Required flow:

- load pack ids and current preview roots from chain
- fetch preview manifests from storage
- filter client-side for MVP

Rules:

- only public preview manifests belong here
- private memory entries must never be indexed here

### `/marketplace/[packId]`

Purpose:

- show one pack in detail
- buy a timed license

Needs from `@kinetics/core`:

- `KnowledgePackClient`
- `PackLicenseClient`
- `buyLicense`
- `readPreviewManifest`

Required UI:

- manifest detail
- creator info
- current version
- price
- duration
- buy button
- owned status if the wallet already has an active license

Required flow:

1. Read pack state from chain.
2. Read preview manifest from storage.
3. Read sale terms from chain.
4. When buying, generate buyer key material as required by the license flow.
5. Call `buyLicense(...)` with exact `priceWei`.

Rules:

- use the exact sale price from chain
- show clear ownership state: `Not owned`, `Active license`, `Expired license`

### `/owned-packs`

Purpose:

- list buyer licenses
- mount owned packs into the local app session
- unmount packs
- show expiry

Needs from `@kinetics/core`:

- `PackLicenseClient`
- `KnowledgePackClient`
- `mountPack`
- `unmountPack`
- `loadAccessGrant`

Required UI:

- wallet gate
- owned license list
- expiry and remaining time
- mount button
- unmount button
- mounted pack list

Required flow:

1. Load owned licenses from chain.
2. Determine which are active.
3. For mount, fetch the buyer access grant and encrypted bundle.
4. Decrypt and mount into local app state.

Rules:

- mounted packs are a local session concern
- mounting is not the same as ownership transfer
- expired licenses must not mount successfully

## Shared Package Usage

Frontend code should not talk to contracts or 0G storage directly from random page files. Keep the app layered like this:

```text
app routes
  -> hooks
  -> feature services in apps/web/src/lib
  -> @kinetics/core
  -> @kinetics/abi
```

Recommended local wrappers inside `apps/web/src/lib`:

- `lib/contracts.ts`
- `lib/storage.ts`
- `lib/vault.ts`
- `lib/packs.ts`
- `lib/licenses.ts`
- `lib/wallet.ts`

Suggested hooks:

- `useWalletAccount()`
- `useMemoryPass()`
- `useVaultSession()`
- `useVaultQuery()`
- `useMarketplaceSearch()`
- `usePackDetail(packId)`
- `useOwnedPacks()`

## Wallet And Signing Flow

The vault key flow is critical.

The browser should:

1. connect the wallet
2. read the user pass to get `vaultId`
3. request an EIP-712 signature
4. derive the vault master key locally
5. keep that key in memory for the current session

Use the same signing convention as the shared package and plan:

- helper: `getVaultKeyTypedData(chainId, vaultId, version)`
- EIP-712 domain name: `0G Mem`
- typed message fields: `vaultId`, `version`

MVP rule:

- use a stable vault-key rotation version such as `0` for now
- do not derive a new vault master key from the live snapshot version on every write
- key rotation can be added later, but Demo A needs one stable vault key across clients

Do not:

- derive encryption keys from raw private keys
- persist the derived vault key in plaintext
- move this flow to a backend for MVP

## Data And State Expectations

Keep two state buckets separate:

### Public state

- pass plans
- pass status
- public pack previews
- public sale terms
- public license status

This can be cached aggressively.

### Private session state

- vault master key
- decrypted vault snapshot
- decrypted query results
- mounted decrypted pack content

This should stay in memory and be cleared on disconnect or refresh unless the team later adds a secure persistence model.

## Error States To Handle

Required error states:

- wallet not connected
- wrong chain
- no Memory Pass
- expired Memory Pass
- insufficient funds for pass purchase
- insufficient funds for license purchase
- quota exceeded
- storage upload failure
- signature rejected
- corrupt or undecryptable snapshot
- pack license expired
- missing access grant

Every write flow should have:

- idle
- signing
- pending transaction
- pending storage upload
- syncing
- success
- failed

## MVP Guardrails

Do not add for MVP:

- a separate backend API for core logic
- Supabase
- Postgres
- a vector database
- server-side private memory indexing
- automatic publishing from private memory into the marketplace
- complex social features

If something can be done with `@kinetics/core`, do it there and keep the frontend focused on UX and session state.

## Browser Caveat

Current `@kinetics/core` storage helpers are Node-oriented because the stable 0G SDK flow is file-based.

That means the frontend team should choose one of these paths:

1. add a browser-safe storage adapter in `@kinetics/core`
2. add a very thin web-side route handler only for file-based upload and download bridging

Do not fork the business logic. The browser-specific work should stay as an adapter layer around the shared package.

## Minimum Build Order

Frontend implementation order should be:

1. wallet connect and chain config
2. `/buy-pass`
3. `/memory`
4. vault signing and sync UX
5. `/marketplace`
6. `/marketplace/[packId]`
7. `/owned-packs`
8. `/creator`

If time is tight, complete Demo A first:

- `/buy-pass`
- `/memory`

Everything else is Phase 2.
