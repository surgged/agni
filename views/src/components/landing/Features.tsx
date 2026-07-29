import { useState } from 'react';
import {
  ShieldCheck,
  Server,
  Lock,
  Sparkles,
  Layers,
  Cpu,
  ArrowUpRight,
  Flame,
  CheckCircle,
} from 'lucide-react';

interface FeatureItem {
  id: string;
  icon: any;
  title: string;
  badge: string;
  description: string;
  bullets: string[];
  gradient: string;
}

const FEATURES: FeatureItem[] = [
  {
    id: 'firecracker',
    icon: ShieldCheck,
    title: 'Private Micro-Sandboxes',
    badge: 'Super Safe Isolation',
    description:
      'Your app runs inside a dedicated, ultra-private micro-computer sandbox. This guarantees your code stays 100% secure and isolated from everyone else.',
    bullets: [
      'Sub-second 420ms cold boot times',
      'Hardware-level security protection',
      'Dedicated CPU & memory allocation',
    ],
    gradient: 'from-orange-500 to-amber-500',
  },
  {
    id: 'k3s',
    icon: Server,
    title: 'Zero Server Headaches',
    badge: 'Automated Hosting',
    description:
      'Forget configuring cloud servers, Docker containers, or web hosting settings. Agni handles the entire infrastructure automatically behind the scenes.',
    bullets: [
      'Zero server configuration needed',
      'Automatic app health monitoring & self-healing',
      'Keeps your web apps online 24/7',
    ],
    gradient: 'from-amber-500 to-yellow-500',
  },
  {
    id: 'tls',
    icon: Lock,
    title: 'Instant Secure HTTPS Links',
    badge: 'Automatic Security Lock',
    description:
      'Every app you deploy receives a free, secure web address with an automatic HTTPS security lock icon, protecting your visitors and data.',
    bullets: [
      'Free SSL security certificate included',
      '256-bit encryption out of the box',
      'Shareable custom subdomains',
    ],
    gradient: 'from-emerald-500 to-teal-500',
  },
  {
    id: 'magic-link',
    icon: Sparkles,
    title: '1-Click Magic Share Links',
    badge: 'Instant Sharing',
    description:
      'Want a friend or client to review your app? Generate a private magic link right from your AI prompt with optional expiration timers.',
    bullets: [
      '1-click link creation from AI chat',
      'Custom expiration timers (1 hour, 24 hours, 7 days)',
      'Revoke access anytime from your dashboard',
    ],
    gradient: 'from-purple-500 to-indigo-500',
  },
  {
    id: 'mcp-engine',
    icon: Layers,
    title: 'Native AI Assistant Connection',
    badge: 'MCP Standard',
    description:
      'Agni speaks the standard Model Context Protocol (MCP). Your AI coding helpers can deploy, inspect, and update apps directly from your code editor.',
    bullets: [
      'Works with Cursor, Claude Code, Windsurf & custom AI',
      'AI assistant receives live build & error logs',
      'Deploy without ever leaving your code editor',
    ],
    gradient: 'from-orange-500 to-red-500',
  },
  {
    id: 'nerdctl',
    icon: Cpu,
    title: 'Lightning Fast Packaging',
    badge: 'Sub-Second Builds',
    description:
      'Agni packages your code files using ultra-fast caching so updates launch almost instantaneously when you or your AI assistant make changes.',
    bullets: [
      'Super-fast file bundling',
      'Smart caching for instant updates',
      'Zero heavy local downloads or background daemons',
    ],
    gradient: 'from-blue-500 to-cyan-500',
  },
];

export function Features() {
  const [hoveredId, setHoveredId] = useState<string | null>(null);

  return (
    <section id="features" className="py-24 bg-background text-foreground relative overflow-hidden">
      {/* Background ambient lighting */}
      <div className="absolute top-1/4 left-1/3 w-[500px] h-[500px] bg-orange-500/10 rounded-full blur-[140px] pointer-events-none" />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        {/* Header */}
        <div className="text-center max-w-3xl mx-auto mb-16">
          <div className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full bg-orange-500/10 border border-orange-500/20 text-orange-500 text-xs font-mono mb-4">
            <Flame className="w-3.5 h-3.5" />
            <span>Why Choose Agni</span>
          </div>
          <h2 className="text-3xl sm:text-5xl font-extrabold text-foreground tracking-tight mb-4">
            Everything You Need to <span className="bg-gradient-to-r from-orange-500 via-amber-500 to-yellow-500 bg-clip-text text-transparent">Share Your Apps</span>
          </h2>
          <p className="text-muted-foreground text-base sm:text-lg">
            Designed to eliminate all technical hosting friction so you can focus on building amazing things with AI.
          </p>
        </div>

        {/* Feature Cards Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {FEATURES.map((feat) => {
            const IconComponent = feat.icon;
            const isHovered = hoveredId === feat.id;

            return (
              <div
                key={feat.id}
                onMouseEnter={() => setHoveredId(feat.id)}
                onMouseLeave={() => setHoveredId(null)}
                className={`relative bg-card border rounded-2xl p-6 transition-all duration-300 flex flex-col justify-between group ${
                  isHovered
                    ? 'border-orange-500/50 shadow-xl -translate-y-1.5'
                    : 'border-border'
                }`}
              >
                {/* Glow border overlay on hover */}
                <div
                  className={`absolute inset-0 rounded-2xl bg-gradient-to-br ${feat.gradient} opacity-0 group-hover:opacity-5 transition-opacity duration-300 pointer-events-none`}
                />

                <div>
                  {/* Top Bar: Icon + Badge */}
                  <div className="flex items-center justify-between mb-5">
                    <div
                      className={`p-3 rounded-xl bg-gradient-to-br ${feat.gradient} p-[1px] shadow-lg`}
                    >
                      <div className="w-full h-full bg-card p-2.5 rounded-[11px]">
                        <IconComponent className="w-5 h-5 text-orange-500" />
                      </div>
                    </div>

                    <span className="text-[10px] font-mono font-semibold px-2.5 py-1 rounded-full bg-muted text-muted-foreground border border-border">
                      {feat.badge}
                    </span>
                  </div>

                  {/* Title & Description */}
                  <h3 className="text-lg font-bold text-foreground mb-2 group-hover:text-orange-500 transition-colors flex items-center justify-between">
                    <span>{feat.title}</span>
                    <ArrowUpRight className="w-4 h-4 text-muted-foreground group-hover:text-orange-500 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-all" />
                  </h3>

                  <p className="text-xs sm:text-sm text-muted-foreground leading-relaxed mb-6">
                    {feat.description}
                  </p>
                </div>

                {/* Bullet Points */}
                <div className="pt-4 border-t border-border space-y-2">
                  {feat.bullets.map((bullet, idx) => (
                    <div key={idx} className="flex items-center gap-2 text-xs text-foreground">
                      <CheckCircle className="w-3.5 h-3.5 text-orange-500 shrink-0" />
                      <span>{bullet}</span>
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
