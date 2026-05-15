"use client";

import { parseEther } from "ethers";
import { createPackDraft, encryptJson, hexToBytes, type BuyerAccessGrant, type PackKind } from "@kinetics/core/browser";
import { useEffect, useState } from "react";
import { useAccount } from "wagmi";
import { toast } from "sonner";
import { MarketplaceShell } from "@/components/marketplace-shell";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { findCreatorVersion, loadCreatorVersions, saveCreatorVersion, type CreatorPackVersionRecord } from "@/lib/creator-cache";
import { getKnowledgePackClient, getPackLicenseClient } from "@/lib/chain";
import { parseList } from "@/lib/format";
import { uploadBytes } from "@/lib/storage-bridge";
import { useEthersSigner } from "@/hooks/use-ethers-signer";
import { PackageOpen, Sparkles, Key, Info } from "lucide-react";

function randomHex(bytes: number): string {
  const buffer = globalThis.crypto.getRandomValues(new Uint8Array(bytes));
  return `0x${Array.from(buffer, (v) => v.toString(16).padStart(2, "0")).join("")}`;
}

function GlassPanel({ title, description, icon, children }: { title: string; description?: string; icon?: React.ReactNode; children: React.ReactNode }) {
  return (
    <div className="rounded-2xl border border-white/10 bg-white/[0.03] backdrop-blur-sm overflow-hidden">
      <div className="px-5 pt-5 pb-4 border-b border-white/8">
        <div className="flex items-center gap-3 mb-0.5">
          {icon && <span className="text-white/40">{icon}</span>}
          <h2 className="text-sm font-medium text-white">{title}</h2>
        </div>
        {description && <p className="text-xs text-white/35 mt-1">{description}</p>}
      </div>
      <div className="p-5">{children}</div>
    </div>
  );
}

export default function CreatorPage() {
  const { address, isConnected } = useAccount();
  const signer = useEthersSigner();
  const [knownVersions, setKnownVersions] = useState<CreatorPackVersionRecord[]>([]);
  const [pending, setPending] = useState(false);
  const [grantPending, setGrantPending] = useState(false);

  const [form, setForm] = useState({
    existingPackId: "", title: "", slug: "", shortDescription: "",
    packKind: "skill_only" as PackKind,
    tags: "", keywords: "", previewFiles: "",
    bundlePath: "README.md", bundleContent: "",
    knowledgeDocTitle: "", knowledgeDocText: "",
    systemPromptAddition: "", recommendedTools: "",
    changelog: "Initial version", priceIn0G: "0.05", licenseDurationDays: "30",
  });
  const [grantForm, setGrantForm] = useState({ licenseId: "", version: "" });

  const field = (key: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
    setForm((c) => ({ ...c, [key]: e.target.value }));

  useEffect(() => {
    if (!address) { setKnownVersions([]); return; }
    setKnownVersions(loadCreatorVersions(address));
  }, [address]);

  async function handlePublish() {
    if (!signer || !address) { toast.error("Connect a wallet first"); return; }
    setPending(true);
    try {
      const knowledgePack = getKnowledgePackClient(signer);
      const existingPackId = Number(form.existingPackId || 0);
      const nextPackId = existingPackId > 0 ? existingPackId : Number(await knowledgePack.getTotalSupply()) + 1;
      const nextVersion = existingPackId > 0 ? Number((await knowledgePack.getPack(existingPackId)).currentVersion) + 1 : 1;

      const draft = createPackDraft({
        slug: form.slug, title: form.title, shortDescription: form.shortDescription,
        packKind: form.packKind, tags: parseList(form.tags), keywords: parseList(form.keywords),
        previewFiles: parseList(form.previewFiles),
        files: [{ path: form.bundlePath, content: form.bundleContent }],
        knowledgeDocs: form.knowledgeDocTitle.trim() && form.knowledgeDocText.trim()
          ? [{ docId: `doc-${Date.now().toString(36)}`, title: form.knowledgeDocTitle, text: form.knowledgeDocText }] : [],
        mountInstructions: { systemPromptAddition: form.systemPromptAddition, recommendedTools: parseList(form.recommendedTools) },
        changelog: form.changelog, priceWei: parseEther(form.priceIn0G).toString(),
        licenseDurationDays: Number(form.licenseDurationDays), creator: address,
      });
      draft.manifest.packId = nextPackId; draft.manifest.currentVersion = nextVersion;
      draft.bundle.packId = nextPackId;   draft.bundle.version = nextVersion;

      const versionKeyHex = randomHex(32);
      const previewUpload = await uploadBytes(`${draft.manifest.slug}-preview.json`, new TextEncoder().encode(JSON.stringify(draft.manifest)));
      const bundleCiphertext = await encryptJson(draft.bundle, hexToBytes(versionKeyHex));
      const bundleUpload = await uploadBytes(`pack-${draft.manifest.slug}-v${draft.bundle.version}.enc`, new TextEncoder().encode(bundleCiphertext));

      let packId = nextPackId, version = nextVersion;
      if (existingPackId > 0) {
        await knowledgePack.publishVersion(packId, version, previewUpload.rootHash, bundleUpload.rootHash);
        await knowledgePack.setSaleTerms(packId, parseEther(form.priceIn0G), BigInt(Number(form.licenseDurationDays) * 86400), true);
      } else {
        await knowledgePack.mintPack(form.slug, form.packKind === "knowledge_only" ? 1 : form.packKind === "hybrid" ? 2 : 0, previewUpload.rootHash, bundleUpload.rootHash);
        const afterIds = await knowledgePack.getCreatorPackIds(address);
        packId = Number(afterIds[afterIds.length - 1] ?? BigInt(0));
        await knowledgePack.setSaleTerms(packId, parseEther(form.priceIn0G), BigInt(Number(form.licenseDurationDays) * 86400), true);
      }

      const record = { packId, version, previewRoot: previewUpload.rootHash, bundleRoot: bundleUpload.rootHash, versionKeyHex, slug: form.slug, title: form.title, updatedAt: Math.floor(Date.now() / 1000) };
      setKnownVersions(saveCreatorVersion(address, record));
      toast.success(existingPackId > 0 ? `Published version ${version}` : `Minted pack #${packId}`);
    } catch (error) { toast.error(error instanceof Error ? error.message : "Pack publish failed"); }
    finally { setPending(false); }
  }

  async function publishGrant() {
    if (!signer || !address) { toast.error("Connect a creator wallet first"); return; }
    const licenseId = Number(grantForm.licenseId), version = Number(grantForm.version);
    if (!licenseId || !version) { toast.error("License ID and version are required"); return; }
    setGrantPending(true);
    try {
      const licenseRegistry = getPackLicenseClient(signer);
      const license = await licenseRegistry.getLicense(licenseId);
      const record = findCreatorVersion(address, Number(license.packId), version);
      if (!record) throw new Error("No local creator version metadata found");
      const grant: BuyerAccessGrant = { licenseId, packId: Number(license.packId), version, previewRoot: record.previewRoot, bundleRoot: record.bundleRoot, encryptedVersionKey: record.versionKeyHex, issuedAt: Math.floor(Date.now() / 1000), expiresAt: Number(license.expiresAt) };
      const upload = await uploadBytes(`grant-${licenseId}-v${version}.json`, new TextEncoder().encode(JSON.stringify(grant)));
      await licenseRegistry.publishAccessGrant(licenseId, version, upload.rootHash);
      toast.success("Access grant published");
    } catch (error) { toast.error(error instanceof Error ? error.message : "Grant publish failed"); }
    finally { setGrantPending(false); }
  }

  const inputCls = "bg-white/[0.04] border-white/10 text-white placeholder:text-white/25 focus:border-white/22 focus:bg-white/[0.06] rounded-xl h-9 text-sm";
  const textareaCls = "bg-white/[0.04] border-white/10 text-white placeholder:text-white/25 focus:border-white/22 focus:bg-white/[0.06] rounded-xl text-sm resize-none";

  return (
    <MarketplaceShell>
      <div className="mb-5">
        <span className="inline-flex items-center gap-2 text-xs font-mono text-white/30 mb-1.5">
          <span className="w-5 h-px bg-white/20" />CREATOR STUDIO
        </span>
        <h1 className="font-display text-3xl text-white leading-tight">Publish your skill pack.</h1>
        <p className="text-sm text-white/35 mt-1">Public manifest upload, encrypted bundle, on-chain mint — all from your wallet.</p>
      </div>

      <div className="grid gap-4 xl:grid-cols-[1.1fr_0.9fr]">
        {/* Left: Publish form */}
        <GlassPanel
          title="Publish pack"
          description={isConnected ? "Mint a new pack or publish a new version for an existing one." : "Connect a wallet to publish."}
          icon={<PackageOpen className="w-4 h-4" />}
        >
          <div className="grid gap-3">
            <div className="grid grid-cols-2 gap-3">
              <Input placeholder="Existing pack ID (leave blank for new)" value={form.existingPackId} onChange={field("existingPackId")} className={inputCls} />
              <Select value={form.packKind} onValueChange={(v) => setForm((c) => ({ ...c, packKind: v as PackKind }))}>
                <SelectTrigger className={`${inputCls} w-full`}><SelectValue placeholder="Pack kind" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="skill_only">Skill only</SelectItem>
                  <SelectItem value="knowledge_only">Knowledge only</SelectItem>
                  <SelectItem value="hybrid">Hybrid</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <Input placeholder="Title" value={form.title} onChange={field("title")} className={inputCls} />
              <Input placeholder="Slug (e.g. solidity-patterns)" value={form.slug} onChange={field("slug")} className={inputCls} />
            </div>
            <Input placeholder="Short description" value={form.shortDescription} onChange={field("shortDescription")} className={inputCls} />
            <div className="grid grid-cols-2 gap-3">
              <Input placeholder="Tags: mcp, memory" value={form.tags} onChange={field("tags")} className={inputCls} />
              <Input placeholder="Keywords: retrieval, licensing" value={form.keywords} onChange={field("keywords")} className={inputCls} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <Input placeholder="Bundle file path" value={form.bundlePath} onChange={field("bundlePath")} className={inputCls} />
              <div className="grid grid-cols-2 gap-2">
                <Input placeholder="Price (0G)" value={form.priceIn0G} onChange={field("priceIn0G")} className={inputCls} />
                <Input placeholder="Duration (days)" value={form.licenseDurationDays} onChange={field("licenseDurationDays")} className={inputCls} />
              </div>
            </div>
            <Textarea placeholder="Bundle file content (Markdown, code, etc.)" value={form.bundleContent} onChange={field("bundleContent")} className={`${textareaCls} h-24`} />
            <div className="grid grid-cols-2 gap-3">
              <Input placeholder="Knowledge doc title" value={form.knowledgeDocTitle} onChange={field("knowledgeDocTitle")} className={inputCls} />
              <Input placeholder="Recommended tools" value={form.recommendedTools} onChange={field("recommendedTools")} className={inputCls} />
            </div>
            <Textarea placeholder="System prompt addition" value={form.systemPromptAddition} onChange={field("systemPromptAddition")} className={`${textareaCls} h-16`} />
            <Textarea placeholder="Changelog" value={form.changelog} onChange={field("changelog")} className={`${textareaCls} h-12`} />
            <Button
              disabled={!signer || pending}
              onClick={() => void handlePublish()}
              className="h-10 w-full bg-white text-black hover:bg-white/90 font-medium rounded-xl mt-1"
            >
              <Sparkles className="w-4 h-4 mr-2" />
              {pending ? "Publishing…" : "Publish pack"}
            </Button>
          </div>
        </GlassPanel>

        {/* Right column */}
        <div className="flex flex-col gap-4">
          {/* Known versions */}
          <GlassPanel
            title="Published versions"
            description="Local creator metadata for issuing buyer access grants."
            icon={<PackageOpen className="w-4 h-4" />}
          >
            {knownVersions.length === 0 ? (
              <p className="text-sm text-white/35">No versions cached yet in this browser.</p>
            ) : (
              <div className="grid gap-3 max-h-52 overflow-y-auto pr-1">
                {knownVersions.map((r) => (
                  <div key={`${r.packId}-${r.version}`} className="rounded-xl border border-white/8 bg-white/[0.03] p-3">
                    <div className="flex gap-2 mb-2">
                      <Badge variant="outline" className="text-[10px]">Pack #{r.packId}</Badge>
                      <Badge variant="secondary" className="text-[10px]">v{r.version}</Badge>
                    </div>
                    <p className="text-sm font-medium text-white">{r.title}</p>
                    <p className="text-xs text-white/40 font-mono">{r.slug}</p>
                    <div className="mt-2 grid gap-1 text-xs text-white/35">
                      <div className="flex justify-between"><span>Preview</span><span className="font-mono">{r.previewRoot.slice(0, 10)}…</span></div>
                      <div className="flex justify-between"><span>Bundle</span><span className="font-mono">{r.bundleRoot.slice(0, 10)}…</span></div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </GlassPanel>

          {/* Issue grant */}
          <GlassPanel
            title="Issue buyer access grant"
            description="Publish a grant so a buyer can decrypt and mount your pack."
            icon={<Key className="w-4 h-4" />}
          >
            <div className="grid gap-3">
              <Input placeholder="License ID" value={grantForm.licenseId} onChange={(e) => setGrantForm((c) => ({ ...c, licenseId: e.target.value }))} className={inputCls} />
              <Input placeholder="Version to grant" value={grantForm.version} onChange={(e) => setGrantForm((c) => ({ ...c, version: e.target.value }))} className={inputCls} />
              <Button disabled={!signer || grantPending} variant="outline" onClick={() => void publishGrant()} className="h-9 rounded-xl text-sm border-white/15 text-white/70 hover:text-white hover:border-white/30">
                {grantPending ? "Publishing…" : "Publish access grant"}
              </Button>
            </div>
          </GlassPanel>

          {/* Note */}
          <div className="flex gap-3 px-4 py-3 rounded-xl border border-white/8 bg-white/[0.02]">
            <Info className="w-4 h-4 text-white/25 shrink-0 mt-0.5" />
            <p className="text-xs text-white/35 leading-relaxed">
              Prices shown in the marketplace come from on-chain sale terms. The preview manifest is public — the encrypted bundle stays locked until a buyer access grant is published.
            </p>
          </div>
        </div>
      </div>
    </MarketplaceShell>
  );
}
