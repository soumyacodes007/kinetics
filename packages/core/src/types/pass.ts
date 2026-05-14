export interface MemoryPassPlan {
  durationSeconds: bigint;
  storageQuotaBytes: bigint;
  writeQuotaPerPeriod: bigint;
  periodSeconds: bigint;
  priceWei: bigint;
  active: boolean;
}

export interface MemoryPassState {
  vaultId: bigint;
  owner: string;
  planId: bigint;
  expiresAt: bigint;
  storageQuotaBytes: bigint;
  writeQuotaPerPeriod: bigint;
  latestIndexVersion: bigint;
  latestIndexRoot: string;
  latestIndexBlobRoot: string;
}

export interface LatestIndexReceipt {
  vaultId: bigint;
  version: bigint;
  indexRoot: string;
  indexBlobRoot: string;
  transactionHash?: string;
}
