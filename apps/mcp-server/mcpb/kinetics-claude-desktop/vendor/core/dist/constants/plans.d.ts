export interface MemoryPassPlanDefinition {
    id: number;
    name: string;
    durationDays: number;
    storageQuotaBytes: number;
    writeQuotaPerPeriod: number;
    periodDays: number;
}
export declare const MEMORY_PASS_PLANS: readonly MemoryPassPlanDefinition[];
//# sourceMappingURL=plans.d.ts.map