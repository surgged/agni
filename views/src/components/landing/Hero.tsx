import { useState } from 'react';
import { Link } from 'react-router-dom';
import {
  Terminal,
  Copy,
  Check,
  Zap,
  ShieldCheck,
  Lock,
  ArrowRight,
  Sparkles,
  Server,
  Cpu,
  Flame,
  Globe,
} from 'lucide-react';
import { toast } from 'sonner';

export function Hero() {
  const [copied, setCopied] = useState(false);
  const cliCommand = 'npx agni-mcp@latest start';

  const copyToClipboard = () => {
    navigator.clipboard.writeText(cliCommand);
    setCopied(true);
    toast.success('CLI command copied to clipboard!');
    setTimeout(() => setCopied(false), 2000);
  };

  const handleScrollToArch = () => {
    const el = document.querySelector('#architecture');
    if (el) el.scrollIntoView({ behavior: 'smooth' });
  };

  return (
    <section className="relative pt-32 pb-20 md:pt-40 md:pb-28 overflow-hidden bg-[#030712] text-white">
      {/* Glow background effects */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-gradient-to-tr from-orange-600/20 via-amber-500/15 to-purple-600/10 rounded-full blur-[140px] pointer-events-none" />
      <div className="absolute top-1/3 right-10 w-96 h-96 bg-orange-500/10 rounded-full blur-[120px] pointer-events-none" />
      
      {/* Background grid pattern */}
      <div className="absolute inset-0 bg-[radial-gradient(#334155_1px,transparent_1px)] [background-size:24px_24px] opacity-15 pointer-events-none" />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10 text-center">
        {/* Badge Pill */}
        <div className="inline-flex items-center gap-2.5 px-4 py-1.5 rounded-full bg-gradient-to-r from-orange-500/10 via-amber-500/10 to-orange-500/10 border border-orange-500/30 text-orange-400 text-xs font-semibold tracking-wide backdrop-blur-md shadow-lg shadow-orange-950/30 mb-8 animate-fade-in">
          <span className="relative flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-orange-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2 w-2 bg-orange-500"></span>
          </span>
          <Flame className="w-3.5 h-3.5 text-orange-400 fill-orange-400/30" />
          <span>MCP-Native App Hosting Platform</span>
        </div>

        {/* Main Headline */}
        <h1 className="text-4xl sm:text-6xl lg:text-7xl font-extrabold tracking-tight max-w-5xl mx-auto leading-[1.1] mb-6">
          The Neutral Deploy Target for{' '}
          <span className="bg-gradient-to-r from-orange-400 via-amber-300 to-yellow-400 bg-clip-text text-transparent drop-shadow-sm">
            AI Agents
          </span>
        </h1>

        {/* Subheadline */}
        <p className="text-base sm:text-xl text-zinc-300 max-w-3xl mx-auto font-normal leading-relaxed mb-10">
          One MCP call deploys your app with TLS, magic-link auth, and Firecracker microVM isolation on any cloud. Built specifically for Cursor, Claude Code, and Windsurf workflows.
        </p>

        {/* Interactive CLI Installation Pill */}
        <div className="max-w-md mx-auto mb-10">
          <div className="flex items-center justify-between bg-[#090d16]/90 border border-orange-500/30 rounded-xl p-2 pl-4 backdrop-blur-lg shadow-xl shadow-orange-950/30 group hover:border-orange-500/60 transition-all duration-300">
            <div className="flex items-center gap-3 font-mono text-xs text-zinc-200">
              <Terminal className="w-4 h-4 text-orange-400 shrink-0" />
              <span className="text-orange-500 select-none">$</span>
              <span className="text-zinc-100 font-semibold">{cliCommand}</span>
            </div>

            <button
              onClick={copyToClipboard}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-mono font-medium rounded-lg bg-orange-500/10 hover:bg-orange-500/20 text-orange-400 border border-orange-500/30 transition-all active:scale-95 shrink-0"
              title="Copy to clipboard"
            >
              {copied ? (
                <>
                  <Check className="w-3.5 h-3.5 text-green-400" />
                  <span className="text-green-400">Copied</span>
                </>
              ) : (
                <>
                  <Copy className="w-3.5 h-3.5" />
                  <span>Copy</span>
                </>
              )}
            </button>
          </div>
          <p className="text-[11px] text-zinc-500 mt-2 font-mono">
            Zero configuration required &bull; Auto-detects local Agni daemon or cloud API
          </p>
        </div>

        {/* CTA Buttons */}
        <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-16">
          <Link
            to="/register"
            className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-8 py-3.5 text-sm font-bold text-black bg-gradient-to-r from-orange-400 via-amber-400 to-yellow-400 hover:from-orange-300 hover:to-amber-300 rounded-xl shadow-lg shadow-orange-500/25 transition-all duration-200 hover:scale-[1.03] active:scale-[0.98]"
          >
            <Sparkles className="w-4 h-4 fill-black/20" />
            <span>Deploy First App</span>
            <ArrowRight className="w-4 h-4" />
          </Link>

          <button
            onClick={handleScrollToArch}
            className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-8 py-3.5 text-sm font-semibold text-zinc-200 hover:text-white bg-zinc-900/80 hover:bg-zinc-800 border border-white/10 hover:border-white/20 rounded-xl backdrop-blur-md transition-all duration-200"
          >
            <Server className="w-4 h-4 text-orange-400" />
            <span>Explore Architecture</span>
          </button>
        </div>

        {/* Feature / Stats Ribbon */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 max-w-4xl mx-auto pt-6 border-t border-white/10">
          <div className="flex flex-col items-center p-3 rounded-xl bg-white/[0.02] border border-white/5">
            <div className="flex items-center gap-1.5 text-orange-400 text-sm font-bold font-mono">
              <Zap className="w-4 h-4" />
              <span>420ms</span>
            </div>
            <span className="text-xs text-zinc-400 mt-1">MicroVM Cold Start</span>
          </div>

          <div className="flex flex-col items-center p-3 rounded-xl bg-white/[0.02] border border-white/5">
            <div className="flex items-center gap-1.5 text-amber-400 text-sm font-bold font-mono">
              <ShieldCheck className="w-4 h-4" />
              <span>Kata + Firecracker</span>
            </div>
            <span className="text-xs text-zinc-400 mt-1">Hardware Isolation</span>
          </div>

          <div className="flex flex-col items-center p-3 rounded-xl bg-white/[0.02] border border-white/5">
            <div className="flex items-center gap-1.5 text-emerald-400 text-sm font-bold font-mono">
              <Lock className="w-4 h-4" />
              <span>cert-manager TLS</span>
            </div>
            <span className="text-xs text-zinc-400 mt-1">Zero-Config HTTPS</span>
          </div>

          <div className="flex flex-col items-center p-3 rounded-xl bg-white/[0.02] border border-white/5">
            <div className="flex items-center gap-1.5 text-purple-400 text-sm font-bold font-mono">
              <Globe className="w-4 h-4" />
              <span>Magic Link Auth</span>
            </div>
            <span className="text-xs text-zinc-400 mt-1">Instant Reviewer Auth</span>
          </div>
        </div>
      </div>
    </section>
  );
}
