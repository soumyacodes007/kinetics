"use client";

import { useEffect, useState } from "react";
import { hexToBytes, decryptJson, type BuyerAccessGrant, type EncryptedPackBundlePayload, type MountedPack, type PackLicenseState, type PackPreviewManifest } from "@kinetics/core/browser";
import { useAccount } from "wagmi";
import { toast } from "sonner";
import { MarketplaceShell } from "@/components/marketplace-shell";
import { Button } from "@/components/ui/button";
import { getKnowledgePackClient, getPackLicenseClient, ZERO_HEX_32 } from "@/lib/chain";
import { formatTimestamp } from "@/lib/format";
import { readBytes, readJson } from "@/lib/storage-bridge";
import { ShoppingBag, Layers, Clock, CheckCircle2, AlertCircle, Cpu, X, RefreshCw } from "lucide-react";

interface OwnedLicenseItem {
  license: PackLicenseState;
  manifest: PackPreviewManifest;
}

function StatusBadge({ ready }: { ready: boolean }) {
  return ready ? (
    <span className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-[10px] font-mono">
      <CheckCircle2 className="w-3 h-3" />Ready
    </span>
  ) : (
    <span className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-amber-500/10 border border-amber-500/30 text-amber-400 text-[10px] font-mono">
      <AlertCircle className="w-3 h-3" />Grant pending
    </span>
  );
}

export default function OwnedPacksPage() {
  const { address, isConnected } = useAccount();
  const [licenses, setLicenses] = useState<OwnedLicenseItem[]>([]);
  const [mountedPacks, setMountedPacks] = useState<MountedPack[]>([]);
  const [loading, setLoading] = useState(true);

  async function refresh() {
    if (!address) { setLicenses([]); setLoading(false); return; }
    setLoading(true);
    try {
      const licenseClient = getPackLicenseClient();
      const packClient = getKnowledgePackClient();
      const ids = await licenseClient.getBuyerLicenseIds(address);
      const next: OwnedLicenseItem[] = [];
      for (const licenseId of ids) {
        const license = await licenseClient.getLicense(licenseId);
        const pack = await packClient.getPack(license.packId);
        if (pack.currentPreviewRoot === ZERO_HEX_32) continue;
        const manifest = await readJson<PackPreviewManifest>(pack.currentPreviewRoot);
        next.push({ license, manifest });
      }
      setLicenses(next);
    } finally { setLoading(false); }
  }

  useEffect(() => { void refresh(); }, [address]);

  async function mountLicense(item: OwnedLicenseItem) {
    if (!address) return;
    if (item.license.latestGrantRoot === ZERO_HEX_32) { toast.error("No published access grant yet"); return; }
    try {
      const grant = await readJson<BuyerAccessGrant>(item.license.latestGrantRoot);
      const manifest = await readJson<PackPreviewManifest>(grant.previewRoot);
      const bundleBytes = await readBytes(grant.bundleRoot);
      const bundle = await decryptJson<EncryptedPackBundlePayload>(new TextDecoder().decode(bundleBytes), hexToBytes(grant.encryptedVersionKey));
      const mounted: MountedPack = { packId: grant.packId, version: grant.version, manifest, bundle, mountedAt: Math.floor(Date.now() / 1000) };
      setMountedPacks((c) => [...c.filter((p) => p.packId !== mounted.packId), mounted]);
      toast.success(`Mounted ${manifest.title}`);
    } catch (error) { toast.error(error instanceof Error ? error.message : "Unable to mount pack"); }
  }

  const unmount = (packId: number) => setMountedPacks((c) => c.filter((p) => p.packId !== packId));

  return (
    <MarketplaceShell>
      {/* Header */}
      <div className="mb-5">
        <span className="inline-flex items-center gap-2 text-xs font-mono text-white/30 mb-1.5">
          <span className="w-5 h-px bg-white/20" />PURCHASED PACKS
        </span>
        <h1 className="font-display text-3xl text-white leading-tight">Your licensed packs.</h1>
        <p className="text-sm text-white/35 mt-1">Mount decrypted bundles into the current agent session.</p>
      </div>

      <div className="grid gap-4 xl:grid-cols-2 h-[calc(100vh-14rem)]">
        {/* Left: Owned licenses */}
        <div className="rounded-2xl border border-white/10 bg-white/[0.03] backdrop-blur-sm flex flex-col overflow-hidden">
          <div className="px-5 pt-5 pb-4 border-b border-white/8 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <ShoppingBag className="w-4 h-4 text-white/35" />
              <div>
                <h2 className="text-sm font-medium text-white">Owned licenses</h2>
                <p className="text-xs text-white/35">{isConnected ? "Live license inventory for connected wallet." : "Connect a wallet to view."}</p>
              </div>
            </div>
            <button onClick={() => void refresh()} className="p-1.5 rounded-lg text-white/30 hover:text-white/60 hover:bg-white/[0.05] transition-all">
              <RefreshCw className="w-3.5 h-3.5" />
            </button>
          </div>
          <div className="flex-1 overflow-y-auto p-4">
            {loading ? (
              <div className="space-y-3">
                {[1, 2].map((i) => <div key={i} className="h-28 rounded-xl bg-white/[0.04] animate-pulse" />)}
              </div>
            ) : licenses.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full py-12 text-center">
                <ShoppingBag className="w-8 h-8 text-white/10 mb-3" />
                <p className="text-sm text-white/35">No owned licenses found.</p>
                <p className="text-xs text-white/20 mt-1">Browse the marketplace to purchase packs.</p>
              </div>
            ) : (
              <div className="space-y-3">
                {licenses.map((item) => {
                  const ready = item.license.latestGrantRoot !== ZERO_HEX_32;
                  const isMounted = mountedPacks.some((p) => p.packId === Number(item.license.packId));
                  return (
                    <div key={item.license.licenseId.toString()} className="rounded-xl border border-white/10 bg-white/[0.03] p-4">
                      <div className="flex items-start justify-between gap-3 mb-3">
                        <div>
                          <p className="text-sm font-medium text-white">{item.manifest.title}</p>
                          <p className="text-xs text-white/35 font-mono">License #{item.license.licenseId.toString()}</p>
                        </div>
                        <StatusBadge ready={ready} />
                      </div>
                      <div className="flex items-center gap-4 mb-3 text-xs text-white/35">
                        <span className="flex items-center gap-1"><Clock className="w-3 h-3" />Expires {formatTimestamp(item.license.expiresAt)}</span>
                        <span>Grant v{item.license.latestGrantVersion.toString()}</span>
                      </div>
                      <Button
                        variant="outline"
                        disabled={!ready}
                        onClick={() => void mountLicense(item)}
                        className={`h-8 text-xs rounded-xl w-full border-white/15 transition-all ${isMounted ? "text-emerald-400 border-emerald-500/30 bg-emerald-500/5" : "text-white/60 hover:text-white hover:border-white/30"}`}
                      >
                        <Cpu className="w-3.5 h-3.5 mr-1.5" />
                        {isMounted ? "Mounted ✓" : ready ? "Mount pack" : "Awaiting grant"}
                      </Button>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* Right: Mounted session */}
        <div className="rounded-2xl border border-white/10 bg-white/[0.03] backdrop-blur-sm flex flex-col overflow-hidden">
          <div className="px-5 pt-5 pb-4 border-b border-white/8">
            <div className="flex items-center gap-3">
              <Layers className="w-4 h-4 text-white/35" />
              <div>
                <h2 className="text-sm font-medium text-white">Mounted session</h2>
                <p className="text-xs text-white/35">Decrypted packs active in this browser session.</p>
              </div>
            </div>
          </div>
          <div className="flex-1 overflow-y-auto p-4">
            {mountedPacks.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full py-12 text-center">
                <Layers className="w-8 h-8 text-white/10 mb-3" />
                <p className="text-sm text-white/35">Nothing mounted yet.</p>
                <p className="text-xs text-white/20 mt-1">Mount a licensed pack on the left to activate it here.</p>
              </div>
            ) : (
              <div className="space-y-3">
                {mountedPacks.map((pack) => (
                  <div key={pack.packId} className="rounded-xl border border-emerald-500/20 bg-emerald-500/[0.04] p-4">
                    <div className="flex items-start justify-between gap-3 mb-3">
                      <div>
                        <p className="text-sm font-medium text-white">{pack.manifest.title}</p>
                        <p className="text-xs text-white/35">Mounted v{pack.version}</p>
                      </div>
                      <button onClick={() => unmount(pack.packId)} className="p-1.5 rounded-lg text-white/25 hover:text-white/60 hover:bg-white/[0.05] transition-all">
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </div>
                    {pack.bundle.mountInstructions.systemPromptAddition && (
                      <p className="text-xs text-white/50 mb-3 leading-relaxed">{pack.bundle.mountInstructions.systemPromptAddition}</p>
                    )}
                    {pack.bundle.mountInstructions.recommendedTools.length > 0 && (
                      <div className="flex flex-wrap gap-1.5 mb-3">
                        {pack.bundle.mountInstructions.recommendedTools.map((t) => (
                          <span key={t} className="px-2 py-0.5 rounded-full bg-white/[0.05] border border-white/8 text-[10px] font-mono text-white/40">{t}</span>
                        ))}
                      </div>
                    )}
                    <div className="rounded-xl border border-white/8 bg-white/[0.03] p-3">
                      <p className="text-[10px] font-mono uppercase tracking-widest text-white/30 mb-2">Bundle files</p>
                      <ul className="space-y-1.5 text-xs text-white/50">
                        {pack.bundle.files.map((f) => (
                          <li key={f.path}>
                            <span className="font-mono text-white/70">{f.path}</span>
                            <span className="ml-2 text-white/30">{f.content.slice(0, 80)}{f.content.length > 80 ? "…" : ""}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </MarketplaceShell>
  );
}
