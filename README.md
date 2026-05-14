# Kinetics

Kinetics is a TypeScript-first 0G project for portable agent memory and monetizable skill packs.

The product has two layers:

- `Private Memory Pass`: a user-owned vault identity on 0G Chain that unlocks encrypted private memory shared across compatible agents.
- `Public Skill Pack Marketplace`: creator-published packs with timed licenses that agents can buy, mount, and use.

This repo is being built as a fresh codebase. The included `0G-Mem` and `0g-agent-skills` folders are reference material only and are ignored by git.

## Current Status

The smart contract workspace is implemented and deployed on `0g-testnet`.

Deployed on `2026-05-14`:

- `MemoryPass`: `0xE2f5f82F138A6D1d94C3A8fFD6c1dC24D5384Fde`
- `MemoryRegistry`: `0x0Ca3d9da269F1a167365A59513a0428b1c2C9f00`
- `KnowledgePackNFT`: `0xF02c676411a3877770c9b15dfDb64141231D3a6F`
- `PackLicenseRegistry`: `0xFC34fB17db0726B70Df171BBC8CBac792Ae7FFbB`

The deployment record is stored at [contracts/deployments/0g-testnet-1778771313865.json](/C:/Users/soumy/OneDrive/Desktop/kinetics/contracts/deployments/0g-testnet-1778771313865.json:1).

## Repo Layout

```text
contracts/
  src/
    MemoryPass.sol
    MemoryRegistry.sol
    KnowledgePackNFT.sol
    PackLicenseRegistry.sol
    MemoryPass.t.sol
    PackMarketplace.t.sol
  scripts/
    deploy.js
  deployments/
    0g-testnet-*.json
  hardhat.config.js
  foundry.toml
  package.json

plan.md
README.md
```

## Contracts

### MemoryPass

Non-transferable pass contract for private memory access.

- one pass per owner
- paid buy and renew flows
- canonical `vaultId`
- latest encrypted index pointer on-chain
- active-pass gating for writes and sync updates

### MemoryRegistry

Append-only history of memory roots for proof/audit flows.

### KnowledgePackNFT

Creator-owned pack identity with:

- unique slug
- version publishing
- preview root and bundle root tracking
- sale terms for marketplace listing

### PackLicenseRegistry

Timed buyer entitlement layer with:

- paid license purchase and renewal
- active-license checks
- access grant publishing
- creator balance accrual and withdrawal

## Local Development

Requirements:

- Node.js 18+
- npm

Contract workspace:

```bash
cd contracts
npm install
```

Create `contracts/.env`:

```env
PRIVATE_KEY=0xYOUR_PRIVATE_KEY
RPC_URL=https://evmrpc-testnet.0g.ai
```

Build:

```bash
cd contracts
npm run build
```

Run tests:

```bash
cd contracts
npm test
```

Deploy:

```bash
cd contracts
npm run deploy
```

## Verified Result

The current contract suite compiles with:

- Solidity `0.8.24`
- `evmVersion: "cancun"`

Local test status:

- `7 passing (7 solidity)`

## Notes

- `0G-Mem` is a Python reference implementation and is not the target architecture for Kinetics.
- Kinetics should keep shared logic in TypeScript and talk to 0G directly without the old Python-to-Node bridge.
- Deployment secrets are intentionally ignored by git.
