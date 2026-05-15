"use client";

import { parseEther } from "ethers";
import { createPackDraft, encryptJson, hexToBytes, type PackKind, type PackPreviewManifest, type PackLicenseState } from "@kinetics/core/browser";
import { useEffect, useMemo, useState } from "react";
import { useAccount } from "wagmi";
import { toast } from "sonner";
import { MarketplaceShell } from "@/components/marketplace-shell";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { findCreatorVersion, loadCreatorVersions, saveCreatorVersion, type CreatorPackVersionRecord } from "@/lib/creator-cache";
import { getKnowledgePackClient, getPackLicenseClient, ZERO_HEX_32 } from "@/lib/chain";
import { formatAddress, formatTokenAmount, formatTimestamp, parseList } from "@/lib/format";
import { readJson, uploadBytes } from "@/lib/storage-bridge";
import { useEthersSigner } from "@/hooks/use-ethers-signer";
import { Activity, BarChart3, BookOpen, Clock, ExternalLink, Layers3, RefreshCw, Shield, Sparkles, Wallet } from "lucide-react";

interface CreatorPackRecord {
  packId: number;
  manifest: PackPreviewManifest;
  packState: Awaited<ReturnType<ReturnType<typeof getKnowledgePackClient>["getPack"]>>;
  licenses: PackLicenseState[];
  activeLicenses: number;
  publishedGrants: number;
  cachedVersions: CreatorPackVersionRecord[];
}

function randomHex(bytes: number): string {
  const buffer = globalThis.crypto.getRandomValues(new Uint8Array(bytes));
  return `0x${Array.from(buffer, (value) => value.toString(16).padStart(2, "0")).join("")}`;
}

function Panel(props: { title: string; description?: string; children: React.ReactNode; icon?: React.ReactNode }) {
  return (
    <div className="overflow-hidden rounded-2xl border border-white/10 bg-white/[0.03] backdrop-blur-sm">
      <div className="border-b border-white/8 px-5 py-4">
        <div className="mb-1 flex items-center gap-2">
          {props.icon ? <span className="text-white/45">{props.icon}</span> : null}
          <h2 className="text-sm font-medium text-white">{props.title}</h2>
        </div>
        {props.description ? <p className="text-xs text-white/35">{props.description}</p> : null}
      </div>
      <div className="p-5">{props.children}</div>
    </div>
  );
}

const inputClassName =
  "bg-white/[0.04] border-white/10 text-white placeholder:text-white/25 focus:border-white/22 focus:bg-white/[0.06] rounded-xl h-9 text-sm";
const textareaClassName =
  "bg-white/[0.04] border-white/10 text-white placeholder:text-white/25 focus:border-white/22 focus:bg-white/[0.06] rounded-xl text-sm resize-none";

export default function MyPacksPage() {
  const { address, isConnected } = useAccount();
  const signer = useEthersSigner();
  const [packs, setPacks] = useState<CreatorPackRecord[]>([]);
  const [selectedPackId, setSelectedPackId] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [withdrawableBalanceWei, setWithdrawableBalanceWei] = useState<bigint>(BigInt(0));
  const [saleTermPending, setSaleTermPending] = useState(false);
  const [publishPending, setPublishPending] = useState(false);
  const [activeView, setActiveView] = useState<"analytics" | "update">("analytics");
  const [saleTerms, setSaleTerms] = useState({
    priceIn0G: "0.05",
    licenseDurationDays: "30",
    active: true
  });
  const [updateForm, setUpdateForm] = useState({
    title: "",
    slug: "",
    shortDescription: "",
    packKind: "skill_only" as PackKind,
    tags: "",
    keywords: "",
    previewFiles: "",
    bundlePath: "README.md",
    bundleContent: "",
    knowledgeDocTitle: "",
    knowledgeDocText: "",
    systemPromptAddition: "",
    recommendedTools: "",
    changelog: "Update"
  });

  const selectedPack = useMemo(
    () => packs.find((pack) => pack.packId === selectedPackId) ?? null,
    [packs, selectedPackId]
  );

  async function loadPacks() {
    if (!address) {
      setPacks([]);
      setSelectedPackId(null);
      setWithdrawableBalanceWei(BigInt(0));
      setLoading(false);
      return;
    }

    const isRefresh = !loading;
    if (isRefresh) {
      setRefreshing(true);
    } else {
      setLoading(true);
    }

    try {
      const knowledgePack = getKnowledgePackClient();
      const licenseRegistry = getPackLicenseClient();
      const packIds = (await knowledgePack.getCreatorPackIds(address)).map(Number);
      const allCachedVersions = loadCreatorVersions(address);
      const totalLicenses = Number(await licenseRegistry.getTotalSupply());
      const allLicenses: PackLicenseState[] = [];

      for (let licenseId = 1; licenseId <= totalLicenses; licenseId += 1) {
        try {
          allLicenses.push(await licenseRegistry.getLicense(licenseId));
        } catch {
          // Skip unreadable license slots.
        }
      }

      const now = Math.floor(Date.now() / 1000);
      const nextPacks: CreatorPackRecord[] = [];

      for (const packId of packIds) {
        const packState = await knowledgePack.getPack(packId);
        if (!packState.active && packState.currentPreviewRoot === ZERO_HEX_32) {
          continue;
        }

        const manifest = await readJson<PackPreviewManifest>(packState.currentPreviewRoot);
        const licenses = allLicenses.filter((license) => Number(license.packId) === packId);
        const cachedVersions = allCachedVersions.filter((entry) => entry.packId === packId);

        nextPacks.push({
          packId,
          manifest,
          packState,
          licenses,
          activeLicenses: licenses.filter((license) => license.active && Number(license.expiresAt) >= now).length,
          publishedGrants: licenses.filter((license) => license.latestGrantRoot !== ZERO_HEX_32).length,
          cachedVersions
        });
      }

      nextPacks.sort((left, right) => right.packId - left.packId);
      setPacks(nextPacks);
      setWithdrawableBalanceWei(await licenseRegistry.getCreatorBalance(address));

      if (nextPacks.length === 0 || !nextPacks.some((pack) => pack.packId === selectedPackId)) {
        setSelectedPackId(null);
      }
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Unable to load your packs");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }

  useEffect(() => {
    void loadPacks();
  }, [address]);

  useEffect(() => {
    if (!selectedPack) {
      return;
    }

    setActiveView("analytics");

    setSaleTerms({
      priceIn0G: Number(selectedPack.packState.priceWei) > 0 ? (Number(selectedPack.packState.priceWei) / 1e18).toString() : "0",
      licenseDurationDays: Math.max(1, Number(selectedPack.packState.licenseDurationSeconds / BigInt(86400))).toString(),
      active: selectedPack.packState.active
    });
    setUpdateForm({
      title: selectedPack.manifest.title,
      slug: selectedPack.manifest.slug,
      shortDescription: selectedPack.manifest.shortDescription,
      packKind: selectedPack.manifest.packKind,
      tags: selectedPack.manifest.tags.join(", "),
      keywords: selectedPack.manifest.keywords.join(", "),
      previewFiles: selectedPack.manifest.previewFiles.join("\n"),
      bundlePath: "README.md",
      bundleContent: "",
      knowledgeDocTitle: "",
      knowledgeDocText: "",
      systemPromptAddition: "",
      recommendedTools: "",
      changelog: `Update for ${selectedPack.manifest.title}`
    });
  }, [selectedPack?.packId]);

  async function saveSaleTerms() {
    if (!selectedPack || !signer) {
      toast.error("Connect a wallet first");
      return;
    }

    setSaleTermPending(true);
    try {
      const knowledgePack = getKnowledgePackClient(signer);
      await knowledgePack.setSaleTerms(
        selectedPack.packId,
        parseEther(saleTerms.priceIn0G || "0"),
        BigInt(Number(saleTerms.licenseDurationDays || "0") * 24 * 60 * 60),
        saleTerms.active
      );
      toast.success("Sale terms updated");
      await loadPacks();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Unable to update sale terms");
    } finally {
      setSaleTermPending(false);
    }
  }

  async function publishUpdate() {
    if (!selectedPack || !signer || !address) {
      toast.error("Connect a wallet first");
      return;
    }

    if (!updateForm.bundleContent.trim()) {
      toast.error("Bundle content is required for a new version");
      return;
    }

    setPublishPending(true);
    try {
      const knowledgePack = getKnowledgePackClient(signer);
      const nextVersion = Number(selectedPack.packState.currentVersion) + 1;
      const draft = createPackDraft({
        slug: updateForm.slug,
        title: updateForm.title,
        shortDescription: updateForm.shortDescription,
        packKind: updateForm.packKind,
        tags: parseList(updateForm.tags),
        keywords: parseList(updateForm.keywords),
        previewFiles: parseList(updateForm.previewFiles),
        files: [
          {
            path: updateForm.bundlePath,
            content: updateForm.bundleContent
          }
        ],
        knowledgeDocs:
          updateForm.knowledgeDocTitle.trim() && updateForm.knowledgeDocText.trim()
            ? [
                {
                  docId: `doc-${Date.now().toString(36)}`,
                  title: updateForm.knowledgeDocTitle,
                  text: updateForm.knowledgeDocText
                }
              ]
            : [],
        mountInstructions: {
          systemPromptAddition: updateForm.systemPromptAddition,
          recommendedTools: parseList(updateForm.recommendedTools)
        },
        changelog: updateForm.changelog,
        priceWei: parseEther(saleTerms.priceIn0G || "0").toString(),
        licenseDurationDays: Number(saleTerms.licenseDurationDays || "0"),
        creator: address
      });

      draft.manifest.packId = selectedPack.packId;
      draft.manifest.currentVersion = nextVersion;
      draft.bundle.packId = selectedPack.packId;
      draft.bundle.version = nextVersion;

      const versionKeyHex = randomHex(32);
      const previewUpload = await uploadBytes(
        `${draft.manifest.slug}-preview-v${nextVersion}.json`,
        new TextEncoder().encode(JSON.stringify(draft.manifest))
      );
      const bundleCiphertext = await encryptJson(draft.bundle, hexToBytes(versionKeyHex));
      const bundleUpload = await uploadBytes(
        `pack-${draft.manifest.slug}-v${nextVersion}.enc`,
        new TextEncoder().encode(bundleCiphertext)
      );

      await knowledgePack.publishVersion(selectedPack.packId, nextVersion, previewUpload.rootHash, bundleUpload.rootHash);
      await knowledgePack.setSaleTerms(
        selectedPack.packId,
        parseEther(saleTerms.priceIn0G || "0"),
        BigInt(Number(saleTerms.licenseDurationDays || "0") * 24 * 60 * 60),
        saleTerms.active
      );

      saveCreatorVersion(address, {
        packId: selectedPack.packId,
        version: nextVersion,
        previewRoot: previewUpload.rootHash,
        bundleRoot: bundleUpload.rootHash,
        versionKeyHex,
        slug: updateForm.slug,
        title: updateForm.title,
        updatedAt: Math.floor(Date.now() / 1000)
      });

      toast.success(`Published version ${nextVersion}`);
      await loadPacks();
      setUpdateForm((current) => ({
        ...current,
        bundleContent: "",
        knowledgeDocTitle: "",
        knowledgeDocText: "",
        systemPromptAddition: "",
        recommendedTools: "",
        changelog: `Update for ${updateForm.title}`
      }));
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Unable to publish update");
    } finally {
      setPublishPending(false);
    }
  }

  return (
    <MarketplaceShell>
      <div className="mb-5 flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <span className="mb-1.5 inline-flex items-center gap-2 text-xs font-mono text-white/30">
            <span className="h-px w-5 bg-white/20" />
            MY PACKS
          </span>
          <h1 className="font-display text-3xl text-white leading-tight">Manage your published skills.</h1>
          <p className="mt-1 text-sm text-white/35">View creator-side analytics, update sale terms, and publish new versions from one workspace.</p>
        </div>
        <div className="flex items-center gap-3">
          <div className="rounded-xl border border-white/10 bg-white/[0.03] px-4 py-3">
            <p className="text-[10px] font-mono text-white/35">WITHDRAWABLE</p>
            <p className="text-lg font-display text-white">{formatTokenAmount(withdrawableBalanceWei)}</p>
          </div>
          <Button
            variant="outline"
            className="h-10 rounded-xl border-white/15 text-white/75 hover:border-white/30 hover:text-white"
            onClick={() => void loadPacks()}
            disabled={refreshing}
          >
            <RefreshCw className={`mr-2 h-4 w-4 ${refreshing ? "animate-spin" : ""}`} />
            Refresh
          </Button>
        </div>
      </div>

      <div className="grid gap-4 xl:h-[calc(100vh-12rem)] xl:grid-cols-[360px_minmax(0,1fr)]">
        <Panel
          title="Your skills"
          description={isConnected ? "Select a pack to inspect analytics and publish updates." : "Connect a wallet to load your creator packs."}
          icon={<BookOpen className="h-4 w-4" />}
        >
          {loading ? (
            <p className="text-sm text-white/40">Loading your packs...</p>
          ) : packs.length === 0 ? (
            <p className="text-sm text-white/40">No packs found for this wallet yet.</p>
          ) : (
            <div className="grid gap-2 xl:max-h-[calc(100vh-20rem)] xl:overflow-y-auto xl:pr-1">
              {packs.map((pack) => {
                const active = selectedPackId === pack.packId;
                return (
                  <button
                    key={pack.packId}
                    onClick={() => setSelectedPackId(pack.packId)}
                    className={`rounded-xl border px-4 py-3 text-left transition-all ${
                      active
                        ? "border-white/20 bg-white/[0.07] shadow-lg shadow-black/20"
                        : "border-white/10 bg-white/[0.03] hover:border-white/15 hover:bg-white/[0.05]"
                    }`}
                  >
                    <div className="flex items-center justify-between gap-3">
                      <div className="min-w-0">
                        <p className="truncate text-sm font-medium text-white">{pack.manifest.title}</p>
                        <p className="mt-1 truncate text-xs text-white/38">{pack.manifest.slug}</p>
                      </div>
                      <div className="flex shrink-0 items-center gap-2">
                        <Badge variant="outline">#{pack.packId}</Badge>
                        <Badge variant="secondary">v{pack.packState.currentVersion.toString()}</Badge>
                      </div>
                    </div>
                    <div className="mt-3 flex items-center gap-4 text-[11px] text-white/40">
                      <span>{pack.licenses.length} licenses</span>
                      <span>{pack.activeLicenses} active</span>
                      <span>{pack.publishedGrants} grants</span>
                      <span className={pack.packState.active ? "text-emerald-300/80" : "text-white/35"}>
                        {pack.packState.active ? "active" : "inactive"}
                      </span>
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </Panel>

        <div className="grid min-h-0 gap-4">
          {!selectedPack ? (
            <Panel title="Pack workspace" description="Choose a skill from the left list to open analytics or publish an update." icon={<BarChart3 className="h-4 w-4" />}>
              <div className="flex h-[calc(100vh-20rem)] items-center justify-center rounded-2xl border border-dashed border-white/10 bg-black/20 text-center">
                <div>
                  <p className="font-display text-2xl text-white">Select a skill</p>
                  <p className="mt-2 text-sm text-white/40">Analytics and update controls stay hidden until you explicitly open a pack.</p>
                </div>
              </div>
            </Panel>
          ) : (
            <>
              <Panel
                title={selectedPack.manifest.title}
                description="Creator-side analytics for the currently selected pack."
                icon={<Activity className="h-4 w-4" />}
              >
                <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
                  <div className="flex flex-wrap items-center gap-2">
                    <Badge variant="outline">#{selectedPack.packId}</Badge>
                    <Badge variant="secondary">v{selectedPack.packState.currentVersion.toString()}</Badge>
                    <Badge variant={selectedPack.packState.active ? "secondary" : "outline"}>
                      {selectedPack.packState.active ? "active" : "inactive"}
                    </Badge>
                  </div>
                  <div className="flex items-center gap-2 rounded-xl border border-white/10 bg-black/20 p-1">
                    <button
                      onClick={() => setActiveView("analytics")}
                      className={`rounded-lg px-3 py-1.5 text-xs transition-all ${
                        activeView === "analytics" ? "bg-white text-black" : "text-white/45 hover:text-white/75"
                      }`}
                    >
                      Analytics
                    </button>
                    <button
                      onClick={() => setActiveView("update")}
                      className={`rounded-lg px-3 py-1.5 text-xs transition-all ${
                        activeView === "update" ? "bg-white text-black" : "text-white/45 hover:text-white/75"
                      }`}
                    >
                      Update
                    </button>
                  </div>
                </div>
                <div className="xl:max-h-[calc(100vh-24rem)] xl:overflow-y-auto xl:pr-1">
                  {activeView === "analytics" ? (
                    <div className="grid gap-4">
                      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
                        <div className="rounded-2xl border border-white/10 bg-black/20 p-4">
                          <p className="text-[10px] font-mono text-white/30">LICENSES ISSUED</p>
                          <p className="mt-2 text-2xl font-display text-white">{selectedPack.licenses.length}</p>
                        </div>
                        <div className="rounded-2xl border border-white/10 bg-black/20 p-4">
                          <p className="text-[10px] font-mono text-white/30">ACTIVE BUYERS</p>
                          <p className="mt-2 text-2xl font-display text-white">{selectedPack.activeLicenses}</p>
                        </div>
                        <div className="rounded-2xl border border-white/10 bg-black/20 p-4">
                          <p className="text-[10px] font-mono text-white/30">GRANTS PUBLISHED</p>
                          <p className="mt-2 text-2xl font-display text-white">{selectedPack.publishedGrants}</p>
                        </div>
                        <div className="rounded-2xl border border-white/10 bg-black/20 p-4">
                          <p className="text-[10px] font-mono text-white/30">CURRENT PRICE</p>
                          <p className="mt-2 text-lg font-display text-white">{formatTokenAmount(selectedPack.packState.priceWei)}</p>
                        </div>
                      </div>

                      <div className="grid gap-3 md:grid-cols-2">
                        <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-4 text-sm text-white/68">
                          <div className="mb-2 flex items-center gap-2 text-white">
                            <Wallet className="h-4 w-4 text-white/45" />
                            Creator wallet
                          </div>
                          <p>{formatAddress(selectedPack.packState.creator)}</p>
                        </div>
                        <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-4 text-sm text-white/68">
                          <div className="mb-2 flex items-center gap-2 text-white">
                            <Clock className="h-4 w-4 text-white/45" />
                            Last manifest update
                          </div>
                          <p>{formatTimestamp(selectedPack.manifest.updatedAt)}</p>
                        </div>
                      </div>

                      <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-4">
                        <div className="mb-3 flex items-center gap-2 text-white">
                          <Layers3 className="h-4 w-4 text-white/45" />
                          <p className="text-sm font-medium">Recent license activity</p>
                        </div>
                        {selectedPack.licenses.length === 0 ? (
                          <p className="text-sm text-white/40">No licenses have been issued for this pack yet.</p>
                        ) : (
                          <div className="grid gap-2">
                            {selectedPack.licenses.slice().reverse().slice(0, 6).map((license) => (
                              <div key={license.licenseId.toString()} className="flex items-center justify-between rounded-xl border border-white/8 bg-black/20 px-3 py-2 text-xs text-white/55">
                                <span>License #{license.licenseId.toString()}</span>
                                <span>{formatTimestamp(license.expiresAt)}</span>
                                <span>{license.latestGrantRoot !== ZERO_HEX_32 ? "grant published" : "grant pending"}</span>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                  ) : (
                    <div className="grid gap-4">
                      <div className="grid gap-4 xl:grid-cols-[0.72fr_1.28fr]">
                        <div className="rounded-2xl border border-white/10 bg-black/20 p-4">
                          <div className="mb-3 flex items-center gap-2 text-white">
                            <Shield className="h-4 w-4 text-white/45" />
                            <p className="text-sm font-medium">Sale terms</p>
                          </div>
                          <div className="grid gap-3">
                            <Input
                              value={saleTerms.priceIn0G}
                              onChange={(event) => setSaleTerms((current) => ({ ...current, priceIn0G: event.target.value }))}
                              placeholder="Price in 0G"
                              className={inputClassName}
                            />
                            <Input
                              value={saleTerms.licenseDurationDays}
                              onChange={(event) => setSaleTerms((current) => ({ ...current, licenseDurationDays: event.target.value }))}
                              placeholder="Duration in days"
                              className={inputClassName}
                            />
                            <button
                              onClick={() => setSaleTerms((current) => ({ ...current, active: !current.active }))}
                              className={`rounded-xl border px-3 py-2 text-sm transition-all ${
                                saleTerms.active
                                  ? "border-emerald-400/30 bg-emerald-400/10 text-emerald-200"
                                  : "border-white/10 bg-white/[0.03] text-white/55"
                              }`}
                            >
                              {saleTerms.active ? "Pack active" : "Pack inactive"}
                            </button>
                            <Button
                              className="h-10 rounded-xl bg-white text-black hover:bg-white/90"
                              disabled={!signer || saleTermPending}
                              onClick={() => void saveSaleTerms()}
                            >
                              {saleTermPending ? "Saving..." : "Save sale terms"}
                            </Button>
                          </div>
                        </div>

                        <div className="rounded-2xl border border-white/10 bg-black/20 p-4">
                          <div className="mb-3 flex items-center gap-2 text-white">
                            <Sparkles className="h-4 w-4 text-white/45" />
                            <p className="text-sm font-medium">Publish update</p>
                          </div>
                          <div className="grid gap-3">
                            <div className="grid grid-cols-2 gap-3">
                              <Input
                                value={updateForm.title}
                                onChange={(event) => setUpdateForm((current) => ({ ...current, title: event.target.value }))}
                                placeholder="Title"
                                className={inputClassName}
                              />
                              <Input
                                value={updateForm.slug}
                                onChange={(event) => setUpdateForm((current) => ({ ...current, slug: event.target.value }))}
                                placeholder="Slug"
                                className={inputClassName}
                              />
                            </div>
                            <Input
                              value={updateForm.shortDescription}
                              onChange={(event) => setUpdateForm((current) => ({ ...current, shortDescription: event.target.value }))}
                              placeholder="Short description"
                              className={inputClassName}
                            />
                            <div className="grid grid-cols-2 gap-3">
                              <Input
                                value={updateForm.tags}
                                onChange={(event) => setUpdateForm((current) => ({ ...current, tags: event.target.value }))}
                                placeholder="Tags"
                                className={inputClassName}
                              />
                              <Input
                                value={updateForm.keywords}
                                onChange={(event) => setUpdateForm((current) => ({ ...current, keywords: event.target.value }))}
                                placeholder="Keywords"
                                className={inputClassName}
                              />
                            </div>
                            <Textarea
                              value={updateForm.previewFiles}
                              onChange={(event) => setUpdateForm((current) => ({ ...current, previewFiles: event.target.value }))}
                              placeholder="Preview files"
                              className={`${textareaClassName} h-16`}
                            />
                            <div className="grid grid-cols-2 gap-3">
                              <Input
                                value={updateForm.bundlePath}
                                onChange={(event) => setUpdateForm((current) => ({ ...current, bundlePath: event.target.value }))}
                                placeholder="Bundle file path"
                                className={inputClassName}
                              />
                              <Input
                                value={updateForm.recommendedTools}
                                onChange={(event) => setUpdateForm((current) => ({ ...current, recommendedTools: event.target.value }))}
                                placeholder="Recommended tools"
                                className={inputClassName}
                              />
                            </div>
                            <Textarea
                              value={updateForm.bundleContent}
                              onChange={(event) => setUpdateForm((current) => ({ ...current, bundleContent: event.target.value }))}
                              placeholder="Bundle file content"
                              className={`${textareaClassName} h-20`}
                            />
                            <div className="grid grid-cols-2 gap-3">
                              <Input
                                value={updateForm.knowledgeDocTitle}
                                onChange={(event) => setUpdateForm((current) => ({ ...current, knowledgeDocTitle: event.target.value }))}
                                placeholder="Knowledge doc title"
                                className={inputClassName}
                              />
                              <Input
                                value={updateForm.changelog}
                                onChange={(event) => setUpdateForm((current) => ({ ...current, changelog: event.target.value }))}
                                placeholder="Changelog"
                                className={inputClassName}
                              />
                            </div>
                            <Textarea
                              value={updateForm.knowledgeDocText}
                              onChange={(event) => setUpdateForm((current) => ({ ...current, knowledgeDocText: event.target.value }))}
                              placeholder="Knowledge doc text"
                              className={`${textareaClassName} h-14`}
                            />
                            <Textarea
                              value={updateForm.systemPromptAddition}
                              onChange={(event) => setUpdateForm((current) => ({ ...current, systemPromptAddition: event.target.value }))}
                              placeholder="System prompt addition"
                              className={`${textareaClassName} h-14`}
                            />
                            <Button
                              className="h-10 rounded-xl bg-white text-black hover:bg-white/90"
                              disabled={!signer || publishPending}
                              onClick={() => void publishUpdate()}
                            >
                              {publishPending ? "Publishing..." : `Publish version ${selectedPack.packState.currentVersion + BigInt(1)}`}
                            </Button>
                          </div>
                        </div>
                      </div>

                      <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-4">
                        <div className="mb-3 flex items-center gap-2 text-white">
                          <ExternalLink className="h-4 w-4 text-white/45" />
                          <p className="text-sm font-medium">Known versions</p>
                        </div>
                        {selectedPack.cachedVersions.length === 0 ? (
                          <p className="text-sm text-white/40">No local version metadata cached for this pack yet.</p>
                        ) : (
                          <div className="grid gap-3 md:grid-cols-2">
                            {selectedPack.cachedVersions
                              .slice()
                              .sort((left, right) => right.version - left.version)
                              .map((version) => (
                                <div key={`${version.packId}-${version.version}`} className="rounded-xl border border-white/10 bg-black/20 p-4 text-sm text-white/65">
                                  <div className="mb-2 flex items-center gap-2">
                                    <Badge variant="outline">v{version.version}</Badge>
                                    <span className="font-medium text-white">{version.title}</span>
                                  </div>
                                  <div className="grid gap-1 text-xs text-white/40">
                                    <div className="flex items-center justify-between">
                                      <span>Preview root</span>
                                      <span className="font-mono">{version.previewRoot.slice(0, 10)}...</span>
                                    </div>
                                    <div className="flex items-center justify-between">
                                      <span>Bundle root</span>
                                      <span className="font-mono">{version.bundleRoot.slice(0, 10)}...</span>
                                    </div>
                                    <div className="flex items-center justify-between">
                                      <span>Updated</span>
                                      <span>{formatTimestamp(version.updatedAt)}</span>
                                    </div>
                                  </div>
                                </div>
                              ))}
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              </Panel>
            </>
          )}
        </div>
      </div>
    </MarketplaceShell>
  );
}
