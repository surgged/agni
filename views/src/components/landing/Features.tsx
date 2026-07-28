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
    title: 'Kata + Firecracker MicroVM Isolation',
    badge: 'Hardware Virtualization',
    description:
      'Container isolation is not enough for untrusted AI agent code. Agni launches every container inside a lightweight Linux microVM powered by AWS Firecracker and Kata Containers.',
    bullets: [
      'Sub-500ms cold boot times',
      'Hardware-level KVM boundary prevents container breakout',
      'Strict memory & vCPU cgroup allocation',
    ],
    gradient: 'from-orange-500 to-amber-500',
  },
  {
    id: 'k3s',
    icon: Server,
    title: 'k3s Multi-Machine Core',
    badge: 'Cluster Orchestration',
    description:
      'Lightweight Kubernetes core stripped of legacy overhead. Orchestrates microVM Pods across single bare-metal nodes or multi-cloud machine pools seamlessly.',
    bullets: [
      'Zero Kubernetes YAML generated for agents',
      'Automated health checks & self-healing Pods',
      'Scales smoothly from 1 node to multi-region',
    ],
    gradient: 'from-amber-500 to-yellow-500',
  },
  {
    id: 'tls',
    icon: Lock,
    title: 'Zero-Config Let\'s Encrypt TLS',
    badge: 'Automated Security',
    description:
      'Every agent deployment is instantly provisioned with a secure HTTPS subdomain, wildcard certificates, and automated cert-manager renewals.',
    bullets: [
      'Automatic DNS-01 / HTTP-01 challenge resolution',
      '256-bit ECDSA encryption by default',
      'Custom domain mapping ready',
    ],
    gradient: 'from-emerald-500 to-teal-500',
  },
  {
    id: 'magic-link',
    icon: Sparkles,
    title: 'Magic Link & Auth Gates',
    badge: 'Access Control',
    description:
      'Generate instant temporary reviewer links right from your agent prompt. Protect live staging apps with magic link JWT authentication before public release.',
    bullets: [
      'One-click agent link generation',
      'Granular expiration times (1h, 24h, 7d)',
      'Built-in session revocation',
    ],
    gradient: 'from-purple-500 to-indigo-500',
  },
  {
    id: 'mcp-engine',
    icon: Layers,
    title: 'Native MCP Protocol Engine',
    badge: 'Standardized Interface',
    description:
      'Agni implements the official Model Context Protocol (MCP). Agents query available deployment resources, retrieve live tail logs, and trigger builds natively.',
    bullets: [
      'Compatible with Cursor, Claude Code, Windsurf & custom LLMs',
      'Structured JSON-RPC tool definitions',
      'Real-time SSE event stream for logs',
    ],
    gradient: 'from-orange-500 to-red-500',
  },
  {
    id: 'nerdctl',
    icon: Cpu,
    title: 'Rootless containerd & nerdctl Pipeline',
    badge: 'Daemonless Build',
    description:
      'Direct OCI container image builds with rootless containerd and nerdctl. No Docker daemon dependency, lower memory overhead, and enhanced host safety.',
    bullets: [
      'Rootless execution mode',
      'Fast layer caching for sub-second rebuilds',
      'Direct integration with internal OCI registry',
    ],
    gradient: 'from-blue-500 to-cyan-500',
  },
];

export function Features() {
  const [hoveredId, setHoveredId] = useState<string | null>(null);

  return (
    <section id="features" className="py-24 bg-[#060a12] relative overflow-hidden">
      {/* Background ambient lighting */}
      <div className="absolute top-1/4 left-1/3 w-[500px] h-[500px] bg-orange-600/10 rounded-full blur-[140px] pointer-events-none" />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        {/* Header */}
        <div className="text-center max-w-3xl mx-auto mb-16">
          <div className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full bg-orange-500/10 border border-orange-500/20 text-orange-400 text-xs font-mono mb-4">
            <Flame className="w-3.5 h-3.5" />
            <span>Platform Capabilities</span>
          </div>
          <h2 className="text-3xl sm:text-5xl font-extrabold text-white tracking-tight mb-4">
            Everything AI Agents Need to <span className="bg-gradient-to-r from-orange-400 via-amber-300 to-yellow-400 bg-clip-text text-transparent">Ship Code</span>
          </h2>
          <p className="text-zinc-400 text-base sm:text-lg">
            Built from scratch to eliminate deployment friction for autonomous coding assistants and human developers alike.
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
                className={`relative bg-[#090d16] border rounded-2xl p-6 transition-all duration-300 flex flex-col justify-between group ${
                  isHovered
                    ? 'border-orange-500/50 shadow-2xl shadow-orange-950/30 -translate-y-1.5'
                    : 'border-white/10 hover:border-white/20'
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
                      <div className="w-full h-full bg-[#090d16] p-2.5 rounded-[11px]">
                        <IconComponent className="w-5 h-5 text-orange-400" />
                      </div>
                    </div>

                    <span className="text-[10px] font-mono font-semibold px-2.5 py-1 rounded-full bg-white/5 border border-white/10 text-zinc-300">
                      {feat.badge}
                    </span>
                  </div>

                  {/* Title & Description */}
                  <h3 className="text-lg font-bold text-white mb-2 group-hover:text-orange-300 transition-colors flex items-center justify-between">
                    <span>{feat.title}</span>
                    <ArrowUpRight className="w-4 h-4 text-zinc-500 group-hover:text-orange-400 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-all" />
                  </h3>

                  <p className="text-xs sm:text-sm text-zinc-400 leading-relaxed mb-6">
                    {feat.description}
                  </p>
                </div>

                {/* Bullet Points */}
                <div className="pt-4 border-t border-white/5 space-y-2">
                  {feat.bullets.map((bullet, idx) => (
                    <div key={idx} className="flex items-center gap-2 text-xs text-zinc-300">
                      <CheckCircle className="w-3.5 h-3.5 text-orange-400 shrink-0" />
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
