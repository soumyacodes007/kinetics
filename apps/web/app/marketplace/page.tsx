"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { MarketplaceShell } from "@/components/marketplace-shell";
import { Input } from "@/components/ui/input";
import { getKnowledgePackClient } from "@/lib/chain";
import { DEMO_MARKETPLACE_ITEMS } from "@/lib/demo-marketplace";
import { formatTokenAmount, parseList } from "@/lib/format";
import { readJson } from "@/lib/storage-bridge";
import type { PackPreviewManifest } from "@kinetics/core/browser";
import { Search, SlidersHorizontal, Zap, Clock, Shield, ChevronRight, Star, Plus, ExternalLink } from "lucide-react";

interface CatalogItem {
  packId: number;
  creator: string;
  currentVersion: number;
  priceWei: bigint;
  licenseDurationSeconds: bigint;
  manifest: PackPreviewManifest;
  demo?: boolean;
}

const KIND_OPTIONS = [
  { value: "all", label: "All Types" },
  { value: "skill_only", label: "Skill Only" },
  { value: "knowledge_only", label: "Knowledge" },
  { value: "hybrid", label: "Hybrid" },
];

const KIND_ACCENT: Record<string, string> = {
  skill_only: "via-violet-500/60",
  knowledge_only: "via-cyan-500/60",
  hybrid: "via-amber-500/60",
};

const KIND_BADGE: Record<string, string> = {
  skill_only: "bg-violet-500/10 border-violet-500/30 text-violet-300",
  knowledge_only: "bg-cyan-500/10 border-cyan-500/30 text-cyan-300",
  hybrid: "bg-amber-500/10 border-amber-500/30 text-amber-300",
};

function SkeletonCard() {
  return (
    <div className="rounded-2xl border border-white/8 bg-white/[0.03] backdrop-blur-sm p-5 animate-pulse">
      <div className="flex gap-2 mb-4"><div className="h-5 w-16 rounded-full bg-white/10" /><div className="h-5 w-20 rounded-full bg-white/10" /></div>
      <div className="h-7 w-3/4 rounded bg-white/10 mb-2" />
      <div className="h-4 w-full rounded bg-white/[0.07] mb-1" /><div className="h-4 w-2/3 rounded bg-white/[0.07] mb-5" />
      <div className="border-t border-white/8 pt-4 flex justify-between"><div className="h-5 w-20 rounded bg-white/10" /><div className="h-8 w-24 rounded-lg bg-white/10" /></div>
    </div>
  );
}

function SkillCard({ item }: { item: CatalogItem }) {
  const kind = item.manifest.packKind ?? "skill_only";
  const days = Math.max(1, Number(item.licenseDurationSeconds / BigInt(86400)));
  return (
    <Link href={`/marketplace/${item.packId}`} className="group block">
      <div className="relative h-full rounded-2xl border border-white/10 bg-white/[0.03] backdrop-blur-sm overflow-hidden transition-all duration-500 hover:-translate-y-1 hover:border-white/20 hover:bg-white/[0.06] hover:shadow-2xl hover:shadow-black/40">
        <div className={`absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent ${KIND_ACCENT[kind] ?? "via-white/30"} to-transparent`} />
        <div className="p-5 flex flex-col h-full">
          <div className="flex items-start justify-between gap-3 mb-3">
            <div className="flex flex-wrap gap-1.5">
              <span className="px-2 py-0.5 rounded-full bg-white/[0.06] border border-white/10 text-[10px] font-mono text-white/40">#{item.packId}</span>
              <span className={`flex items-center gap-1 px-2 py-0.5 rounded-full border text-[10px] font-mono ${KIND_BADGE[kind] ?? ""}`}>
                <Zap className="w-2.5 h-2.5" />{kind.replace("_", " ")}
              </span>
              {item.demo ? (
                <span className="px-2 py-0.5 rounded-full border border-amber-400/30 bg-amber-400/10 text-[10px] font-mono text-amber-200">
                  demo
                </span>
              ) : null}
            </div>
            <span className="text-[10px] font-mono text-white/30 shrink-0">v{item.currentVersion}</span>
          </div>
          <h3 className="font-display text-xl text-white leading-tight mb-1.5">{item.manifest.title}</h3>
          <p className="text-sm text-white/50 leading-relaxed mb-4 line-clamp-2 flex-1">{item.manifest.shortDescription}</p>
          <div className="flex flex-wrap gap-1.5 mb-4">
            {item.manifest.tags.slice(0, 4).map((tag) => (
              <span key={tag} className="px-2 py-0.5 rounded-full bg-white/[0.05] border border-white/8 text-[10px] text-white/40 font-mono">{tag}</span>
            ))}
          </div>
          <div className="flex items-center gap-4 mb-4 text-xs text-white/40">
            <span className="flex items-center gap-1"><Clock className="w-3 h-3" />{days}d</span>
            <span className="flex items-center gap-1"><Shield className="w-3 h-3" />encrypted</span>
            <span className="ml-auto font-mono text-white/25">{item.creator.slice(0, 6)}…{item.creator.slice(-4)}</span>
          </div>
          <div className="border-t border-white/8 pt-4 flex items-center justify-between">
            <div>
              <p className="text-[10px] text-white/30 mb-0.5">License price</p>
              <p className="text-lg font-display text-white">{formatTokenAmount(item.priceWei)}</p>
            </div>
            <div className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-white text-black text-xs font-medium transition-all duration-300 hover:bg-white/90 group-hover:shadow-lg group-hover:shadow-white/10">
              {item.demo ? "Preview" : "Buy"} <ChevronRight className="w-3.5 h-3.5" />
            </div>
          </div>
        </div>
      </div>
    </Link>
  );
}

export default function MarketplacePage() {
  const [items, setItems] = useState<CatalogItem[]>([]);
  const [keyword, setKeyword] = useState("");
  const [tagsFilter, setTagsFilter] = useState("");
  const [kindFilter, setKindFilter] = useState("all");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      setLoading(true);
      try {
        const knowledgePack = getKnowledgePackClient();
        const totalSupply = Number(await knowledgePack.getTotalSupply());
        const nextItems: CatalogItem[] = [];
        for (let packId = 1; packId <= totalSupply; packId++) {
          try {
            const pack = await knowledgePack.getPack(packId);
            if (!pack.active || !pack.currentPreviewRoot || pack.currentVersion === BigInt(0) || pack.currentPreviewRoot === "0x0000000000000000000000000000000000000000000000000000000000000000") continue;
            const manifest = await readJson<PackPreviewManifest>(pack.currentPreviewRoot);
            nextItems.push({ packId, creator: pack.creator, currentVersion: Number(pack.currentVersion), priceWei: pack.priceWei, licenseDurationSeconds: pack.licenseDurationSeconds, manifest });
          } catch (e) {
            console.error(`Failed to load pack ${packId}`, e);
          }
        }
        nextItems.push(...DEMO_MARKETPLACE_ITEMS);

        setItems(nextItems);
      } finally { setLoading(false); }
    }
    void load();
  }, []);

  const filtered = useMemo(() => {
    const kw = keyword.trim().toLowerCase();
    const tags = parseList(tagsFilter.toLowerCase());
    return items.filter((item) => {
      const hay = [item.manifest.title, item.manifest.shortDescription, item.manifest.slug, item.manifest.keywords.join(" ")].join(" ").toLowerCase();
      return (kw ? hay.includes(kw) : true) && (kindFilter === "all" ? true : item.manifest.packKind === kindFilter) && (tags.length === 0 ? true : tags.every((t) => item.manifest.tags.map((v) => v.toLowerCase()).includes(t)));
    });
  }, [items, keyword, tagsFilter, kindFilter]);

  return (
    <MarketplaceShell>
      {/* Page header */}
      <div className="mb-6">
        <span className="inline-flex items-center gap-2 text-xs font-mono text-white/30 mb-2">
          <span className="w-5 h-px bg-white/20" />MARKETPLACE
        </span>
        <h1 className="font-display text-3xl lg:text-4xl text-white leading-tight mb-1">
          Public previews in front,{" "}
          <span className="text-white/40">encrypted bundles behind.</span>
        </h1>
        <p className="text-sm text-white/35 max-w-xl">Browse packs, inspect price and duration on-chain, then purchase a license to unlock the full bundle in your agent.</p>
      </div>

      {/* Search + filter */}
      <div className="mb-5 rounded-2xl border border-white/10 bg-white/[0.03] backdrop-blur-sm p-4">
        <div className="flex flex-col md:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/25 pointer-events-none" />
            <Input value={keyword} onChange={(e) => setKeyword(e.target.value)} placeholder="Search by title, slug, or keyword…" className="pl-9 bg-white/[0.04] border-white/10 text-white placeholder:text-white/25 focus:border-white/20 rounded-xl h-10" />
          </div>
          <div className="relative md:w-48">
            <SlidersHorizontal className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/25 pointer-events-none" />
            <Input value={tagsFilter} onChange={(e) => setTagsFilter(e.target.value)} placeholder="Filter tags: mcp…" className="pl-9 bg-white/[0.04] border-white/10 text-white placeholder:text-white/25 focus:border-white/20 rounded-xl h-10" />
          </div>
          <div className="flex items-center gap-1.5">
            {KIND_OPTIONS.map((opt) => (
              <button key={opt.value} onClick={() => setKindFilter(opt.value)}
                className={`px-3 py-1.5 rounded-xl text-xs font-medium transition-all duration-200 whitespace-nowrap ${kindFilter === opt.value ? "bg-white text-black" : "bg-white/[0.05] border border-white/10 text-white/45 hover:text-white/75 hover:bg-white/[0.08]"}`}>
                {opt.label}
              </button>
            ))}
          </div>
        </div>
        <div className="mt-3 flex items-center justify-between">
          <p className="text-xs text-white/25 font-mono">{loading ? "Loading…" : `${filtered.length} pack${filtered.length !== 1 ? "s" : ""}`}</p>
          <Link href="/creator" className="flex items-center gap-1.5 text-xs text-white/35 hover:text-white/60 transition-colors">
            <Plus className="w-3.5 h-3.5" />Publish a pack<ExternalLink className="w-3 h-3" />
          </Link>
        </div>
      </div>

      {/* Grid */}
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {loading ? (<><SkeletonCard /><SkeletonCard /><SkeletonCard /></>) :
         filtered.length === 0 ? (
          <div className="col-span-3 flex flex-col items-center justify-center py-20 text-center">
            <div className="w-14 h-14 rounded-2xl bg-white/[0.04] border border-white/10 flex items-center justify-center mb-4">
              <Star className="w-6 h-6 text-white/15" />
            </div>
            <p className="text-white/35 text-sm">No packs matched the current filters.</p>
          </div>
        ) : filtered.map((item) => <SkillCard key={item.packId} item={item} />)}
      </div>
    </MarketplaceShell>
  );
}
