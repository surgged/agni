import { useState, useEffect, useRef } from 'react';
import {
  Terminal as TerminalIcon,
  Play,
  RotateCcw,
  CheckCircle2,
  Loader2,
  ExternalLink,
  Shield,
  Zap,
  Box,
  Key,
  Globe,
  Cpu,
  Copy,
  Check,
} from 'lucide-react';

interface DeployStep {
  id: number;
  label: string;
  detail: string;
  icon: any;
  durationMs: number;
}

const DEPLOY_STEPS: DeployStep[] = [
  {
    id: 1,
    label: 'Tarballing Workspace',
    detail: 'Compressing ./my-app (3.4 MB tarball created)...',
    icon: Box,
    durationMs: 800,
  },
  {
    id: 2,
    label: 'nerdctl OCI Image Build',
    detail: 'Executing nerdctl build --namespace k8s.io -t registry.agni.internal/app-8f92a...',
    icon: Cpu,
    durationMs: 1100,
  },
  {
    id: 3,
    label: 'containerd Push',
    detail: 'Pushing OCI container image to internal containerd registry...',
    icon: Zap,
    durationMs: 900,
  },
  {
    id: 4,
    label: 'k3s Kata Pod Provisioning',
    detail: 'Provisioning k3s Pod with Kata Containers (Firecracker microVM runtime)...',
    icon: Shield,
    durationMs: 1200,
  },
  {
    id: 5,
    label: 'cert-manager TLS Issuance',
    detail: 'Requesting cert-manager Let\'s Encrypt TLS certificate for my-app.agni.dev...',
    icon: Key,
    durationMs: 900,
  },
  {
    id: 6,
    label: 'Ingress & Magic Link Gate',
    detail: 'Synchronized Nginx ingress route & active magic-link token security layer.',
    icon: Globe,
    durationMs: 700,
  },
];

type AgentTab = 'cursor' | 'claude' | 'windsurf';

export function TerminalDemo() {
  const [activeTab, setActiveTab] = useState<AgentTab>('cursor');
  const [isRunning, setIsRunning] = useState(false);
  const [currentStepIndex, setCurrentStepIndex] = useState<number>(-1);
  const [completedSteps, setCompletedSteps] = useState<number[]>([]);
  const [logs, setLogs] = useState<string[]>([]);
  const [liveUrl, setLiveUrl] = useState<string | null>(null);
  const [copiedCode, setCopiedCode] = useState(false);
  const logContainerRef = useRef<HTMLDivElement>(null);

  const snippets: Record<AgentTab, { title: string; prompt: string; code: string }> = {
    cursor: {
      title: 'Cursor Agent (MCP Protocol)',
      prompt: 'Deploy my current Vite frontend project to Agni with microVM isolation and HTTPS.',
      code: `// Agent tool call execution inside Cursor
const result = await mcp.callTool("agni_deploy_app", {
  path: "./my-app",
  runtime: "node20",
  port: 3000,
  isolation: "firecracker",
  enable_tls: true,
  magic_link_auth: true
});

console.log(\`Live URL: \${result.url}\`);`,
    },
    claude: {
      title: 'Claude Code CLI Agent',
      prompt: 'claude> /deploy --path ./my-app --isolation firecracker',
      code: `# Invoking Agni MCP server from Claude Code terminal
$ claude mcp call agni agni_deploy_app \\
    --arg path="./my-app" \\
    --arg port=3000 \\
    --arg runtime="kata-fc" \\
    --arg domain="my-app.agni.dev"`,
    },
    windsurf: {
      title: 'Windsurf Cascade Agent',
      prompt: 'Cascade: Ship this workspace to a zero-trust Firecracker VM with a magic link.',
      code: `// Windsurf agent calling Agni MCP Server via JSON-RPC
windsurf.mcp.call("agni_deploy_app", {
  project_root: "./my-app",
  build_command: "bun run build",
  firecracker_mem_mb: 512,
  firecracker_vcpus: 1,
  tls_provider: "cert-manager"
});`,
    },
  };

  const startSimulation = () => {
    if (isRunning) return;
    setIsRunning(true);
    setCurrentStepIndex(0);
    setCompletedSteps([]);
    setLiveUrl(null);
    setLogs([
      `[00:00.00] 🚀 Initializing Agni MCP tool call from ${snippets[activeTab].title}...`,
      `[00:00.05] 📡 Connected to Agni Local Daemon (unix:///var/run/agni.sock)...`,
    ]);
  };

  const resetSimulation = () => {
    setIsRunning(false);
    setCurrentStepIndex(-1);
    setCompletedSteps([]);
    setLogs([]);
    setLiveUrl(null);
  };

  useEffect(() => {
    if (!isRunning || currentStepIndex < 0) return;

    if (currentStepIndex >= DEPLOY_STEPS.length) {
      setIsRunning(false);
      const finalUrl = 'https://my-app.agni.dev';
      setLiveUrl(finalUrl);
      setLogs((prev) => [
        ...prev,
        `[00:05.62] ✨ DEPLOYMENT COMPLETE! App live at: ${finalUrl}`,
        `[00:05.65] 🔒 Magic Link Access Token: agni_ml_8f92a3b91c`,
      ]);
      return;
    }

    const step = DEPLOY_STEPS[currentStepIndex];
    const timestamp = (0.5 + currentStepIndex * 0.9).toFixed(2);
    setLogs((prev) => [...prev, `[00:0${timestamp}] Step ${step.id}/${DEPLOY_STEPS.length}: ${step.detail}`]);

    const timer = setTimeout(() => {
      setCompletedSteps((prev) => [...prev, step.id]);
      setCurrentStepIndex((prev) => prev + 1);
    }, step.durationMs);

    return () => clearTimeout(timer);
  }, [isRunning, currentStepIndex]);

  useEffect(() => {
    if (logContainerRef.current) {
      logContainerRef.current.scrollTop = logContainerRef.current.scrollHeight;
    }
  }, [logs]);

  const copyCode = () => {
    navigator.clipboard.writeText(snippets[activeTab].code);
    setCopiedCode(true);
    setTimeout(() => setCopiedCode(false), 2000);
  };

  return (
    <section id="demo" className="py-20 bg-[#060a12] relative overflow-hidden border-t border-b border-white/10">
      {/* Background radial glow */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[500px] bg-orange-600/10 rounded-full blur-[160px] pointer-events-none" />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        {/* Header */}
        <div className="text-center max-w-3xl mx-auto mb-12">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-orange-500/10 border border-orange-500/20 text-orange-400 text-xs font-mono mb-4">
            <TerminalIcon className="w-3.5 h-3.5" />
            <span>Interactive Simulator</span>
          </div>
          <h2 className="text-3xl sm:text-5xl font-extrabold text-white tracking-tight mb-4">
            Watch AI Agents Deploy in <span className="text-orange-400">Real-Time</span>
          </h2>
          <p className="text-zinc-400 text-base sm:text-lg">
            See how Cursor, Claude Code, and Windsurf invoke Agni's single-call MCP deploy tool to launch Firecracker microVMs.
          </p>
        </div>

        {/* Tab Switcher */}
        <div className="flex justify-center mb-6">
          <div className="bg-[#090d16] p-1.5 rounded-xl border border-white/10 flex items-center gap-2 shadow-xl">
            {(['cursor', 'claude', 'windsurf'] as AgentTab[]).map((tab) => (
              <button
                key={tab}
                onClick={() => {
                  setActiveTab(tab);
                  resetSimulation();
                }}
                className={`px-4 py-2 rounded-lg text-xs font-semibold font-mono transition-all duration-200 ${
                  activeTab === tab
                    ? 'bg-gradient-to-r from-orange-500 to-amber-600 text-white shadow-md shadow-orange-500/20'
                    : 'text-zinc-400 hover:text-white hover:bg-white/5'
                }`}
              >
                {tab === 'cursor' && 'Cursor Agent'}
                {tab === 'claude' && 'Claude Code CLI'}
                {tab === 'windsurf' && 'Windsurf Cascade'}
              </button>
            ))}
          </div>
        </div>

        {/* Terminal Card Container */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 bg-[#090d16]/90 border border-white/10 rounded-2xl p-6 shadow-2xl backdrop-blur-xl">
          {/* Left Column: Code Prompt & Tool Call (5 cols) */}
          <div className="lg:col-span-5 flex flex-col justify-between space-y-4">
            <div>
              <div className="flex items-center justify-between mb-3">
                <span className="text-xs font-mono font-semibold text-orange-400 flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-orange-500 animate-pulse" />
                  {snippets[activeTab].title}
                </span>
                <button
                  onClick={copyCode}
                  className="p-1.5 text-zinc-400 hover:text-white bg-zinc-800/80 rounded-md border border-zinc-700 transition-colors"
                  title="Copy code"
                >
                  {copiedCode ? <Check className="w-3.5 h-3.5 text-green-400" /> : <Copy className="w-3.5 h-3.5" />}
                </button>
              </div>

              {/* Agent User Prompt Box */}
              <div className="mb-4 bg-zinc-900/90 border border-zinc-800 rounded-xl p-3">
                <span className="text-[10px] font-mono text-zinc-500 uppercase tracking-wider block mb-1">
                  User Prompt
                </span>
                <p className="text-xs text-zinc-200 font-mono italic">
                  "{snippets[activeTab].prompt}"
                </p>
              </div>

              {/* Tool Call Code Display */}
              <div className="bg-[#030712] border border-white/10 rounded-xl p-4 font-mono text-xs text-zinc-300 overflow-x-auto">
                <pre className="text-orange-300/90 leading-relaxed whitespace-pre-wrap">
                  {snippets[activeTab].code}
                </pre>
              </div>
            </div>

            {/* Controls & Action Button */}
            <div className="pt-4 border-t border-white/10 flex items-center justify-between gap-3">
              <button
                onClick={startSimulation}
                disabled={isRunning}
                className={`flex-1 flex items-center justify-center gap-2 py-3 px-4 rounded-xl text-xs font-bold transition-all shadow-lg ${
                  isRunning
                    ? 'bg-zinc-800 text-zinc-500 cursor-not-allowed border border-zinc-700'
                    : 'bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-400 hover:to-amber-400 text-black shadow-orange-500/25 active:scale-95'
                }`}
              >
                {isRunning ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin text-orange-400" />
                    <span>Deploying MicroVM...</span>
                  </>
                ) : (
                  <>
                    <Play className="w-4 h-4 fill-black" />
                    <span>Run Live Deploy</span>
                  </>
                )}
              </button>

              <button
                onClick={resetSimulation}
                className="p-3 text-zinc-400 hover:text-white bg-zinc-900 border border-zinc-800 hover:border-zinc-700 rounded-xl transition-all"
                title="Reset simulation"
              >
                <RotateCcw className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Right Column: Live Terminal Stream & Pipeline Steps (7 cols) */}
          <div className="lg:col-span-7 flex flex-col space-y-4">
            {/* Steps Progress Pills */}
            <div className="grid grid-cols-3 gap-2">
              {DEPLOY_STEPS.map((step, idx) => {
                const isCompleted = completedSteps.includes(step.id);
                const isCurrent = currentStepIndex === idx && isRunning;
                const IconComponent = step.icon;

                return (
                  <div
                    key={step.id}
                    className={`p-2.5 rounded-xl border text-left transition-all duration-300 flex items-center gap-2 ${
                      isCompleted
                        ? 'bg-orange-500/10 border-orange-500/40 text-orange-300'
                        : isCurrent
                        ? 'bg-amber-500/20 border-amber-400 text-amber-200 animate-pulse'
                        : 'bg-zinc-900/60 border-zinc-800 text-zinc-500'
                    }`}
                  >
                    <div className="shrink-0">
                      {isCompleted ? (
                        <CheckCircle2 className="w-4 h-4 text-orange-400" />
                      ) : isCurrent ? (
                        <Loader2 className="w-4 h-4 animate-spin text-amber-400" />
                      ) : (
                        <IconComponent className="w-4 h-4 text-zinc-600" />
                      )}
                    </div>
                    <div className="min-w-0">
                      <p className="text-[11px] font-semibold truncate leading-tight">
                        {step.label}
                      </p>
                      <p className="text-[9px] font-mono text-zinc-400 truncate">
                        {isCompleted ? 'Done' : isCurrent ? 'Running...' : 'Queued'}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Terminal Console Output Window */}
            <div className="flex-1 bg-[#030712] border border-white/10 rounded-xl overflow-hidden flex flex-col min-h-[260px]">
              {/* Terminal Window Header */}
              <div className="bg-[#090d16] px-4 py-2.5 border-b border-white/10 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-2.5 h-2.5 rounded-full bg-red-500/80" />
                  <div className="w-2.5 h-2.5 rounded-full bg-yellow-500/80" />
                  <div className="w-2.5 h-2.5 rounded-full bg-green-500/80" />
                  <span className="text-[11px] font-mono text-zinc-400 ml-2">
                    agni-mcp-daemon.log
                  </span>
                </div>
                <span className="text-[10px] font-mono text-zinc-500">
                  Kata + Firecracker Engine
                </span>
              </div>

              {/* Logs Content */}
              <div
                ref={logContainerRef}
                className="p-4 font-mono text-xs space-y-1.5 overflow-y-auto max-h-[240px] text-zinc-300 scrollbar-thin scrollbar-thumb-zinc-800"
              >
                {logs.length === 0 ? (
                  <div className="h-40 flex flex-col items-center justify-center text-zinc-600 space-y-2">
                    <TerminalIcon className="w-8 h-8 opacity-40 text-orange-500" />
                    <p className="text-xs">Click "Run Live Deploy" to start simulated agent deploy</p>
                  </div>
                ) : (
                  logs.map((log, i) => (
                    <div
                      key={i}
                      className={`leading-relaxed ${
                        log.includes('DEPLOYMENT COMPLETE')
                          ? 'text-orange-400 font-bold bg-orange-950/30 p-2 rounded border border-orange-500/30'
                          : log.includes('Step')
                          ? 'text-amber-200'
                          : 'text-zinc-400'
                      }`}
                    >
                      {log}
                    </div>
                  ))
                )}
              </div>
            </div>

            {/* Live Result Preview Bar */}
            {liveUrl && (
              <div className="bg-gradient-to-r from-orange-950/60 via-amber-950/40 to-zinc-900 border border-orange-500/50 rounded-xl p-4 flex items-center justify-between shadow-xl animate-fade-in">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-orange-500/20 text-orange-400">
                    <Globe className="w-5 h-5" />
                  </div>
                  <div>
                    <span className="text-[10px] font-mono uppercase text-orange-400 tracking-wider">
                      MicroVM Online & Auth-Protected
                    </span>
                    <a
                      href={liveUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-sm font-bold text-white hover:text-orange-300 flex items-center gap-1 font-mono"
                    >
                      {liveUrl}
                      <ExternalLink className="w-3.5 h-3.5" />
                    </a>
                  </div>
                </div>

                <a
                  href={liveUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="px-4 py-2 rounded-lg bg-orange-500 text-black font-bold text-xs hover:bg-orange-400 transition-colors shadow-md"
                >
                  Visit Live App
                </a>
              </div>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}
