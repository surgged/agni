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
  Flame,
  Globe,
  Play,
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

  const handleScrollToHowItWorks = () => {
    const el = document.querySelector('#how-it-works');
    if (el) el.scrollIntoView({ behavior: 'smooth' });
  };

  return (
    <section className="relative pt-32 pb-20 md:pt-40 md:pb-28 overflow-hidden bg-background text-foreground">
      {/* Glow background effects */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-gradient-to-tr from-orange-500/15 via-amber-500/10 to-purple-500/10 rounded-full blur-[140px] pointer-events-none" />
      <div className="absolute top-1/3 right-10 w-96 h-96 bg-orange-500/10 rounded-full blur-[120px] pointer-events-none" />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10 text-center">
        {/* Badge Pill */}
        <div className="inline-flex items-center gap-2.5 px-4 py-1.5 rounded-full bg-orange-500/10 border border-orange-500/30 text-orange-500 text-xs font-semibold tracking-wide backdrop-blur-md shadow-sm mb-8 animate-fade-in">
          <span className="relative flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-orange-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2 w-2 bg-orange-500"></span>
          </span>
          <Flame className="w-3.5 h-3.5 text-orange-500 fill-orange-500/30" />
          <span>The Instant Home for AI-Built Apps</span>
        </div>

        {/* Main Headline */}
        <h1 className="text-4xl sm:text-6xl lg:text-7xl font-extrabold tracking-tight max-w-5xl mx-auto leading-[1.1] mb-6">
          Where AI-Built Apps Go{' '}
          <span className="bg-gradient-to-r from-orange-500 via-amber-500 to-yellow-500 bg-clip-text text-transparent drop-shadow-sm">
            Live Instantly
          </span>
        </h1>

        {/* Subheadline */}
        <p className="text-base sm:text-xl text-muted-foreground max-w-3xl mx-auto font-normal leading-relaxed mb-10">
          When your AI assistant finishes writing an app, Agni gives it a safe, instant home on the web. No servers to set up, no complicated cloud settings—just tell your AI <span className="text-foreground font-semibold">"Deploy my app"</span> and get a shareable link.
        </p>

        {/* Interactive CLI Installation Pill */}
        <div className="max-w-md mx-auto mb-10">
          <div className="flex items-center justify-between bg-card border border-orange-500/30 rounded-xl p-2 pl-4 backdrop-blur-lg shadow-xl group hover:border-orange-500/60 transition-all duration-300">
            <div className="flex items-center gap-3 font-mono text-xs text-foreground">
              <Terminal className="w-4 h-4 text-orange-500 shrink-0" />
              <span className="text-orange-500 select-none">$</span>
              <span className="font-semibold">{cliCommand}</span>
            </div>

            <button
              onClick={copyToClipboard}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-mono font-medium rounded-lg bg-orange-500/10 hover:bg-orange-500/20 text-orange-500 border border-orange-500/30 transition-all active:scale-95 shrink-0"
              title="Copy to clipboard"
            >
              {copied ? (
                <>
                  <Check className="w-3.5 h-3.5 text-green-500" />
                  <span className="text-green-500">Copied</span>
                </>
              ) : (
                <>
                  <Copy className="w-3.5 h-3.5" />
                  <span>Copy</span>
                </>
              )}
            </button>
          </div>
          <p className="text-[11px] text-muted-foreground mt-2 font-mono">
            Zero setup required &bull; Connects automatically to Cursor, Claude & Windsurf
          </p>
        </div>

        {/* CTA Buttons */}
        <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-16">
          <Link
            to="/register"
            className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-8 py-3.5 text-sm font-bold text-white bg-gradient-to-r from-orange-500 via-amber-600 to-amber-600 hover:from-orange-600 hover:to-amber-700 rounded-xl shadow-lg shadow-orange-500/25 transition-all duration-200 hover:scale-[1.03] active:scale-[0.98]"
          >
            <Sparkles className="w-4 h-4 fill-white/20" />
            <span>Deploy Your First App</span>
            <ArrowRight className="w-4 h-4" />
          </Link>

          <button
            onClick={handleScrollToHowItWorks}
            className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-8 py-3.5 text-sm font-semibold text-foreground bg-secondary hover:bg-secondary/80 border border-border rounded-xl backdrop-blur-md transition-all duration-200"
          >
            <Play className="w-4 h-4 text-orange-500 fill-orange-500/20" />
            <span>See How It Works</span>
          </button>
        </div>

        {/* Feature / Stats Ribbon */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 max-w-4xl mx-auto pt-6 border-t border-border">
          <div className="flex flex-col items-center p-3.5 rounded-xl bg-card border border-border">
            <div className="flex items-center gap-1.5 text-orange-500 text-sm font-bold font-mono">
              <Zap className="w-4 h-4" />
              <span>Sub-Second Launch</span>
            </div>
            <span className="text-xs text-muted-foreground mt-1">Apps wake up in 420ms</span>
          </div>

          <div className="flex flex-col items-center p-3.5 rounded-xl bg-card border border-border">
            <div className="flex items-center gap-1.5 text-amber-500 text-sm font-bold font-mono">
              <ShieldCheck className="w-4 h-4" />
              <span>Super Safe Sandbox</span>
            </div>
            <span className="text-xs text-muted-foreground mt-1">Private micro-computer isolation</span>
          </div>

          <div className="flex flex-col items-center p-3.5 rounded-xl bg-card border border-border">
            <div className="flex items-center gap-1.5 text-emerald-500 text-sm font-bold font-mono">
              <Lock className="w-4 h-4" />
              <span>Instant HTTPS Lock</span>
            </div>
            <span className="text-xs text-muted-foreground mt-1">Automatic web security icons</span>
          </div>

          <div className="flex flex-col items-center p-3.5 rounded-xl bg-card border border-border">
            <div className="flex items-center gap-1.5 text-purple-500 text-sm font-bold font-mono">
              <Globe className="w-4 h-4" />
              <span>Magic Link Share</span>
            </div>
            <span className="text-xs text-muted-foreground mt-1">Send a private link with 1 click</span>
          </div>
        </div>
      </div>
    </section>
  );
}
