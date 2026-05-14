import { addMemoryFast, buyLicense, createPackDraft, deriveVaultMasterKeyFromSignature, getVaultKeyTypedData, KnowledgePackClient, MemoryPassClient, MemoryRegistryClient, mountPack, PackLicenseClient, publishAccessGrant as publishBuyerAccessGrant, publishVaultSnapshot, publishPack, pullVaultIndex, queryMemory, readPreviewManifest, syncVaultSnapshots, unmountPack, ZeroGStorageReader, ZeroGStorageWriter } from "@kinetics/core";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { ZeroAddress } from "ethers";
import { buildMemoryStats, buildMemorySummaryText, filterSearchablePacks, normalizeProofInput, packKindFromContract } from "./logic.js";
const ZERO_HEX_32 = `0x${"00".repeat(32)}`;
function delay(ms) {
    return new Promise((resolve) => setTimeout(resolve, ms));
}
function ensurePassExists(vaultId) {
    if (vaultId === 0n) {
        throw new Error("No Memory Pass found for the configured wallet");
    }
}
function normalizeTags(values) {
    return [...new Set(values.map((value) => value.trim()).filter(Boolean))];
}
export class KineticsMcpService {
    config;
    ownerAddressPromise;
    storageReader;
    storageWriter;
    memoryPass;
    memoryRegistry;
    knowledgePack;
    packLicense;
    snapshotCache;
    mountedPacks = [];
    creatorPackVersions;
    constructor(config) {
        this.config = config;
        this.ownerAddressPromise = this.config.wallet.getAddress();
        this.storageReader = new ZeroGStorageReader(this.config.indexerRpc);
        this.storageWriter = new ZeroGStorageWriter({
            indexerRpc: this.config.indexerRpc,
            blockchainRpc: this.config.rpcUrl,
            signer: this.config.wallet
        });
        this.memoryPass = new MemoryPassClient({
            rpcUrl: this.config.rpcUrl,
            signer: this.config.wallet,
            addresses: this.config.addresses
        });
        this.memoryRegistry = new MemoryRegistryClient({
            rpcUrl: this.config.rpcUrl,
            signer: this.config.wallet,
            addresses: this.config.addresses
        });
        this.knowledgePack = new KnowledgePackClient({
            rpcUrl: this.config.rpcUrl,
            signer: this.config.wallet,
            addresses: this.config.addresses
        });
        this.packLicense = new PackLicenseClient({
            rpcUrl: this.config.rpcUrl,
            signer: this.config.wallet,
            addresses: this.config.addresses
        });
    }
    async ownerAddress() {
        return this.ownerAddressPromise;
    }
    async getPassState() {
        return this.memoryPass.getPassByOwner(await this.ownerAddress());
    }
    async getVaultMasterKey() {
        const passState = await this.getPassState();
        ensurePassExists(passState.vaultId);
        // Use a fixed rotation version for the hackathon MVP so the derived vault
        // key stays stable across snapshot updates.
        const typedData = getVaultKeyTypedData(this.config.chainId, passState.vaultId, 0n);
        const signature = await this.config.wallet.signTypedData(typedData.domain, { VaultKey: [...typedData.types.VaultKey] }, typedData.message);
        return deriveVaultMasterKeyFromSignature(signature);
    }
    async snapshotCachePath() {
        const owner = (await this.ownerAddress()).toLowerCase();
        const client = this.config.sourceClient.replace(/[^a-z0-9_-]/gi, "_").toLowerCase();
        return path.join(os.homedir(), ".kinetics", "mcp-cache", `vault-${owner}-${client}.json`);
    }
    async loadSnapshotFromDisk() {
        try {
            const cachePath = await this.snapshotCachePath();
            const raw = await readFile(cachePath, "utf8");
            return JSON.parse(raw);
        }
        catch {
            return undefined;
        }
    }
    async persistSnapshot(snapshot) {
        const cachePath = await this.snapshotCachePath();
        await mkdir(path.dirname(cachePath), { recursive: true });
        await writeFile(cachePath, JSON.stringify(snapshot), "utf8");
    }
    async creatorPackVersionsPath() {
        const owner = (await this.ownerAddress()).toLowerCase();
        return path.join(os.homedir(), ".kinetics", "mcp-cache", `creator-packs-${owner}.json`);
    }
    async loadCreatorPackVersions() {
        if (this.creatorPackVersions) {
            return this.creatorPackVersions;
        }
        try {
            const cachePath = await this.creatorPackVersionsPath();
            const raw = await readFile(cachePath, "utf8");
            this.creatorPackVersions = JSON.parse(raw);
        }
        catch {
            this.creatorPackVersions = [];
        }
        return this.creatorPackVersions;
    }
    async persistCreatorPackVersions() {
        const cachePath = await this.creatorPackVersionsPath();
        await mkdir(path.dirname(cachePath), { recursive: true });
        await writeFile(cachePath, JSON.stringify(this.creatorPackVersions ?? []), "utf8");
    }
    async rememberCreatorPackVersion(record) {
        const records = await this.loadCreatorPackVersions();
        const next = records.filter((entry) => !(entry.packId === record.packId && entry.version === record.version));
        next.push(record);
        next.sort((left, right) => (left.packId - right.packId) || (left.version - right.version));
        this.creatorPackVersions = next;
        await this.persistCreatorPackVersions();
    }
    async getCreatorPackVersion(packId, version) {
        const records = await this.loadCreatorPackVersions();
        const candidates = records.filter((entry) => entry.packId === packId);
        if (candidates.length === 0) {
            return undefined;
        }
        if (typeof version === "number") {
            return candidates.find((entry) => entry.version === version);
        }
        return [...candidates].sort((left, right) => right.version - left.version)[0];
    }
    hasPendingSnapshotSync(passState, snapshot) {
        return snapshot.version > Number(passState.latestIndexVersion);
    }
    async getWorkingSnapshot() {
        const passState = await this.getPassState();
        ensurePassExists(passState.vaultId);
        if (this.snapshotCache) {
            return { passState, snapshot: this.snapshotCache };
        }
        const persisted = await this.loadSnapshotFromDisk();
        if (persisted && persisted.vaultId === Number(passState.vaultId)) {
            this.snapshotCache = persisted;
            return { passState, snapshot: persisted };
        }
        return this.pullLatestSnapshot();
    }
    async pullLatestSnapshot(indexBlobRoot) {
        const passState = await this.getPassState();
        ensurePassExists(passState.vaultId);
        const vaultMasterKey = await this.getVaultMasterKey();
        const remoteSnapshot = await pullVaultIndex({
            owner: await this.ownerAddress(),
            memoryPass: this.memoryPass,
            storage: this.storageReader,
            vaultMasterKey,
            indexBlobRoot
        });
        this.snapshotCache = this.snapshotCache ? syncVaultSnapshots(this.snapshotCache, remoteSnapshot) : remoteSnapshot;
        await this.persistSnapshot(this.snapshotCache);
        return { passState, snapshot: this.snapshotCache };
    }
    async memoryPassStatus() {
        const owner = await this.ownerAddress();
        const passState = await this.memoryPass.getPassByOwner(owner);
        const hasPass = passState.vaultId !== 0n;
        const active = hasPass ? await this.memoryPass.isPassActive(passState.vaultId) : false;
        const plan = hasPass ? await this.memoryPass.getPlan(passState.planId) : null;
        return {
            owner,
            hasPass,
            active,
            pass: hasPass
                ? {
                    vaultId: Number(passState.vaultId),
                    planId: Number(passState.planId),
                    expiresAt: Number(passState.expiresAt),
                    storageQuotaBytes: Number(passState.storageQuotaBytes),
                    writeQuotaPerPeriod: Number(passState.writeQuotaPerPeriod),
                    latestIndexVersion: Number(passState.latestIndexVersion),
                    latestIndexRoot: passState.latestIndexRoot,
                    latestIndexBlobRoot: passState.latestIndexBlobRoot
                }
                : null,
            plan: plan
                ? {
                    durationSeconds: Number(plan.durationSeconds),
                    storageQuotaBytes: Number(plan.storageQuotaBytes),
                    writeQuotaPerPeriod: Number(plan.writeQuotaPerPeriod),
                    periodSeconds: Number(plan.periodSeconds),
                    priceWei: plan.priceWei.toString(),
                    active: plan.active
                }
                : null
        };
    }
    async memoryPassListPlans() {
        const nextPlanId = Number(await this.memoryPass.getNextPlanId());
        const plans = [];
        for (let planId = 1; planId < nextPlanId; planId += 1) {
            const plan = await this.memoryPass.getPlan(planId);
            if (!plan.active) {
                continue;
            }
            plans.push({
                planId,
                durationSeconds: Number(plan.durationSeconds),
                storageQuotaBytes: Number(plan.storageQuotaBytes),
                writeQuotaPerPeriod: Number(plan.writeQuotaPerPeriod),
                periodSeconds: Number(plan.periodSeconds),
                priceWei: plan.priceWei.toString(),
                active: plan.active
            });
        }
        return {
            owner: await this.ownerAddress(),
            plans
        };
    }
    async memoryPassBuy(planId) {
        const plan = await this.memoryPass.getPlan(planId);
        if (!plan.active) {
            throw new Error(`Plan ${planId} is not active`);
        }
        const purchase = await this.memoryPass.buyPass(planId, plan.priceWei);
        const status = await this.memoryPassStatus();
        return {
            planId,
            priceWei: plan.priceWei.toString(),
            transactionHash: purchase.transactionHash,
            status
        };
    }
    async memoryPassRenew(vaultId, planId, mode) {
        const plan = await this.memoryPass.getPlan(planId);
        if (!plan.active) {
            throw new Error(`Plan ${planId} is not active`);
        }
        const transactionHash = await this.memoryPass.renewPass(vaultId, planId, plan.priceWei);
        const status = await this.memoryPassStatus();
        return {
            mode,
            vaultId,
            planId,
            priceWei: plan.priceWei.toString(),
            transactionHash,
            status
        };
    }
    async memoryAdd(input) {
        const { passState, snapshot } = await this.getWorkingSnapshot();
        const vaultMasterKey = await this.getVaultMasterKey();
        const receipt = await addMemoryFast({
            passState,
            snapshot,
            memoryRegistry: this.memoryRegistry,
            storage: this.storageWriter,
            vaultMasterKey,
            text: input.text,
            sourceClient: this.config.sourceClient,
            memoryType: input.memoryType,
            metadata: {
                title: input.title?.trim() || undefined,
                tags: normalizeTags(input.tags ?? []),
                namespaces: normalizeTags(input.namespaces ?? [])
            }
        });
        this.snapshotCache = receipt.snapshot;
        await this.persistSnapshot(receipt.snapshot);
        return {
            ...receipt,
            totalEntries: receipt.snapshot.entries.length
        };
    }
    async memoryQuery(query, topK) {
        const { snapshot } = await this.getWorkingSnapshot();
        const vaultMasterKey = await this.getVaultMasterKey();
        const results = await queryMemory({
            query,
            topK: Math.max(1, Math.min(20, topK)),
            snapshot,
            storage: this.storageReader,
            vaultMasterKey
        });
        return {
            query,
            topK,
            count: results.length,
            results
        };
    }
    async memorySummary() {
        const { snapshot } = await this.getWorkingSnapshot();
        return {
            snapshotVersion: snapshot.version,
            totalEntries: snapshot.entries.length,
            summary: buildMemorySummaryText(snapshot)
        };
    }
    async memoryStats() {
        const { passState, snapshot } = await this.getWorkingSnapshot();
        const active = await this.memoryPass.isPassActive(passState.vaultId);
        return {
            ...buildMemoryStats(passState, active, snapshot),
            pendingSnapshotSync: this.hasPendingSnapshotSync(passState, snapshot)
        };
    }
    async memorySync() {
        const before = this.snapshotCache;
        const { snapshot } = await this.pullLatestSnapshot();
        const beforeIds = new Set((before?.entries ?? []).map((entry) => entry.memoryId));
        const added = snapshot.entries.filter((entry) => !beforeIds.has(entry.memoryId)).length;
        return {
            added,
            totalEntries: snapshot.entries.length,
            snapshotVersion: snapshot.version,
            latestIndexBlobRoot: snapshot.entries.length > 0 ? (await this.getPassState()).latestIndexBlobRoot : ZERO_HEX_32
        };
    }
    async memoryPushIndex() {
        const { passState, snapshot } = await this.getWorkingSnapshot();
        if (!this.hasPendingSnapshotSync(passState, snapshot)) {
            return {
                snapshotVersion: snapshot.version,
                snapshotBlobRoot: passState.latestIndexBlobRoot,
                merkleRoot: snapshot.merkleRoot,
                latestIndexTxHash: null,
                pendingSnapshotSync: false,
                note: "Local vault snapshot is already published."
            };
        }
        const vaultMasterKey = await this.getVaultMasterKey();
        const pushed = await publishVaultSnapshot({
            snapshot,
            storage: this.storageWriter,
            vaultMasterKey,
            memoryPass: this.memoryPass,
            passState
        });
        this.snapshotCache = {
            ...snapshot,
            merkleRoot: pushed.merkleRoot
        };
        await this.persistSnapshot(this.snapshotCache);
        return {
            snapshotVersion: snapshot.version,
            snapshotBlobRoot: pushed.snapshotBlobRoot,
            merkleRoot: pushed.merkleRoot,
            latestIndexTxHash: pushed.latestIndexTxHash,
            pendingSnapshotSync: false
        };
    }
    async memoryPullIndex(indexBlobId = "") {
        const before = this.snapshotCache;
        const { snapshot } = await this.pullLatestSnapshot(indexBlobId || undefined);
        const beforeIds = new Set((before?.entries ?? []).map((entry) => entry.memoryId));
        return {
            indexBlobId: indexBlobId || null,
            added: snapshot.entries.filter((entry) => !beforeIds.has(entry.memoryId)).length,
            totalEntries: snapshot.entries.length,
            snapshotVersion: snapshot.version
        };
    }
    async memoryVerify(proofJson) {
        const parsed = JSON.parse(proofJson);
        const proofs = normalizeProofInput(parsed);
        const agent = await this.ownerAddress();
        const checks = await Promise.all(proofs.map(async (entry) => ({
            leaf: entry.leaf,
            merkleRoot: entry.merkleRoot,
            valid: await this.memoryRegistry.verifyInclusion(agent, entry.leaf, entry.proof, entry.merkleRoot)
        })));
        return {
            valid: checks.every((check) => check.valid),
            count: checks.length,
            checks
        };
    }
    async readSearchablePacks() {
        const totalSupply = Number(await this.knowledgePack.getTotalSupply());
        const packs = [];
        for (let packId = 1; packId <= totalSupply; packId += 1) {
            const state = await this.knowledgePack.getPack(packId);
            if (state.creator === ZeroAddress) {
                continue;
            }
            const manifest = await readPreviewManifest(this.storageReader, state.currentPreviewRoot);
            packs.push({
                packId,
                active: state.active,
                priceWei: state.priceWei.toString(),
                licenseDurationSeconds: Number(state.licenseDurationSeconds),
                manifest: {
                    ...manifest,
                    packId,
                    currentVersion: Number(state.currentVersion),
                    packKind: packKindFromContract(state.packKind),
                    priceWei: state.priceWei.toString(),
                    licenseDurationDays: Math.floor(Number(state.licenseDurationSeconds) / (24 * 60 * 60))
                }
            });
        }
        return packs;
    }
    async skillSearch(keyword, tags, packKind) {
        const packs = await this.readSearchablePacks();
        const results = filterSearchablePacks(packs, keyword, normalizeTags(tags), packKind).map((pack) => ({
            packId: pack.packId,
            title: pack.manifest.title,
            slug: pack.manifest.slug,
            shortDescription: pack.manifest.shortDescription,
            tags: pack.manifest.tags,
            keywords: pack.manifest.keywords,
            packKind: pack.manifest.packKind,
            priceWei: pack.priceWei,
            licenseDurationSeconds: pack.licenseDurationSeconds,
            currentVersion: pack.manifest.currentVersion,
            creator: pack.manifest.creator
        }));
        return {
            keyword,
            tags: normalizeTags(tags),
            packKind,
            count: results.length,
            results
        };
    }
    async skillGet(packId) {
        const pack = await this.knowledgePack.getPack(packId);
        if (pack.creator === ZeroAddress) {
            throw new Error(`Pack ${packId} was not found`);
        }
        const manifest = await readPreviewManifest(this.storageReader, pack.currentPreviewRoot);
        const buyer = await this.ownerAddress();
        const activeLicense = await this.packLicense.hasActiveLicense(packId, buyer);
        const existingLicenseId = await this.packLicense.getLicenseIdForPackBuyer(packId, buyer);
        return {
            packId,
            active: pack.active,
            creator: pack.creator,
            slug: pack.slug,
            packKind: packKindFromContract(pack.packKind),
            currentVersion: Number(pack.currentVersion),
            previewRoot: pack.currentPreviewRoot,
            bundleRoot: pack.currentBundleRoot,
            priceWei: pack.priceWei.toString(),
            licenseDurationSeconds: Number(pack.licenseDurationSeconds),
            manifest: {
                ...manifest,
                packId,
                currentVersion: Number(pack.currentVersion),
                packKind: packKindFromContract(pack.packKind),
                priceWei: pack.priceWei.toString(),
                licenseDurationDays: Math.floor(Number(pack.licenseDurationSeconds) / (24 * 60 * 60))
            },
            owned: existingLicenseId !== 0n,
            activeLicense,
            licenseId: existingLicenseId === 0n ? null : Number(existingLicenseId)
        };
    }
    async waitForLicenseGrant(licenseId) {
        const start = Date.now();
        let license = await this.packLicense.getLicense(licenseId);
        while (Date.now() - start < this.config.accessGrantWaitMs) {
            if (license.latestGrantRoot !== ZERO_HEX_32) {
                return {
                    ready: true,
                    license,
                    waitedMs: Date.now() - start
                };
            }
            await delay(this.config.accessGrantPollMs);
            license = await this.packLicense.getLicense(licenseId);
        }
        return {
            ready: false,
            license,
            waitedMs: Date.now() - start
        };
    }
    async skillBuy(packId) {
        const buyer = await this.ownerAddress();
        const pack = await this.knowledgePack.getPack(packId);
        if (pack.creator === ZeroAddress) {
            throw new Error(`Pack ${packId} was not found`);
        }
        const currentLicenseId = await this.packLicense.getLicenseIdForPackBuyer(packId, buyer);
        if (currentLicenseId !== 0n && (await this.packLicense.hasActiveLicense(packId, buyer))) {
            const existing = await this.packLicense.getLicense(currentLicenseId);
            return {
                packId,
                transactionHash: null,
                licenseId: Number(currentLicenseId),
                alreadyOwned: true,
                accessGrantReady: existing.latestGrantRoot !== ZERO_HEX_32,
                latestGrantRoot: existing.latestGrantRoot
            };
        }
        const buyerPubkey = this.config.wallet.signingKey.publicKey ?? buyer;
        const transactionHash = await buyLicense({
            packId,
            buyerPubkey,
            priceWei: pack.priceWei,
            licenseRegistry: this.packLicense
        });
        const licenseId = await this.packLicense.getLicenseIdForPackBuyer(packId, buyer);
        const wait = await this.waitForLicenseGrant(licenseId);
        return {
            packId,
            transactionHash,
            licenseId: Number(licenseId),
            alreadyOwned: false,
            accessGrantReady: wait.ready,
            latestGrantRoot: wait.license.latestGrantRoot,
            waitedMs: wait.waitedMs,
            note: wait.ready
                ? "Access grant is available and the pack can be mounted."
                : "Purchase succeeded, but no access grant was published before the wait timeout."
        };
    }
    async skillListOwned() {
        const buyer = await this.ownerAddress();
        const licenseIds = await this.packLicense.getBuyerLicenseIds(buyer);
        const licenses = await Promise.all(licenseIds.map(async (licenseId) => {
            const license = await this.packLicense.getLicense(licenseId);
            const pack = await this.knowledgePack.getPack(license.packId);
            return {
                licenseId: Number(license.licenseId),
                packId: Number(license.packId),
                active: await this.packLicense.hasActiveLicense(license.packId, buyer),
                startsAt: Number(license.startsAt),
                expiresAt: Number(license.expiresAt),
                latestGrantVersion: Number(license.latestGrantVersion),
                latestGrantRoot: license.latestGrantRoot,
                title: pack.slug,
                mounted: this.mountedPacks.some((mounted) => mounted.packId === Number(license.packId))
            };
        }));
        return {
            buyer,
            count: licenses.length,
            licenses
        };
    }
    async skillMount(packId) {
        const buyer = await this.ownerAddress();
        const licenseId = await this.packLicense.getLicenseIdForPackBuyer(packId, buyer);
        if (licenseId === 0n) {
            throw new Error(`No license found for pack ${packId}`);
        }
        const mounted = await mountPack({
            licenseId,
            buyer,
            licenseRegistry: this.packLicense,
            knowledgePack: this.knowledgePack,
            storage: this.storageReader
        });
        this.mountedPacks = this.mountedPacks.filter((entry) => entry.packId !== mounted.packId);
        this.mountedPacks.push(mounted);
        return {
            packId,
            mounted,
            mountedCount: this.mountedPacks.length
        };
    }
    async skillUnmount(packId) {
        const nextMounted = unmountPack(this.mountedPacks, packId);
        const removed = nextMounted.length !== this.mountedPacks.length;
        this.mountedPacks = nextMounted;
        return {
            packId,
            removed,
            mountedCount: this.mountedPacks.length
        };
    }
    async publishDraft(input, existingPackId) {
        const creator = await this.ownerAddress();
        const draft = createPackDraft({
            ...input,
            tags: normalizeTags(input.tags),
            keywords: normalizeTags(input.keywords),
            previewFiles: normalizeTags(input.previewFiles),
            creator
        });
        if (existingPackId) {
            const current = await this.knowledgePack.getPack(existingPackId);
            const nextVersion = Number(current.currentVersion) + 1;
            draft.manifest.packId = existingPackId;
            draft.manifest.currentVersion = nextVersion;
            draft.bundle.packId = existingPackId;
            draft.bundle.version = nextVersion;
            const published = await publishPack({
                manifest: draft.manifest,
                bundle: draft.bundle,
                storage: this.storageWriter,
                chain: this.knowledgePack,
                existingPackId,
                existingVersion: nextVersion
            });
            await this.rememberCreatorPackVersion({
                packId: existingPackId,
                version: nextVersion,
                previewRoot: published.previewRoot,
                bundleRoot: published.bundleRoot,
                versionKeyHex: published.versionKeyHex,
                slug: draft.manifest.slug,
                title: draft.manifest.title,
                updatedAt: Math.floor(Date.now() / 1000)
            });
            return {
                mode: "version",
                packId: existingPackId,
                currentVersion: nextVersion,
                ...published
            };
        }
        const predictedPackId = Number(await this.knowledgePack.getTotalSupply()) + 1;
        draft.manifest.packId = predictedPackId;
        draft.bundle.packId = predictedPackId;
        const beforeIds = await this.knowledgePack.getCreatorPackIds(creator);
        const published = await publishPack({
            manifest: draft.manifest,
            bundle: draft.bundle,
            storage: this.storageWriter,
            chain: this.knowledgePack
        });
        const afterIds = await this.knowledgePack.getCreatorPackIds(creator);
        const createdPackId = afterIds.find((packId) => !beforeIds.some((existing) => existing === packId));
        const packId = Number(createdPackId ?? afterIds[afterIds.length - 1] ?? 0n);
        if (packId === 0) {
            throw new Error("Unable to determine the minted pack id");
        }
        await this.rememberCreatorPackVersion({
            packId,
            version: 1,
            previewRoot: published.previewRoot,
            bundleRoot: published.bundleRoot,
            versionKeyHex: published.versionKeyHex,
            slug: draft.manifest.slug,
            title: draft.manifest.title,
            updatedAt: Math.floor(Date.now() / 1000)
        });
        await this.knowledgePack.setSaleTerms(packId, BigInt(input.priceWei), BigInt(input.licenseDurationDays * 24 * 60 * 60), true);
        return {
            mode: "mint",
            packId,
            currentVersion: 1,
            ...published
        };
    }
    async skillPublish(draft) {
        return this.publishDraft(draft);
    }
    async skillPublishVersion(packId, draft) {
        return this.publishDraft(draft, packId);
    }
    async skillPublishAccessGrant(licenseId, version) {
        const license = await this.packLicense.getLicense(licenseId);
        if (license.licenseId === 0n || license.buyer === ZeroAddress) {
            throw new Error(`License ${licenseId} was not found`);
        }
        const packId = Number(license.packId);
        const pack = await this.knowledgePack.getPack(packId);
        const owner = await this.ownerAddress();
        if (pack.creator.toLowerCase() !== owner.toLowerCase()) {
            throw new Error(`Configured wallet is not the creator of pack ${packId}`);
        }
        const targetVersion = version ?? Number(pack.currentVersion);
        const packVersion = await this.getCreatorPackVersion(packId, targetVersion);
        if (!packVersion) {
            throw new Error(`No local creator metadata found for pack ${packId} version ${targetVersion}. ` +
                "Publish that version from this MCP wallet before issuing grants.");
        }
        const publishedGrant = await publishBuyerAccessGrant({
            grant: {
                licenseId,
                packId,
                version: packVersion.version,
                previewRoot: packVersion.previewRoot,
                bundleRoot: packVersion.bundleRoot,
                encryptedVersionKey: packVersion.versionKeyHex,
                issuedAt: Math.floor(Date.now() / 1000),
                expiresAt: Number(license.expiresAt)
            },
            storage: this.storageWriter,
            licenseRegistry: this.packLicense
        });
        return {
            licenseId,
            packId,
            version: packVersion.version,
            previewRoot: packVersion.previewRoot,
            bundleRoot: packVersion.bundleRoot,
            grantRoot: publishedGrant.rootHash,
            storageTxHash: publishedGrant.transactionHash,
            publishTxHash: publishedGrant.publishTxHash
        };
    }
}
//# sourceMappingURL=service.js.map