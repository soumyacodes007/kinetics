import { MountedPack, PackKind, VaultSnapshot } from "@kinetics/core";
import { KineticsMcpConfig } from "./config.js";
export interface PublishDraftInput {
    slug: string;
    title: string;
    shortDescription: string;
    packKind: PackKind;
    tags: string[];
    keywords: string[];
    previewFiles: string[];
    files: Array<{
        path: string;
        content: string;
    }>;
    knowledgeDocs?: Array<{
        docId: string;
        title: string;
        text: string;
    }>;
    mountInstructions: {
        systemPromptAddition: string;
        recommendedTools: string[];
    };
    changelog?: string;
    priceWei: string;
    licenseDurationDays: number;
}
export declare class KineticsMcpService {
    private readonly config;
    private readonly ownerAddressPromise;
    private readonly storageReader;
    private readonly storageWriter;
    private readonly memoryPass;
    private readonly memoryRegistry;
    private readonly knowledgePack;
    private readonly packLicense;
    private snapshotCache?;
    private mountedPacks;
    private creatorPackVersions?;
    constructor(config: KineticsMcpConfig);
    private ownerAddress;
    private getPassState;
    private getVaultMasterKey;
    private snapshotCachePath;
    private loadSnapshotFromDisk;
    private persistSnapshot;
    private creatorPackVersionsPath;
    private loadCreatorPackVersions;
    private persistCreatorPackVersions;
    private rememberCreatorPackVersion;
    private getCreatorPackVersion;
    private hasPendingSnapshotSync;
    private getWorkingSnapshot;
    private pullLatestSnapshot;
    memoryPassStatus(): Promise<{
        owner: string;
        hasPass: boolean;
        active: boolean;
        pass: {
            vaultId: number;
            planId: number;
            expiresAt: number;
            storageQuotaBytes: number;
            writeQuotaPerPeriod: number;
            latestIndexVersion: number;
            latestIndexRoot: string;
            latestIndexBlobRoot: string;
        } | null;
        plan: {
            durationSeconds: number;
            storageQuotaBytes: number;
            writeQuotaPerPeriod: number;
            periodSeconds: number;
            priceWei: string;
            active: boolean;
        } | null;
    }>;
    memoryPassListPlans(): Promise<{
        owner: string;
        plans: {
            planId: number;
            durationSeconds: number;
            storageQuotaBytes: number;
            writeQuotaPerPeriod: number;
            periodSeconds: number;
            priceWei: string;
            active: true;
        }[];
    }>;
    memoryPassBuy(planId: number): Promise<{
        planId: number;
        priceWei: string;
        transactionHash: string;
        status: {
            owner: string;
            hasPass: boolean;
            active: boolean;
            pass: {
                vaultId: number;
                planId: number;
                expiresAt: number;
                storageQuotaBytes: number;
                writeQuotaPerPeriod: number;
                latestIndexVersion: number;
                latestIndexRoot: string;
                latestIndexBlobRoot: string;
            } | null;
            plan: {
                durationSeconds: number;
                storageQuotaBytes: number;
                writeQuotaPerPeriod: number;
                periodSeconds: number;
                priceWei: string;
                active: boolean;
            } | null;
        };
    }>;
    memoryPassRenew(vaultId: number, planId: number, mode: "renew" | "upgrade"): Promise<{
        mode: "renew" | "upgrade";
        vaultId: number;
        planId: number;
        priceWei: string;
        transactionHash: string;
        status: {
            owner: string;
            hasPass: boolean;
            active: boolean;
            pass: {
                vaultId: number;
                planId: number;
                expiresAt: number;
                storageQuotaBytes: number;
                writeQuotaPerPeriod: number;
                latestIndexVersion: number;
                latestIndexRoot: string;
                latestIndexBlobRoot: string;
            } | null;
            plan: {
                durationSeconds: number;
                storageQuotaBytes: number;
                writeQuotaPerPeriod: number;
                periodSeconds: number;
                priceWei: string;
                active: boolean;
            } | null;
        };
    }>;
    memoryAdd(input: {
        text: string;
        title?: string;
        tags?: string[];
        namespaces?: string[];
        memoryType: "episodic" | "semantic" | "procedural" | "working";
    }): Promise<{
        totalEntries: number;
        memoryId: string;
        blobRoot: string;
        snapshotBlobRoot?: string;
        merkleRoot: string;
        snapshotVersion: number;
        chain?: {
            latestIndexTxHash?: string;
            registryTxHash?: string;
            daCommitment: string;
        };
        snapshot: VaultSnapshot;
        pendingSnapshotSync: boolean;
    }>;
    memoryQuery(query: string, topK: number): Promise<{
        query: string;
        topK: number;
        count: number;
        results: import("@kinetics/core").MemoryQueryResult[];
    }>;
    memorySummary(): Promise<{
        snapshotVersion: number;
        totalEntries: number;
        summary: string;
    }>;
    memoryStats(): Promise<{
        pendingSnapshotSync: boolean;
        vaultId: number;
        planId: number;
        active: boolean;
        expiresAt: number;
        latestIndexVersion: number;
        latestIndexRoot: string;
        latestIndexBlobRoot: string;
        storageQuotaBytes: number;
        writeQuotaPerPeriod: number;
        snapshotVersion: number;
        bytesUsed: number;
        writeCountCurrentPeriod: number;
        totalEntries: number;
        staleEntries: number;
        byType: {
            episodic: number;
            semantic: number;
            procedural: number;
            working: number;
        };
        recent: {
            memoryId: string;
            title: string;
            summary: string;
            memoryType: import("@kinetics/core").MemoryType;
            tags: string[];
            namespaces: string[];
            createdAt: number;
        }[];
    }>;
    memorySync(): Promise<{
        added: number;
        totalEntries: number;
        snapshotVersion: number;
        latestIndexBlobRoot: string;
    }>;
    memoryPushIndex(): Promise<{
        snapshotVersion: number;
        snapshotBlobRoot: string;
        merkleRoot: string;
        latestIndexTxHash: null;
        pendingSnapshotSync: boolean;
        note: string;
    } | {
        snapshotVersion: number;
        snapshotBlobRoot: string;
        merkleRoot: string;
        latestIndexTxHash: string | undefined;
        pendingSnapshotSync: boolean;
        note?: undefined;
    }>;
    memoryPullIndex(indexBlobId?: string): Promise<{
        indexBlobId: string | null;
        added: number;
        totalEntries: number;
        snapshotVersion: number;
    }>;
    memoryVerify(proofJson: string): Promise<{
        valid: boolean;
        count: number;
        checks: {
            leaf: string;
            merkleRoot: string;
            valid: boolean;
        }[];
    }>;
    private readSearchablePacks;
    skillSearch(keyword: string, tags: string[], packKind: PackKind | ""): Promise<{
        keyword: string;
        tags: string[];
        packKind: "" | PackKind;
        count: number;
        results: {
            packId: number;
            title: string;
            slug: string;
            shortDescription: string;
            tags: string[];
            keywords: string[];
            packKind: PackKind;
            priceWei: string;
            licenseDurationSeconds: number;
            currentVersion: number;
            creator: string;
        }[];
    }>;
    skillGet(packId: number): Promise<{
        packId: number;
        active: boolean;
        creator: string;
        slug: string;
        packKind: PackKind;
        currentVersion: number;
        previewRoot: string;
        bundleRoot: string;
        priceWei: string;
        licenseDurationSeconds: number;
        manifest: {
            packId: number;
            currentVersion: number;
            packKind: PackKind;
            priceWei: string;
            licenseDurationDays: number;
            slug: string;
            title: string;
            shortDescription: string;
            tags: string[];
            keywords: string[];
            previewFiles: string[];
            creator: string;
            createdAt: number;
            updatedAt: number;
        };
        owned: boolean;
        activeLicense: boolean;
        licenseId: number | null;
    }>;
    private waitForLicenseGrant;
    skillBuy(packId: number): Promise<{
        packId: number;
        transactionHash: null;
        licenseId: number;
        alreadyOwned: boolean;
        accessGrantReady: boolean;
        latestGrantRoot: string;
        waitedMs?: undefined;
        note?: undefined;
    } | {
        packId: number;
        transactionHash: string;
        licenseId: number;
        alreadyOwned: boolean;
        accessGrantReady: boolean;
        latestGrantRoot: string;
        waitedMs: number;
        note: string;
    }>;
    skillListOwned(): Promise<{
        buyer: string;
        count: number;
        licenses: {
            licenseId: number;
            packId: number;
            active: boolean;
            startsAt: number;
            expiresAt: number;
            latestGrantVersion: number;
            latestGrantRoot: string;
            title: string;
            mounted: boolean;
        }[];
    }>;
    skillMount(packId: number): Promise<{
        packId: number;
        mounted: MountedPack;
        mountedCount: number;
    }>;
    skillUnmount(packId: number): Promise<{
        packId: number;
        removed: boolean;
        mountedCount: number;
    }>;
    private publishDraft;
    skillPublish(draft: PublishDraftInput): Promise<{
        previewRoot: string;
        bundleRoot: string;
        versionKeyHex: string;
        mode: string;
        packId: number;
        currentVersion: number;
    }>;
    skillPublishVersion(packId: number, draft: PublishDraftInput): Promise<{
        previewRoot: string;
        bundleRoot: string;
        versionKeyHex: string;
        mode: string;
        packId: number;
        currentVersion: number;
    }>;
    skillPublishAccessGrant(licenseId: number, version?: number): Promise<{
        licenseId: number;
        packId: number;
        version: number;
        previewRoot: string;
        bundleRoot: string;
        grantRoot: string;
        storageTxHash: string;
        publishTxHash: string;
    }>;
}
//# sourceMappingURL=service.d.ts.map