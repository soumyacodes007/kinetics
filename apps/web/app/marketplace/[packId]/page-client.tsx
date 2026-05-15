"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { useAccount } from "wagmi";
import { MarketplaceShell } from "@/components/marketplace-shell";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { findDemoMarketplaceItem } from "@/lib/demo-marketplace";
import { getKnowledgePackClient, getPackLicenseClient, ZERO_HEX_32 } from "@/lib/chain";
import { formatAddress, formatTokenAmount, formatTimestamp } from "@/lib/format";
import { readJson } from "@/lib/storage-bridge";
import { useEthersSigner } from "@/hooks/use-ethers-signer";
import type { PackLicenseState, PackPreviewManifest } from "@kinetics/core/browser";
import { ArrowLeft, Clock, ExternalLink, Shield, Sparkles, Zap } from "lucide-react";

export default function PackDetailClientPage({ packId }: { packId: number }) {
  const { address, isConnected } = useAccount();
  const signer = useEthersSigner();
  const [manifest, setManifest] = useState<PackPreviewManifest | null>(null);
  const [packState, setPackState] = useState<Awaited<ReturnType<ReturnType<typeof getKnowledgePackClient>["getPack"]>> | null>(null);
  const [license, setLicense] = useState<PackLicenseState | null>(null);
  const [pending, setPending] = useState(false);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const demoItem = findDemoMarketplaceItem(packId);
  const isDemo = demoItem !== null;

  async function refresh() {
    setLoading(true);
    setLoadError(null);
    try {
      if (demoItem) {
        setManifest(demoItem.manifest);
        setPackState(null);
        setLicense(null);
        return;
      }

      const knowledgePack = getKnowledgePackClient();
      const pack = await knowledgePack.getPack(packId);
      if (!pack.active || pack.currentPreviewRoot === ZERO_HEX_32) {
        throw new Error(`Pack ${packId} is unavailable`);
      }

      setPackState(pack);
      setManifest(await readJson<PackPreviewManifest>(pack.currentPreviewRoot));

      if (address) {
        const licenses = getPackLicenseClient();
        const licenseId = await licenses.getLicenseIdForPackBuyer(packId, address);
        if (licenseId !== BigInt(0)) {
          setLicense(await licenses.getLicense(licenseId));
        } else {
          setLicense(null);
        }
      } else {
        setLicense(null);
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unable to load pack";
      setLoadError(message);
      setManifest(null);
      setPackState(null);
      setLicense(null);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void refresh();
  }, [address, packId]);

  async function handleBuy() {
    if (isDemo) {
      toast.info("This is a demo preview card. Publish or open a live on-chain pack to buy a real license.");
      return;
    }

    if (!signer || !packState) {
      toast.error("Connect a wallet first");
      return;
    }

    setPending(true);
    try {
      const licenseRegistry = getPackLicenseClient(signer);
      await licenseRegistry.buyLicense(packId, address ?? "browser-buyer", packState.priceWei);
      await refresh();
      toast.success("License purchased");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "License purchase failed");
    } finally {
      setPending(false);
    }
  }

  const durationDays = packState
    ? Math.max(1, Number(packState.licenseDurationSeconds / BigInt(86400)))
    : demoItem
      ? Math.max(1, Number(demoItem.licenseDurationSeconds / BigInt(86400)))
      : 0;

  const displayPrice = packState ? packState.priceWei : demoItem?.priceWei;
  const displayCreator = packState?.creator ?? demoItem?.creator ?? "";

  return (
    <MarketplaceShell>
      <div className="mb-6">
        <Link href="/marketplace" className="inline-flex items-center gap-2 text-xs font-mono text-white/35 hover:text-white/65 transition-colors">
          <ArrowLeft className="w-3.5 h-3.5" />
          BACK TO MARKETPLACE
        </Link>
      </div>

      {loadError ? (
        <div className="rounded-3xl border border-red-400/20 bg-red-400/10 p-6 text-red-100">
          <p className="mb-2 font-medium">Pack unavailable</p>
          <p className="text-sm text-red-100/80">{loadError}</p>
        </div>
      ) : null}

      <div className="grid gap-6 xl:grid-cols-[1.05fr_0.95fr]">
        <Card className="overflow-hidden border-white/10 bg-white/[0.03] backdrop-blur-sm text-white">
          <div className="h-px w-full bg-gradient-to-r from-transparent via-white/40 to-transparent" />
          <CardHeader>
            <div className="mb-4 flex flex-wrap items-center gap-2">
              <Badge variant="outline">Pack #{packId}</Badge>
              <Badge variant="secondary">{manifest?.packKind.replace("_", " ") ?? "Loading"}</Badge>
              <Badge variant="outline">v{packState?.currentVersion.toString() ?? demoItem?.currentVersion ?? "0"}</Badge>
              {isDemo ? (
                <Badge className="bg-amber-400/10 text-amber-200 border border-amber-400/30">Demo preview</Badge>
              ) : null}
            </div>
            <CardTitle className="font-display text-4xl leading-tight">{manifest?.title ?? (loading ? "Loading..." : `Pack #${packId}`)}</CardTitle>
            <CardDescription className="max-w-2xl text-white/55">{manifest?.shortDescription ?? "Loading pack metadata..."}</CardDescription>
          </CardHeader>
          <CardContent className="grid gap-5 text-sm text-white/72">
            <div className="flex flex-wrap gap-2">
              {manifest?.tags.map((tag) => (
                <Badge key={tag} variant="outline">
                  {tag}
                </Badge>
              ))}
            </div>
            <div className="flex items-center justify-between">
              <span>Creator</span>
              <span>{displayCreator ? formatAddress(displayCreator) : "Loading"}</span>
            </div>
            <div className="flex items-center justify-between">
              <span>Price</span>
              <span>{displayPrice ? formatTokenAmount(displayPrice) : "Loading"}</span>
            </div>
            <div className="flex items-center justify-between">
              <span>Duration</span>
              <span>{durationDays} days</span>
            </div>
            <div className="flex items-center justify-between">
              <span>Updated</span>
              <span>{manifest ? formatTimestamp(manifest.updatedAt) : "Loading"}</span>
            </div>
            <div className="grid gap-3 rounded-3xl border border-white/10 bg-black/20 p-4 md:grid-cols-3">
              <div className="flex items-center gap-3">
                <div className="flex size-10 items-center justify-center rounded-2xl bg-white/[0.06] border border-white/10">
                  <Clock className="w-4 h-4 text-white/70" />
                </div>
                <div>
                  <p className="text-[10px] font-mono text-white/35">TERM</p>
                  <p className="text-white">{durationDays} days</p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <div className="flex size-10 items-center justify-center rounded-2xl bg-white/[0.06] border border-white/10">
                  <Shield className="w-4 h-4 text-white/70" />
                </div>
                <div>
                  <p className="text-[10px] font-mono text-white/35">ACCESS</p>
                  <p className="text-white">{isDemo ? "Preview only" : "Grant-gated"}</p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <div className="flex size-10 items-center justify-center rounded-2xl bg-white/[0.06] border border-white/10">
                  <Zap className="w-4 h-4 text-white/70" />
                </div>
                <div>
                  <p className="text-[10px] font-mono text-white/35">KIND</p>
                  <p className="text-white">{manifest?.packKind.replace("_", " ") ?? "Loading"}</p>
                </div>
              </div>
            </div>
            <div className="rounded-3xl border border-white/10 bg-white/[0.03] p-4">
              <p className="mb-2 font-medium text-white">Preview file list</p>
              <ul className="space-y-2 text-sm text-white/68">
                {manifest?.previewFiles.length ? (
                  manifest.previewFiles.map((entry) => <li key={entry}>{entry}</li>)
                ) : (
                  <li>No preview files published.</li>
                )}
              </ul>
            </div>
          </CardContent>
        </Card>

        <Card className="overflow-hidden border-white/10 bg-white/[0.03] backdrop-blur-sm text-white">
          <div className="h-px w-full bg-gradient-to-r from-transparent via-amber-300/40 to-transparent" />
          <CardHeader>
            <div className="flex items-center gap-2 mb-2">
              <Sparkles className="w-4 h-4 text-white/55" />
              <span className="text-[10px] font-mono text-white/35">LICENSE FLOW</span>
            </div>
            <CardTitle>{isDemo ? "Preview state" : "License state"}</CardTitle>
            <CardDescription className="text-white/60">
              {isDemo
                ? "This demo card shows the new marketplace detail view without attempting a live on-chain purchase."
                : <>Buy the timed license here, then mount the pack from <Link href="/owned-packs" className="underline underline-offset-4">Owned Packs</Link>.</>}
            </CardDescription>
          </CardHeader>
          <CardContent className="grid gap-4 text-sm text-white/72">
            <div className="flex items-center justify-between">
              <span>Wallet</span>
              <span>{isConnected && address ? formatAddress(address) : "Not connected"}</span>
            </div>
            <div className="flex items-center justify-between">
              <span>Owned license</span>
              <span>{isDemo ? "Preview only" : license?.licenseId.toString() ?? "None"}</span>
            </div>
            <div className="flex items-center justify-between">
              <span>Grant root</span>
              <span className="font-mono text-xs text-white/50">
                {isDemo ? "N/A" : license?.latestGrantRoot && license.latestGrantRoot !== ZERO_HEX_32 ? "Published" : "Waiting"}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span>Expiry</span>
              <span>{isDemo ? "N/A" : license ? formatTimestamp(license.expiresAt) : "Not owned"}</span>
            </div>
            <Button
              className="rounded-2xl h-11 bg-white text-black hover:bg-white/90"
              disabled={isDemo || !signer || pending || !packState}
              onClick={() => void handleBuy()}
            >
              {isDemo ? "Demo preview only" : pending ? "Submitting..." : license ? "Buy another term" : "Buy license"}
            </Button>
            {isDemo ? (
              <p className="rounded-2xl border border-amber-300/20 bg-amber-300/8 px-4 py-3 text-xs text-amber-100/90">
                Demo packs are for visual preview only. To test a live buy flow, open an actual on-chain pack from the marketplace list.
              </p>
            ) : (
              <p className="text-xs text-white/50">
                Creator-side access grants are separate. After purchase, the creator must publish a buyer access grant before the bundle can be mounted.
              </p>
            )}
            <Link href="/owned-packs" className="inline-flex items-center gap-2 text-xs text-white/40 hover:text-white/65 transition-colors">
              Open owned packs
              <ExternalLink className="w-3.5 h-3.5" />
            </Link>
          </CardContent>
        </Card>
      </div>
    </MarketplaceShell>
  );
}
