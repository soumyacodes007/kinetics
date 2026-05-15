"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ConnectWalletButton } from "@/components/connect-wallet-button";
import { Layers, Plus, ShoppingBag, BookOpen } from "lucide-react";

type TabId = "marketplace" | "create" | "purchased" | "my-packs";

const TABS: { id: TabId; label: string; icon: React.ReactNode; href: string }[] = [
  { id: "marketplace", label: "Marketplace",    icon: <Layers   className="w-3.5 h-3.5" />, href: "/marketplace"  },
  { id: "create",      label: "Create Skills",  icon: <Plus     className="w-3.5 h-3.5" />, href: "/creator"      },
  { id: "purchased",   label: "Purchased",      icon: <ShoppingBag className="w-3.5 h-3.5" />, href: "/owned-packs" },
  { id: "my-packs",    label: "My Packs",       icon: <BookOpen className="w-3.5 h-3.5" />, href: "/my-packs"     },
];

export function MarketplaceShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

  return (
    <div className="relative min-h-screen bg-black overflow-hidden">
      {/* ── Blurred hero video background ── */}
      <div className="fixed inset-0 z-0 pointer-events-none">
        <video
          autoPlay muted loop playsInline aria-hidden="true"
          className="w-full h-full object-cover object-center opacity-25"
        >
          <source src="https://hebbkx1anhila5yf.public.blob.vercel-storage.com/bg-hero-0BnFGdr81Ifnj3WbBZoNt1KE4D5DMT.mp4" type="video/mp4" />
        </video>
        <div className="absolute inset-0 backdrop-blur-3xl" />
        <div className="absolute inset-0 bg-black/65" />
        {/* Subtle grid */}
        <div className="absolute inset-0 opacity-[0.05] pointer-events-none">
          {[...Array(10)].map((_, i) => (
            <div key={`h-${i}`} className="absolute h-px bg-white/20" style={{ top: `${10 * (i + 1)}%`, left: 0, right: 0 }} />
          ))}
          {[...Array(14)].map((_, i) => (
            <div key={`v-${i}`} className="absolute w-px bg-white/20" style={{ left: `${7.14 * (i + 1)}%`, top: 0, bottom: 0 }} />
          ))}
        </div>
      </div>

      {/* ── Sticky nav bar ── */}
      <header className="relative z-20 sticky top-0">
        <div className="backdrop-blur-2xl bg-black/45 border-b border-white/8">
          <div className="max-w-[1400px] mx-auto px-6 lg:px-10 h-14 flex items-center gap-4">
            {/* Logo */}
            <Link href="/" className="flex items-center gap-2 shrink-0">
              <span className="font-display text-lg text-white tracking-tight">Kinetics</span>
              <span className="font-mono text-[9px] text-white/40 mt-0.5">AGENT OS</span>
            </Link>

            {/* Pass pill */}
            <div className="flex items-center gap-2 px-3 py-1 rounded-full bg-white/[0.05] border border-white/10 shrink-0">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
              <span className="text-[10px] font-mono text-white/50">PASS ACTIVE</span>
              <span className="text-[10px] font-mono text-white/30">· 28d</span>
            </div>

            {/* Tabs */}
            <nav className="flex items-center gap-1 flex-1 overflow-x-auto scrollbar-none">
              {TABS.map((tab) => {
                const active = pathname === tab.href || pathname.startsWith(`${tab.href}/`);
                return (
                  <Link
                    key={tab.id}
                    href={tab.href}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all duration-200 whitespace-nowrap ${
                      active
                        ? "bg-white/10 text-white border border-white/15"
                        : "text-white/40 hover:text-white/70 hover:bg-white/[0.04]"
                    }`}
                  >
                    {tab.icon}
                    {tab.label}
                  </Link>
                );
              })}
            </nav>

            <div className="ml-auto shrink-0">
              <ConnectWalletButton />
            </div>
          </div>
        </div>
      </header>

      {/* ── Page content (fills viewport height minus nav) ── */}
      <main className="relative z-10 h-[calc(100vh-3.5rem)] overflow-y-auto scrollbar-none">
        <div className="max-w-[1400px] mx-auto px-6 lg:px-10 py-6">
          {children}
        </div>
      </main>
    </div>
  );
}
