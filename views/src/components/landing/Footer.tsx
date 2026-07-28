import { Link } from 'react-router-dom';
import { Flame, ArrowUp, Terminal, Shield, ExternalLink, Heart } from 'lucide-react';
import { GithubIcon as Github } from '@/components/icons/GithubIcon';

export function Footer() {
  const scrollToTop = () => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  return (
    <footer className="bg-[#030712] border-t border-white/10 text-zinc-400 relative overflow-hidden">
      {/* Footer Top Section */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-10">
          {/* Brand Info Column (2 cols) */}
          <div className="lg:col-span-2 space-y-4">
            <Link to="/" className="flex items-center gap-3 group inline-flex">
              <div className="flex items-center justify-center w-9 h-9 rounded-xl bg-gradient-to-br from-orange-500 via-amber-600 to-red-600 p-[1px] shadow-lg shadow-orange-500/20">
                <div className="w-full h-full bg-[#090d16] rounded-[11px] flex items-center justify-center">
                  <Flame className="w-4 h-4 text-orange-500 fill-orange-500/20" />
                </div>
              </div>
              <span className="font-extrabold text-xl tracking-tight text-white font-mono">
                AGNI
              </span>
              <span className="px-1.5 py-0.5 text-[10px] font-mono font-semibold rounded bg-orange-500/10 text-orange-400 border border-orange-500/30">
                MCP
              </span>
            </Link>

            <p className="text-xs sm:text-sm text-zinc-400 max-w-sm leading-relaxed">
              The neutral, high-performance deploy target built for AI coding assistants. Deploy apps with hardware-isolated Firecracker microVMs in sub-seconds using a single MCP call.
            </p>

            {/* Open Source Status Pill */}
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg bg-zinc-900 border border-zinc-800 text-xs text-zinc-300">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
              </span>
              <span>100% Open Source &bull; Apache 2.0</span>
            </div>
          </div>

          {/* Column 1: Product */}
          <div className="space-y-3">
            <h4 className="text-xs font-mono font-bold text-white uppercase tracking-wider">
              Product
            </h4>
            <ul className="space-y-2 text-xs">
              <li>
                <a href="#features" className="hover:text-orange-400 transition-colors">
                  Features Overview
                </a>
              </li>
              <li>
                <a href="#architecture" className="hover:text-orange-400 transition-colors">
                  Firecracker Architecture
                </a>
              </li>
              <li>
                <a href="#demo" className="hover:text-orange-400 transition-colors">
                  Interactive Agent Simulator
                </a>
              </li>
              <li>
                <a href="#mcp-standard" className="hover:text-orange-400 transition-colors">
                  MCP Protocol Specs
                </a>
              </li>
            </ul>
          </div>

          {/* Column 2: Integrations */}
          <div className="space-y-3">
            <h4 className="text-xs font-mono font-bold text-white uppercase tracking-wider">
              Integrations
            </h4>
            <ul className="space-y-2 text-xs">
              <li>
                <a
                  href="https://cursor.com"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="hover:text-orange-400 transition-colors inline-flex items-center gap-1"
                >
                  <span>Cursor Extension</span>
                  <ExternalLink className="w-3 h-3 text-zinc-600" />
                </a>
              </li>
              <li>
                <a
                  href="https://claude.ai"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="hover:text-orange-400 transition-colors inline-flex items-center gap-1"
                >
                  <span>Claude Code Plugin</span>
                  <ExternalLink className="w-3 h-3 text-zinc-600" />
                </a>
              </li>
              <li>
                <a
                  href="https://codeium.com/windsurf"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="hover:text-orange-400 transition-colors inline-flex items-center gap-1"
                >
                  <span>Windsurf Cascade</span>
                  <ExternalLink className="w-3 h-3 text-zinc-600" />
                </a>
              </li>
              <li>
                <a
                  href="https://modelcontextprotocol.io"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="hover:text-orange-400 transition-colors inline-flex items-center gap-1"
                >
                  <span>Official MCP Standard</span>
                  <ExternalLink className="w-3 h-3 text-zinc-600" />
                </a>
              </li>
            </ul>
          </div>

          {/* Column 3: Ecosystem */}
          <div className="space-y-3">
            <h4 className="text-xs font-mono font-bold text-white uppercase tracking-wider">
              Ecosystem
            </h4>
            <ul className="space-y-2 text-xs">
              <li>
                <a
                  href="https://github.com/indralab/agni"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="hover:text-orange-400 transition-colors inline-flex items-center gap-1.5"
                >
                  <Github className="w-3.5 h-3.5" />
                  <span>GitHub Repository</span>
                </a>
              </li>
              <li>
                <Link to="/login" className="hover:text-orange-400 transition-colors">
                  Developer Dashboard
                </Link>
              </li>
              <li>
                <Link to="/register" className="hover:text-orange-400 transition-colors">
                  Create Account
                </Link>
              </li>
              <li>
                <span className="text-zinc-500 font-mono text-[11px]">
                  Version v0.1.0-beta
                </span>
              </li>
            </ul>
          </div>
        </div>
      </div>

      {/* Bottom Legal & Scroll Top Bar */}
      <div className="border-t border-white/10 bg-[#060a12] py-6">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-4">
          <p className="text-xs text-zinc-500 font-mono">
            &copy; {new Date().getFullYear()} Agni Platform. Built for the AI-Native developer ecosystem.
          </p>

          <div className="flex items-center gap-4">
            <button
              onClick={scrollToTop}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 text-xs text-zinc-300 transition-all hover:text-white"
            >
              <span>Back to top</span>
              <ArrowUp className="w-3.5 h-3.5 text-orange-400" />
            </button>
          </div>
        </div>
      </div>
    </footer>
  );
}
