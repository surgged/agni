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
    label: 'Preparing Workspace',
    detail: 'Gathering app files from ./my-app (3.4 MB bundle)...',
    icon: Box,
    durationMs: 800,
  },
  {
    id: 2,
    label: 'Building App Package',
    detail: 'Packaging web application into a clean runtime container...',
    icon: Cpu,
    durationMs: 1100,
  },
  {
    id: 3,
    label: 'Sending To Cloud',
    detail: 'Transferring app package to internal Agni cloud vault...',
    icon: Zap,
    durationMs: 900,
  },
  {
    id: 4,
    label: 'Starting Micro-Sandbox',
    detail: 'Launching private micro-computer sandbox (Firecracker engine)...',
    icon: Shield,
    durationMs: 1200,
  },
  {
    id: 5,
    label: 'Securing Web Address',
    detail: 'Issuing free SSL security lock for my-app.agni.dev...',
    icon: Key,
    durationMs: 900,
  },
  {
    id: 6,
    label: 'Generating Share Link',
    detail: 'App is online! Private magic-link protection active.',
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
      title: 'Cursor Agent',
      prompt: 'Deploy my web app so I can share it with my team.',
      code: `// Tell Cursor: "Deploy my app to Agni"
await mcp.callTool("agni_deploy_app", {
  path: "./my-app",
  secure_link: true
});`,
    },
    claude: {
      title: 'Claude Code Assistant',
      prompt: 'claude> /deploy my app to a secure web address',
      code: `# Command inside Claude Code
$ claude mcp call agni agni_deploy_app --arg path="./my-app"`,
    },
    windsurf: {
      title: 'Windsurf Cascade',
      prompt: 'Cascade: Put this app on the web with a private share link.',
      code: `// Tell Windsurf: "Ship this project"
windsurf.mcp.call("agni_deploy_app", {
  project_root: "./my-app"
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
      `[00:00.00] 🚀 Asking Agni to deploy app from ${snippets[activeTab].title}...`,
      `[00:00.05] 📡 Connected to Agni cloud engine...`,
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
        `[00:05.62] ✨ DEPLOYMENT COMPLETE! Your app is live at: ${finalUrl}`,
        `[00:05.65] 🔒 Private Magic Link: agni_ml_8f92a3b91c`,
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
    <section id="demo" className="py-20 bg-background text-foreground relative overflow-hidden border-t border-b border-border">
      {/* Background radial glow */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[500px] bg-orange-500/10 rounded-full blur-[160px] pointer-events-none" />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        {/* Header */}
        <div className="text-center max-w-3xl mx-auto mb-12">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-orange-500/10 border border-orange-500/20 text-orange-500 text-xs font-mono mb-4">
            <TerminalIcon className="w-3.5 h-3.5" />
            <span>Interactive Demo</span>
          </div>
          <h2 className="text-3xl sm:text-5xl font-extrabold text-foreground tracking-tight mb-4">
            Try A Simulated <span className="text-orange-500">Live Launch</span>
          </h2>
          <p className="text-muted-foreground text-base sm:text-lg">
            Click "Run Live Deploy" below to watch how an AI assistant launches an app in real-time.
          </p>
        </div>

        {/* Tab Switcher */}
        <div className="flex justify-center mb-6">
          <div className="bg-card p-1.5 rounded-xl border border-border flex items-center gap-2 shadow-md">
            {(['cursor', 'claude', 'windsurf'] as AgentTab[]).map((tab) => (
              <button
                key={tab}
                onClick={() => {
                  setActiveTab(tab);
                  resetSimulation();
                }}
                className={`px-4 py-2 rounded-lg text-xs font-semibold font-mono transition-all duration-200 ${
                  activeTab === tab
                    ? 'bg-gradient-to-r from-orange-500 to-amber-600 text-white shadow-md'
                    : 'text-muted-foreground hover:text-foreground hover:bg-muted'
                }`}
              >
                {tab === 'cursor' && 'Cursor Agent'}
                {tab === 'claude' && 'Claude Assistant'}
                {tab === 'windsurf' && 'Windsurf Cascade'}
              </button>
            ))}
          </div>
        </div>

        {/* Terminal Card Container */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 bg-card border border-border rounded-2xl p-6 shadow-xl backdrop-blur-xl">
          {/* Left Column: Code Prompt & Tool Call (5 cols) */}
          <div className="lg:col-span-5 flex flex-col justify-between space-y-4">
            <div>
              <div className="flex items-center justify-between mb-3">
                <span className="text-xs font-mono font-semibold text-orange-500 flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-orange-500 animate-pulse" />
                  {snippets[activeTab].title}
                </span>
                <button
                  onClick={copyCode}
                  className="p-1.5 text-muted-foreground hover:text-foreground bg-muted rounded-md border border-border transition-colors"
                  title="Copy code"
                >
                  {copiedCode ? <Check className="w-3.5 h-3.5 text-green-500" /> : <Copy className="w-3.5 h-3.5" />}
                </button>
              </div>

              {/* Agent User Prompt Box */}
              <div className="mb-4 bg-muted/60 border border-border rounded-xl p-3">
                <span className="text-[10px] font-mono text-muted-foreground uppercase tracking-wider block mb-1">
                  What You Say To Your AI
                </span>
                <p className="text-xs text-foreground font-mono italic">
                  "{snippets[activeTab].prompt}"
                </p>
              </div>

              {/* Tool Call Code Display */}
              <div className="bg-background border border-border rounded-xl p-4 font-mono text-xs text-foreground overflow-x-auto">
                <pre className="text-orange-500/90 leading-relaxed whitespace-pre-wrap">
                  {snippets[activeTab].code}
                </pre>
              </div>
            </div>

            {/* Controls & Action Button */}
            <div className="pt-4 border-t border-border flex items-center justify-between gap-3">
              <button
                onClick={startSimulation}
                disabled={isRunning}
                className={`flex-1 flex items-center justify-center gap-2 py-3 px-4 rounded-xl text-xs font-bold transition-all shadow-md ${
                  isRunning
                    ? 'bg-muted text-muted-foreground cursor-not-allowed border border-border'
                    : 'bg-gradient-to-r from-orange-500 to-amber-600 hover:from-orange-600 hover:to-amber-700 text-white shadow-orange-500/20 active:scale-95'
                }`}
              >
                {isRunning ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin text-white" />
                    <span>Launching App...</span>
                  </>
                ) : (
                  <>
                    <Play className="w-4 h-4 fill-white" />
                    <span>Run Live Deploy</span>
                  </>
                )}
              </button>

              <button
                onClick={resetSimulation}
                className="p-3 text-muted-foreground hover:text-foreground bg-muted border border-border rounded-xl transition-all"
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
                        ? 'bg-orange-500/10 border-orange-500/40 text-orange-500'
                        : isCurrent
                        ? 'bg-amber-500/20 border-amber-500 text-amber-600 animate-pulse'
                        : 'bg-muted/40 border-border text-muted-foreground'
                    }`}
                  >
                    <div className="shrink-0">
                      {isCompleted ? (
                        <CheckCircle2 className="w-4 h-4 text-orange-500" />
                      ) : isCurrent ? (
                        <Loader2 className="w-4 h-4 animate-spin text-amber-500" />
                      ) : (
                        <IconComponent className="w-4 h-4 text-muted-foreground" />
                      )}
                    </div>
                    <div className="min-w-0">
                      <p className="text-[11px] font-semibold truncate leading-tight">
                        {step.label}
                      </p>
                      <p className="text-[9px] font-mono text-muted-foreground truncate">
                        {isCompleted ? 'Done' : isCurrent ? 'Running...' : 'Queued'}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Terminal Console Output Window */}
            <div className="flex-1 bg-background border border-border rounded-xl overflow-hidden flex flex-col min-h-[260px]">
              {/* Terminal Window Header */}
              <div className="bg-muted px-4 py-2.5 border-b border-border flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-2.5 h-2.5 rounded-full bg-red-500/80" />
                  <div className="w-2.5 h-2.5 rounded-full bg-yellow-500/80" />
                  <div className="w-2.5 h-2.5 rounded-full bg-green-500/80" />
                  <span className="text-[11px] font-mono text-muted-foreground ml-2">
                    live-deployment-status.log
                  </span>
                </div>
                <span className="text-[10px] font-mono text-muted-foreground">
                  Agni Engine
                </span>
              </div>

              {/* Logs Content */}
              <div
                ref={logContainerRef}
                className="p-4 font-mono text-xs space-y-1.5 overflow-y-auto max-h-[240px] text-foreground"
              >
                {logs.length === 0 ? (
                  <div className="h-40 flex flex-col items-center justify-center text-muted-foreground space-y-2">
                    <TerminalIcon className="w-8 h-8 opacity-40 text-orange-500" />
                    <p className="text-xs">Click "Run Live Deploy" to watch simulated launch</p>
                  </div>
                ) : (
                  logs.map((log, i) => (
                    <div
                      key={i}
                      className={`leading-relaxed ${
                        log.includes('DEPLOYMENT COMPLETE')
                          ? 'text-orange-500 font-bold bg-orange-500/10 p-2 rounded border border-orange-500/30'
                          : log.includes('Step')
                          ? 'text-amber-500'
                          : 'text-muted-foreground'
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
              <div className="bg-card border border-orange-500/50 rounded-xl p-4 flex items-center justify-between shadow-lg animate-fade-in">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-orange-500/20 text-orange-500">
                    <Globe className="w-5 h-5" />
                  </div>
                  <div>
                    <span className="text-[10px] font-mono uppercase text-orange-500 tracking-wider">
                      App Is Online & Protected
                    </span>
                    <a
                      href={liveUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-sm font-bold text-foreground hover:text-orange-500 flex items-center gap-1 font-mono"
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
                  className="px-4 py-2 rounded-lg bg-orange-500 text-white font-bold text-xs hover:bg-orange-600 transition-colors shadow-md"
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
