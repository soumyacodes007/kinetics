"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";
import { useAccount } from "wagmi";
import { ProductShell } from "@/components/product-shell";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { MEMORY_PASS_PLANS, type MemoryPassPlan, type MemoryPassState } from "@kinetics/core/browser";
import { getMemoryPassClient, ZERO_HEX_32 } from "@/lib/chain";
import { formatBytes, formatCountdown, formatTokenAmount, formatTimestamp } from "@/lib/format";
import { useEthersSigner } from "@/hooks/use-ethers-signer";

type PlansState = Record<number, MemoryPassPlan>;

function emptyPass(owner = ""): MemoryPassState {
  return {
    vaultId: BigInt(0),
    owner,
    planId: BigInt(0),
    expiresAt: BigInt(0),
    storageQuotaBytes: BigInt(0),
    writeQuotaPerPeriod: BigInt(0),
    latestIndexVersion: BigInt(0),
    latestIndexRoot: ZERO_HEX_32,
    latestIndexBlobRoot: ZERO_HEX_32
  };
}

export default function BuyPassPage() {
  const { address, isConnected } = useAccount();
  const signer = useEthersSigner();
  const [plans, setPlans] = useState<PlansState>({});
  const [passState, setPassState] = useState<MemoryPassState>(emptyPass());
  const [loading, setLoading] = useState(true);
  const [pendingPlanId, setPendingPlanId] = useState<number | null>(null);

  async function refresh() {
    setLoading(true);
    try {
      const client = getMemoryPassClient();
      const nextPlans = Object.fromEntries(
        await Promise.all(
          MEMORY_PASS_PLANS.map(async (plan) => [plan.id, await client.getPlan(plan.id)] as const)
        )
      );
      setPlans(nextPlans);

      if (address) {
        setPassState(await client.getPassByOwner(address));
      } else {
        setPassState(emptyPass());
      }
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void refresh();
  }, [address]);

  async function buyPlan(planId: number) {
    if (!signer) {
      toast.error("Connect a wallet first");
      return;
    }

    const plan = plans[planId];
    if (!plan) {
      return;
    }

    setPendingPlanId(planId);
    try {
      const client = getMemoryPassClient(signer);
      const activePass = passState.vaultId !== BigInt(0);
      if (activePass) {
        await client.renewPass(passState.vaultId, planId, plan.priceWei);
        toast.success(`Renewed pass with plan ${planId}`);
      } else {
        await client.buyPass(planId, plan.priceWei);
        toast.success(`Purchased pass plan ${planId}`);
      }
      await refresh();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Pass transaction failed");
    } finally {
      setPendingPlanId(null);
    }
  }

  return (
    <ProductShell
      eyebrow="Private Memory"
      title="Buy the memory pass once, then keep writing."
      description="MemoryPass is the subscription gate for your private vault. Buy once, then add and query memory repeatedly until quota or expiry."
    >
      <div className="grid gap-6 xl:grid-cols-[0.9fr_1.1fr]">
        <Card className="border-white/10 bg-black/30">
          <CardHeader>
            <CardTitle className="text-white">Current pass</CardTitle>
            <CardDescription>
              {isConnected ? "Live state from MemoryPass on 0G testnet." : "Connect a wallet to inspect or purchase a pass."}
            </CardDescription>
          </CardHeader>
          <CardContent className="grid gap-4 text-sm text-white/70">
            <div className="flex items-center justify-between">
              <span>Status</span>
              <Badge variant={passState.vaultId === BigInt(0) ? "outline" : "secondary"}>
                {passState.vaultId === BigInt(0) ? "No pass" : Number(passState.expiresAt) < Date.now() / 1000 ? "Expired" : "Active"}
              </Badge>
            </div>
            <div className="flex items-center justify-between">
              <span>Vault ID</span>
              <span>{passState.vaultId.toString()}</span>
            </div>
            <div className="flex items-center justify-between">
              <span>Plan ID</span>
              <span>{passState.planId.toString()}</span>
            </div>
            <div className="flex items-center justify-between">
              <span>Expiry</span>
              <span>{formatTimestamp(passState.expiresAt)}</span>
            </div>
            <div className="flex items-center justify-between">
              <span>Remaining</span>
              <span>{formatCountdown(passState.expiresAt)}</span>
            </div>
            <div className="flex items-center justify-between">
              <span>Quota</span>
              <span>{formatBytes(passState.storageQuotaBytes)}</span>
            </div>
            <div className="flex items-center justify-between">
              <span>Latest index version</span>
              <span>{passState.latestIndexVersion.toString()}</span>
            </div>
          </CardContent>
        </Card>

        <div className="grid gap-6 md:grid-cols-2">
          {MEMORY_PASS_PLANS.map((planDef) => {
            const livePlan = plans[planDef.id];
            return (
              <Card key={planDef.id} className="border-white/10 bg-white/[0.03] text-white">
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <CardTitle className="font-display text-3xl">{planDef.name}</CardTitle>
                    <Badge variant="outline">Plan {planDef.id}</Badge>
                  </div>
                  <CardDescription className="text-white/60">
                    {planDef.durationDays} day access window, {planDef.periodDays} day quota period.
                  </CardDescription>
                </CardHeader>
                <CardContent className="grid gap-4 text-sm text-white/72">
                  <div className="flex items-center justify-between">
                    <span>Price</span>
                    <span>{livePlan ? formatTokenAmount(livePlan.priceWei) : loading ? "Loading..." : "Unavailable"}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span>Storage quota</span>
                    <span>{formatBytes(planDef.storageQuotaBytes)}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span>Write quota</span>
                    <span>{planDef.writeQuotaPerPeriod.toLocaleString()} writes</span>
                  </div>
                  <Button
                    className="mt-4 rounded-full"
                    disabled={!signer || !livePlan || pendingPlanId === planDef.id}
                    onClick={() => void buyPlan(planDef.id)}
                  >
                    {pendingPlanId === planDef.id
                      ? "Submitting..."
                        : passState.vaultId === BigInt(0)
                        ? `Buy ${planDef.name}`
                        : `Renew / switch to ${planDef.name}`}
                  </Button>
                </CardContent>
              </Card>
            );
          })}
        </div>
      </div>
    </ProductShell>
  );
}
