import { useState } from 'react';
import {
  Bot,
  Layers,
  Cpu,
  Shield,
  Key,
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
    title: '1. User Agent',
    subtitle: 'Cursor / Claude / Windsurf',
    icon: Bot,
    badge: 'MCP Client',
    description:
      'AI agents execute local code changes and issue a single Agni MCP tool call without writing Kubernetes manifests or Dockerfiles.',
    specs: [
      { label: 'Protocol', value: 'Model Context Protocol (JSON-RPC)' },
      { label: 'Latency', value: '<10ms Tool Resolution' },
      { label: 'Auth Handshake', value: 'Bearer / Local IPC Socket' },
    ],
  },
  {
    id: 'mcp-server',
    title: '2. Agni MCP Server',
    subtitle: 'Resource & Tool Engine',
    icon: Layers,
    badge: 'API Gateway',
    description:
      'Validates request payloads, manages magic-link tokens, compresses tarball artifacts, and translates tool calls into k3s CRD mutations.',
    specs: [
      { label: 'Core Engine', value: 'Go / High-Concurrency Daemon' },
      { label: 'Validation', value: 'Strict Zod / JSON Schema' },
      { label: 'Artifact Store', value: 'Internal containerd Registry' },
    ],
  },
  {
    id: 'k3s-control',
    title: '3. k3s Control Plane',
    subtitle: 'Lightweight K8s Core',
    icon: Server,
    badge: 'Orchestrator',
    description:
      'Schedules workloads across cluster nodes using custom Agni deployment controllers tuned for sub-second Pod lifecycle execution.',
    specs: [
      { label: 'Memory Overhead', value: '<512MB Master Node' },
      { label: 'Runtime Class', value: 'kata-fc (Firecracker)' },
      { label: 'HA Topology', value: 'Embedded etcd / SQLite' },
    ],
  },
  {
    id: 'kata-firecracker',
    title: '4. Kata Firecracker',
    subtitle: 'Hardware MicroVM Isolation',
    icon: Cpu,
    badge: 'Secure Hypervisor',
    description:
      'Every container runs inside its own dedicated Linux microkernel VM via AWS Firecracker + Kata Containers, preventing container breakout.',
    specs: [
      { label: 'Boot Time', value: '~420ms MicroVM Startup' },
      { label: 'Isolation', value: 'Hardware KVM Virtualization' },
      { label: 'Resource Cap', value: 'Strict cgroups v2 Limits' },
    ],
  },
  {
    id: 'cert-ingress',
    title: '5. TLS & Ingress Nginx',
    subtitle: 'cert-manager + Magic Link',
    icon: Globe,
    badge: 'Edge Ingress',
    description:
      'Automated Let\'s Encrypt TLS cert generation via cert-manager. Enforces magic-link reviewer authentication proxy before routing HTTP traffic.',
    specs: [
      { label: 'TLS Certs', value: '256-bit ECDSA Auto-Renewal' },
      { label: 'Authentication', value: 'Token-gated Magic Link' },
      { label: 'Routing', value: 'Sub-millisecond Nginx Ingress' },
    ],
  },
];

export function Architecture() {
  const [selectedNodeId, setSelectedNodeId] = useState<string>('kata-firecracker');

  const selectedNode = ARCH_NODES.find((n) => n.id === selectedNodeId) || ARCH_NODES[3];

  return (
    <section id="architecture" className="py-24 bg-[#030712] relative overflow-hidden">
      {/* Radial glow background */}
      <div className="absolute top-1/3 right-1/4 w-[600px] h-[600px] bg-gradient-to-br from-amber-600/15 via-orange-600/10 to-indigo-600/10 rounded-full blur-[150px] pointer-events-none" />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        {/* Header */}
        <div className="text-center max-w-3xl mx-auto mb-16">
          <div className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full bg-orange-500/10 border border-orange-500/20 text-orange-400 text-xs font-mono mb-4">
            <Shield className="w-3.5 h-3.5" />
            <span>Under The Hood</span>
          </div>
          <h2 className="text-3xl sm:text-5xl font-extrabold text-white tracking-tight mb-4">
            Enterprise-Grade <span className="bg-gradient-to-r from-orange-400 to-amber-400 bg-clip-text text-transparent">Architecture</span>
          </h2>
          <p className="text-zinc-400 text-base sm:text-lg">
            How Agni seamlessly connects AI agent tool calls to hardware-isolated Firecracker microVMs on lightweight Kubernetes.
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
                        ? 'bg-gradient-to-b from-orange-950/40 to-[#090d16] border-orange-500/60 shadow-xl shadow-orange-950/40 ring-1 ring-orange-500/50 scale-[1.02]'
                        : 'bg-[#090d16]/80 hover:bg-[#0d1220] border-white/10 hover:border-white/20'
                    }`}
                  >
                    <div>
                      <div className="flex items-center justify-between mb-3">
                        <div
                          className={`p-2.5 rounded-lg transition-colors ${
                            isSelected
                              ? 'bg-orange-500 text-black'
                              : 'bg-zinc-800 text-orange-400 group-hover:bg-zinc-700'
                          }`}
                        >
                          <IconComponent className="w-5 h-5" />
                        </div>
                        <span className="text-[10px] font-mono font-semibold px-2 py-0.5 rounded bg-zinc-800 text-zinc-300 border border-zinc-700">
                          {node.badge}
                        </span>
                      </div>

                      <h3 className="text-sm font-bold text-white mb-1 group-hover:text-orange-300 transition-colors">
                        {node.title}
                      </h3>
                      <p className="text-xs text-zinc-400 font-mono mb-2">{node.subtitle}</p>
                    </div>

                    <div className="mt-3 pt-3 border-t border-white/5 flex items-center justify-between text-[11px]">
                      <span className="text-zinc-500 group-hover:text-zinc-300">View Specs</span>
                      <ArrowRight
                        className={`w-3.5 h-3.5 transition-transform ${
                          isSelected ? 'text-orange-400 translate-x-1' : 'text-zinc-600'
                        }`}
                      />
                    </div>
                  </button>

                  {/* Connecting Arrow for Desktop */}
                  {index < ARCH_NODES.length - 1 && (
                    <div className="hidden md:block absolute -right-2 top-1/2 -translate-y-1/2 z-20 pointer-events-none">
                      <div className="w-4 h-4 rounded-full bg-[#030712] border border-orange-500/40 flex items-center justify-center">
                        <ArrowRight className="w-2.5 h-2.5 text-orange-400" />
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* Node Specification Details Box */}
        <div className="bg-[#090d16] border border-orange-500/30 rounded-2xl p-6 lg:p-8 shadow-2xl backdrop-blur-xl relative overflow-hidden">
          <div className="absolute top-0 right-0 p-8 opacity-10 pointer-events-none">
            <selectedNode.icon className="w-48 h-48 text-orange-500" />
          </div>

          <div className="relative z-10 grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
            {/* Left: Text Explanation (7 cols) */}
            <div className="lg:col-span-7 space-y-4">
              <div className="flex items-center gap-3">
                <div className="p-3 rounded-xl bg-orange-500/10 border border-orange-500/30 text-orange-400">
                  <selectedNode.icon className="w-6 h-6" />
                </div>
                <div>
                  <span className="text-xs font-mono text-orange-400 uppercase tracking-widest">
                    Component Deep Dive
                  </span>
                  <h3 className="text-2xl font-bold text-white">{selectedNode.title}</h3>
                </div>
              </div>

              <p className="text-zinc-300 text-sm sm:text-base leading-relaxed">
                {selectedNode.description}
              </p>

              <div className="pt-2 flex flex-wrap gap-2">
                <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-md bg-white/5 border border-white/10 text-xs text-zinc-300">
                  <CheckCircle2 className="w-3.5 h-3.5 text-green-400" />
                  <span>Production Ready</span>
                </div>
                <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-md bg-white/5 border border-white/10 text-xs text-zinc-300">
                  <Zap className="w-3.5 h-3.5 text-amber-400" />
                  <span>Zero Agent Configuration</span>
                </div>
              </div>
            </div>

            {/* Right: Technical Specs Table (5 cols) */}
            <div className="lg:col-span-5 bg-[#030712] border border-white/10 rounded-xl p-5 space-y-3">
              <h4 className="text-xs font-mono font-semibold text-zinc-400 uppercase tracking-wider mb-2 flex items-center gap-2">
                <Info className="w-3.5 h-3.5 text-orange-400" />
                Technical Specifications
              </h4>

              <div className="space-y-2.5">
                {selectedNode.specs.map((spec, i) => (
                  <div
                    key={i}
                    className="flex items-center justify-between p-2.5 rounded-lg bg-zinc-900/60 border border-zinc-800/80 text-xs"
                  >
                    <span className="text-zinc-400 font-medium">{spec.label}</span>
                    <span className="text-orange-400 font-mono font-bold">{spec.value}</span>
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
