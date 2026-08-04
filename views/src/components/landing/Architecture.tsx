import { useState } from 'react';
import {
  Bot,
  Layers,
  Cpu,
  Shield,
  Globe,
  ArrowRight,
  Info,
  CheckCircle2,
  Server,
  Zap,
} from 'lucide-react';

interface ArchNode {
  id: string;
  title: string;
  subtitle: string;
  icon: any;
  badge: string;
  description: string;
  specs: { label: string; value: string }[];
}

const ARCH_NODES: ArchNode[] = [
  {
    id: 'agent',
    title: '1. You Ask Your AI',
    subtitle: 'Cursor / Claude / Windsurf',
    icon: Bot,
    badge: 'Step 1',
    description:
      'You finish creating your app in your code editor and tell your AI assistant: "Deploy my app". The AI handles the rest automatically.',
    specs: [
      { label: 'Action', value: 'One simple sentence in AI chat' },
      { label: 'Speed', value: 'Instant trigger in <10 milliseconds' },
      { label: 'Setup Needed', value: 'Zero configuration' },
    ],
  },
  {
    id: 'mcp-server',
    title: '2. Agni Packs Your App',
    subtitle: 'Smart Packaging Engine',
    icon: Layers,
    badge: 'Step 2',
    description:
      'Agni instantly gathers your application files, checks that everything is ready, and prepares a clean bundle for the web.',
    specs: [
      { label: 'File Packing', value: 'Automatic bundle creation' },
      { label: 'Safety Check', value: 'Verifies files before launch' },
      { label: 'Storage', value: 'Secure internal container vault' },
    ],
  },
  {
    id: 'k3s-control',
    title: '3. Smart Cloud Manager',
    subtitle: 'High-Speed Orchestrator',
    icon: Server,
    badge: 'Step 3',
    description:
      'Agni\'s cloud manager finds the best computer server to host your app and assigns it dedicated CPU and memory resources.',
    specs: [
      { label: 'Memory Footprint', value: 'Ultra-lightweight memory usage' },
      { label: 'Auto-Healing', value: 'Keeps your app online 24/7' },
      { label: 'Scaling', value: 'Grows automatically as visitors arrive' },
    ],
  },
  {
    id: 'kata-firecracker',
    title: '4. Private Micro-Sandbox',
    subtitle: 'Unbreakable MicroVM',
    icon: Cpu,
    badge: 'Step 4',
    description:
      'Your app runs inside its own tiny private micro-computer. This gives it 100% hardware-grade privacy and protection.',
    specs: [
      { label: 'Boot Time', value: 'Starts in 420 milliseconds' },
      { label: 'Security', value: 'Private micro-computer isolation' },
      { label: 'Performance', value: 'Fast dedicated CPU & Memory' },
    ],
  },
  {
    id: 'cert-ingress',
    title: '5. Instant Web Link',
    subtitle: 'HTTPS + Magic Share',
    icon: Globe,
    badge: 'Step 5',
    description:
      'You get an official web address with a security lock icon (HTTPS). Share it with friends or generate a 1-click private magic link!',
    specs: [
      { label: 'Security Lock', value: 'Automatic SSL certificate' },
      { label: 'Web Address', value: 'https://your-app.example.com' },
      { label: 'Sharing', value: '1-click private magic links' },
    ],
  },
];

export function Architecture() {
  const [selectedNodeId, setSelectedNodeId] = useState<string>('kata-firecracker');

  const selectedNode = ARCH_NODES.find((n) => n.id === selectedNodeId) || ARCH_NODES[3];

  return (
    <section id="how-it-works" className="py-24 bg-background text-foreground relative overflow-hidden">
      {/* Radial glow background */}
      <div className="absolute top-1/3 right-1/4 w-[600px] h-[600px] bg-amber-500/10 rounded-full blur-[150px] pointer-events-none" />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        {/* Header */}
        <div className="text-center max-w-3xl mx-auto mb-16">
          <div className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full bg-orange-500/10 border border-orange-500/20 text-orange-500 text-xs font-mono mb-4">
            <Shield className="w-3.5 h-3.5" />
            <span>Simple 5-Step Process</span>
          </div>
          <h2 className="text-3xl sm:text-5xl font-extrabold text-foreground tracking-tight mb-4">
            How The <span className="bg-gradient-to-r from-orange-500 to-amber-500 bg-clip-text text-transparent">Magic Happens</span>
          </h2>
          <p className="text-muted-foreground text-base sm:text-lg">
            From code written by your AI assistant to a live, secure website in seconds. Click any step below to see what happens.
          </p>
        </div>

        {/* Pipeline Diagram Grid */}
        <div className="mb-12">
          <div className="grid grid-cols-1 md:grid-cols-5 gap-3 relative">
            {ARCH_NODES.map((node, index) => {
              const isSelected = node.id === selectedNodeId;
              const IconComponent = node.icon;

              return (
                <div key={node.id} className="relative flex flex-col">
                  <button
                    onClick={() => setSelectedNodeId(node.id)}
                    className={`h-full p-4 rounded-xl border text-left transition-all duration-300 flex flex-col justify-between group ${
                      isSelected
                        ? 'bg-card border-orange-500/60 shadow-lg ring-1 ring-orange-500/50 scale-[1.02]'
                        : 'bg-card/70 hover:bg-card border-border'
                    }`}
                  >
                    <div>
                      <div className="flex items-center justify-between mb-3">
                        <div
                          className={`p-2.5 rounded-lg transition-colors ${
                            isSelected
                              ? 'bg-orange-500 text-white'
                              : 'bg-muted text-orange-500 group-hover:bg-accent'
                          }`}
                        >
                          <IconComponent className="w-5 h-5" />
                        </div>
                        <span className="text-[10px] font-mono font-semibold px-2 py-0.5 rounded bg-muted text-muted-foreground border border-border">
                          {node.badge}
                        </span>
                      </div>

                      <h3 className="text-sm font-bold text-foreground mb-1 group-hover:text-orange-500 transition-colors">
                        {node.title}
                      </h3>
                      <p className="text-xs text-muted-foreground font-mono mb-2">{node.subtitle}</p>
                    </div>

                    <div className="mt-3 pt-3 border-t border-border flex items-center justify-between text-[11px]">
                      <span className="text-muted-foreground group-hover:text-foreground">Learn Details</span>
                      <ArrowRight
                        className={`w-3.5 h-3.5 transition-transform ${
                          isSelected ? 'text-orange-500 translate-x-1' : 'text-muted-foreground'
                        }`}
                      />
                    </div>
                  </button>

                  {/* Connecting Arrow for Desktop */}
                  {index < ARCH_NODES.length - 1 && (
                    <div className="hidden md:block absolute -right-2 top-1/2 -translate-y-1/2 z-20 pointer-events-none">
                      <div className="w-4 h-4 rounded-full bg-background border border-orange-500/40 flex items-center justify-center">
                        <ArrowRight className="w-2.5 h-2.5 text-orange-500" />
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* Node Specification Details Box */}
        <div className="bg-card border border-orange-500/30 rounded-2xl p-6 lg:p-8 shadow-xl backdrop-blur-xl relative overflow-hidden">
          <div className="absolute top-0 right-0 p-8 opacity-10 pointer-events-none">
            <selectedNode.icon className="w-48 h-48 text-orange-500" />
          </div>

          <div className="relative z-10 grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
            {/* Left: Text Explanation (7 cols) */}
            <div className="lg:col-span-7 space-y-4">
              <div className="flex items-center gap-3">
                <div className="p-3 rounded-xl bg-orange-500/10 border border-orange-500/30 text-orange-500">
                  <selectedNode.icon className="w-6 h-6" />
                </div>
                <div>
                  <span className="text-xs font-mono text-orange-500 uppercase tracking-widest">
                    Step Explanation
                  </span>
                  <h3 className="text-2xl font-bold text-foreground">{selectedNode.title}</h3>
                </div>
              </div>

              <p className="text-muted-foreground text-sm sm:text-base leading-relaxed">
                {selectedNode.description}
              </p>

              <div className="pt-2 flex flex-wrap gap-2">
                <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-md bg-muted border border-border text-xs text-foreground">
                  <CheckCircle2 className="w-3.5 h-3.5 text-green-500" />
                  <span>Automated & Instant</span>
                </div>
                <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-md bg-muted border border-border text-xs text-foreground">
                  <Zap className="w-3.5 h-3.5 text-amber-500" />
                  <span>Zero Server Setup</span>
                </div>
              </div>
            </div>

            {/* Right: Technical Specs Table (5 cols) */}
            <div className="lg:col-span-5 bg-background border border-border rounded-xl p-5 space-y-3">
              <h4 className="text-xs font-mono font-semibold text-muted-foreground uppercase tracking-wider mb-2 flex items-center gap-2">
                <Info className="w-3.5 h-3.5 text-orange-500" />
                Quick Summary
              </h4>

              <div className="space-y-2.5">
                {selectedNode.specs.map((spec, i) => (
                  <div
                    key={i}
                    className="flex items-center justify-between p-2.5 rounded-lg bg-card border border-border text-xs"
                  >
                    <span className="text-muted-foreground font-medium">{spec.label}</span>
                    <span className="text-orange-500 font-mono font-bold">{spec.value}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
