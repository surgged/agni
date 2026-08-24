import { Link } from 'react-router-dom';
import { ArrowUp, ExternalLink, ShieldCheck } from 'lucide-react';
import { Logo } from '@/components/ui/Logo';

export function Footer() {
  const scrollToTop = () => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  return (
    <footer className="bg-card border-t border-border text-muted-foreground relative overflow-hidden">
      {/* Footer Top Section */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-10">
          {/* Brand Info Column (2 cols) */}
          <div className="lg:col-span-2 space-y-4">
            <Logo />

            <p className="text-xs sm:text-sm text-muted-foreground max-w-sm leading-relaxed">
              The instant home for AI-built apps. Turn code written by Cursor, Claude, or Windsurf into secure live web links with zero server setup.
            </p>

            {/* Status Pill */}
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg bg-muted border border-border text-xs text-foreground">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
              </span>
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-500" />
              <span>All Systems Operational &bull; Global Edge Active</span>
            </div>
          </div>

          {/* Column 1: Product */}
          <div className="space-y-3">
            <h4 className="text-xs font-mono font-bold text-foreground uppercase tracking-wider">
              Product
            </h4>
            <ul className="space-y-2 text-xs">
              <li>
                <a href="#how-it-works" className="hover:text-orange-500 transition-colors">
                  How It Works
                </a>
              </li>
              <li>
                <a href="#features" className="hover:text-orange-500 transition-colors">
                  Capabilities & Features
                </a>
              </li>
              <li>
                <a href="#demo" className="hover:text-orange-500 transition-colors">
                  Interactive Demo
                </a>
              </li>
              <li>
                <a href="#ai-connect" className="hover:text-orange-500 transition-colors">
                  AI Connect
                </a>
              </li>
            </ul>
          </div>

          {/* Column 2: Integrations */}
          <div className="space-y-3">
            <h4 className="text-xs font-mono font-bold text-foreground uppercase tracking-wider">
              AI Integrations
            </h4>
            <ul className="space-y-2 text-xs">
              <li>
                <a
                  href="https://cursor.com"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="hover:text-orange-500 transition-colors inline-flex items-center gap-1"
                >
                  <span>Cursor Agent</span>
                  <ExternalLink className="w-3 h-3 text-muted-foreground" />
                </a>
              </li>
              <li>
                <a
                  href="https://claude.ai"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="hover:text-orange-500 transition-colors inline-flex items-center gap-1"
                >
                  <span>Claude Code</span>
                  <ExternalLink className="w-3 h-3 text-muted-foreground" />
                </a>
              </li>
              <li>
                <a
                  href="https://codeium.com/windsurf"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="hover:text-orange-500 transition-colors inline-flex items-center gap-1"
                >
                  <span>Windsurf Cascade</span>
                  <ExternalLink className="w-3 h-3 text-muted-foreground" />
                </a>
              </li>
              <li>
                <a
                  href="https://modelcontextprotocol.io"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="hover:text-orange-500 transition-colors inline-flex items-center gap-1"
                >
                  <span>MCP Standard</span>
                  <ExternalLink className="w-3 h-3 text-muted-foreground" />
                </a>
              </li>
            </ul>
          </div>

          {/* Column 3: Platform */}
          <div className="space-y-3">
            <h4 className="text-xs font-mono font-bold text-foreground uppercase tracking-wider">
              Platform
            </h4>
            <ul className="space-y-2 text-xs">
              <li>
                <Link to="/login" className="hover:text-orange-500 transition-colors">
                  Developer Dashboard
                </Link>
              </li>
              <li>
                <Link to="/register" className="hover:text-orange-500 transition-colors">
                  Create Account
                </Link>
              </li>
              <li>
                <a href="/docs" className="hover:text-orange-500 transition-colors">
                  Documentation
                </a>
              </li>
              <li>
                <span className="text-muted-foreground font-mono text-[11px]">
                  Version v0.1.0-beta
                </span>
              </li>
            </ul>
          </div>
        </div>
      </div>

      {/* Bottom Legal & Scroll Top Bar */}
      <div className="border-t border-border bg-background py-6">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-4">
          <p className="text-xs text-muted-foreground font-mono">
            &copy; {new Date().getFullYear()} Agni Platform. Built for the AI-Native developer ecosystem.
          </p>

          <div className="flex items-center gap-4">
            <button
              onClick={scrollToTop}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-secondary hover:bg-secondary/80 border border-border text-xs text-foreground transition-all"
            >
              <span>Back to top</span>
              <ArrowUp className="w-3.5 h-3.5 text-orange-500" />
            </button>
          </div>
        </div>
      </div>
    </footer>
  );
}
