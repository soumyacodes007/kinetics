import Link from "next/link";
import { ConnectWalletButton } from "@/components/connect-wallet-button";
import { cn } from "@/lib/utils";

const navLinks = [
  { href: "/buy-pass", label: "Pass" },
  { href: "/memory", label: "Memory" },
  { href: "/marketplace", label: "Marketplace" },
  { href: "/creator", label: "Creator" },
  { href: "/owned-packs", label: "Owned Packs" }
];

export function ProductShell(props: {
  title: string;
  description: string;
  eyebrow?: string;
  children: React.ReactNode;
}) {
  return (
    <main className="min-h-screen bg-[radial-gradient(circle_at_top,rgba(236,168,214,0.18),transparent_26%),radial-gradient(circle_at_right,rgba(103,232,249,0.12),transparent_24%),linear-gradient(180deg,#09090b_0%,#0f1117_100%)] text-foreground">
      <div className="mx-auto max-w-[1400px] px-6 py-6 lg:px-10">
        <header className="mb-8 rounded-[28px] border border-white/10 bg-black/35 px-5 py-4 backdrop-blur-xl">
          <div className="flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
            <div className="flex items-center gap-4">
              <Link href="/" className="flex items-center gap-2">
                <span className="font-display text-2xl tracking-tight text-white">Kinetics</span>
                <span className="font-mono text-[10px] uppercase tracking-[0.35em] text-white/50">Agent OS</span>
              </Link>
              <div className="hidden h-6 w-px bg-white/10 lg:block" />
              <nav className="hidden items-center gap-2 lg:flex">
                {navLinks.map((link) => (
                  <Link
                    key={link.href}
                    href={link.href}
                    className={cn(
                      "rounded-full px-3 py-2 text-sm text-white/65 transition hover:bg-white/6 hover:text-white"
                    )}
                  >
                    {link.label}
                  </Link>
                ))}
              </nav>
            </div>

            <div className="flex items-center gap-3">
              <Link href="/" className="text-sm text-white/55 transition hover:text-white">
                Landing
              </Link>
              <ConnectWalletButton />
            </div>
          </div>
        </header>

        <section className="mb-10 grid gap-8 rounded-[36px] border border-white/10 bg-white/[0.03] px-6 py-8 shadow-2xl shadow-black/20 backdrop-blur lg:grid-cols-[1.1fr_0.9fr] lg:px-8">
          <div>
            {props.eyebrow ? (
              <p className="mb-4 font-mono text-xs uppercase tracking-[0.35em] text-white/45">{props.eyebrow}</p>
            ) : null}
            <h1 className="max-w-3xl font-display text-5xl tracking-tight text-white md:text-6xl">{props.title}</h1>
          </div>
          <p className="max-w-2xl self-end text-lg leading-relaxed text-white/68">{props.description}</p>
        </section>

        <section>{props.children}</section>
      </div>
    </main>
  );
}
