export interface MemoryPassPlanDefinition {
  id: number;
  name: string;
  durationDays: number;
  storageQuotaBytes: number;
  writeQuotaPerPeriod: number;
  periodDays: number;
}

export const MEMORY_PASS_PLANS: readonly MemoryPassPlanDefinition[] = [
  {
    id: 1,
    name: "Starter",
    durationDays: 30,
    storageQuotaBytes: 25 * 1024 * 1024,
    writeQuotaPerPeriod: 2_000,
    periodDays: 30
  },
  {
    id: 2,
    name: "Pro",
    durationDays: 90,
    storageQuotaBytes: 200 * 1024 * 1024,
    writeQuotaPerPeriod: 20_000,
    periodDays: 90
  }
] as const;
