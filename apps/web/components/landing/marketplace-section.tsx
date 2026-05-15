"use client";

import { useEffect, useRef, useState } from "react";
import { ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";

const packExamples = [
  {
    icon: "📊",
    title: "Data Analysis Pack",
    creator: "DataPro Labs",
    price: "0.5 ETH/month",
    description: "Advanced analytics workflows with visualization templates",
    features: ["SQL optimization", "Chart generation", "Trend analysis"],
    purchasers: 234,
  },
  {
    icon: "🔧",
    title: "API Integration Kit",
    creator: "DevTools Inc",
    price: "0.3 ETH/month",
    description: "Ready-to-use integrations for 50+ APIs",
    features: ["Authentication", "Error handling", "Rate limiting"],
    purchasers: 512,
  },
  {
    icon: "🎨",
    title: "Content Creation Suite",
    creator: "Creative Minds",
    price: "0.4 ETH/month",
    description: "Workflows for writers, designers, and marketers",
    features: ["SEO optimization", "Copywriting", "Image generation"],
    purchasers: 389,
  },
];

export function MarketplaceSection() {
  const [isVisible, setIsVisible] = useState(false);
  const [hoveredCard, setHoveredCard] = useState<number | null>(null);
  const sectionRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) setIsVisible(true);
      },
      { threshold: 0.1 }
    );

    if (sectionRef.current) observer.observe(sectionRef.current);
    return () => observer.disconnect();
  }, []);

  return (
    <section
      id="marketplace"
      ref={sectionRef}
      className="relative py-24 lg:py-32 overflow-hidden"
    >
      <div className="max-w-[1400px] mx-auto px-6 lg:px-12">
        {/* Header */}
        <div className="mb-20">
          <div className="grid lg:grid-cols-12 gap-8 items-end mb-12">
            <div className="lg:col-span-7">
              <span className="inline-flex items-center gap-3 text-sm font-mono text-muted-foreground mb-6">
                <span className="w-12 h-px bg-foreground/30" />
                Skill Pack Marketplace
              </span>
              <h2
                className={`text-6xl md:text-7xl lg:text-[128px] font-display tracking-tight leading-[0.9] transition-all duration-1000 ${
                  isVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-8"
                }`}
              >
                Creator
                <br />
                <span className="text-muted-foreground">monetization.</span>
              </h2>
            </div>
            <div className="lg:col-span-5">
              <p className={`text-xl text-muted-foreground leading-relaxed transition-all duration-1000 delay-200 ${
                isVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4"
              }`}>
                Build expertise into skill packs. Mint as iNFTs. Sell time-based licenses. Keep earning as agents use your work.
              </p>
            </div>
          </div>
        </div>

        {/* Pack Grid */}
        <div className="grid lg:grid-cols-3 gap-6">
          {packExamples.map((pack, index) => (
            <div
              key={pack.title}
              onMouseEnter={() => setHoveredCard(index)}
              onMouseLeave={() => setHoveredCard(null)}
              className={`relative group bg-black border border-foreground/10 p-8 lg:p-10 transition-all duration-500 ${
                isVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-8"
              } hover:border-foreground/40 cursor-pointer`}
              style={{ transitionDelay: `${index * 100}ms` }}
            >
              {/* Icon */}
              <div className="text-5xl mb-6 group-hover:scale-110 transition-transform duration-300">
                {pack.icon}
              </div>

              {/* Title & Creator */}
              <h3 className="text-2xl font-display mb-2">{pack.title}</h3>
              <p className="text-sm text-muted-foreground mb-4 font-mono">{pack.creator}</p>

              {/* Description */}
              <p className="text-muted-foreground mb-6 leading-relaxed">
                {pack.description}
              </p>

              {/* Features */}
              <ul className="space-y-2 mb-8 pb-8 border-b border-foreground/10">
                {pack.features.map((feature) => (
                  <li key={feature} className="text-sm text-muted-foreground flex items-center gap-2">
                    <span className="w-1 h-1 rounded-full bg-foreground/60" />
                    {feature}
                  </li>
                ))}
              </ul>

              {/* Price & Stats */}
              <div className="flex items-center justify-between mb-6">
                <div>
                  <p className="text-sm text-muted-foreground">License</p>
                  <p className="text-lg font-display">{pack.price}</p>
                </div>
                <div className="text-right">
                  <p className="text-sm text-muted-foreground">Active licenses</p>
                  <p className="text-lg font-display">{pack.purchasers}</p>
                </div>
              </div>

              {/* CTA */}
              <button className="w-full py-3 border border-foreground/20 text-foreground hover:border-foreground hover:bg-foreground/5 transition-all flex items-center justify-center gap-2 group/btn">
                Purchase License
                <ArrowRight className="w-4 h-4 group-hover/btn:translate-x-1 transition-transform" />
              </button>
            </div>
          ))}
        </div>

        {/* CTA for creators */}
        <div className={`mt-20 pt-12 border-t border-foreground/10 transition-all duration-1000 delay-500 ${
          isVisible ? "opacity-100" : "opacity-0"
        }`}>
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-8">
            <div>
              <h3 className="text-3xl lg:text-4xl font-display mb-3">
                Become a pack creator
              </h3>
              <p className="text-muted-foreground text-lg max-w-lg">
                Turn your expertise into iNFT-backed assets. Set your own pricing. Earn passively as other builders use your work.
              </p>
            </div>
            <Button
              size="lg"
              className="bg-foreground hover:bg-foreground/90 text-background px-8 h-14 text-base rounded-full group shrink-0"
            >
              Create a pack
              <ArrowRight className="w-4 h-4 ml-2 transition-transform group-hover:translate-x-1" />
            </Button>
          </div>
        </div>
      </div>
    </section>
  );
}
