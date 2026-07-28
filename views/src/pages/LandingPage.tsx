import { Link } from 'react-router-dom';
import { Navbar } from '@/components/landing/Navbar';
import { Hero } from '@/components/landing/Hero';
import { TerminalDemo } from '@/components/landing/TerminalDemo';
import { Architecture } from '@/components/landing/Architecture';
import { Features } from '@/components/landing/Features';
import { Footer } from '@/components/landing/Footer';
import {
  Sparkles,
  ArrowRight,
  ShieldCheck,
  Terminal,
  Code2,
  Lock,
  Cpu,
  Layers,
  Flame,
  CheckCircle2,
} from 'lucide-react';

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-[#030712] text-zinc-100 selection:bg-orange-500 selection:text-black font-sans antialiased overflow-x-hidden">
      {/* Fixed Header Navbar */}
      <Navbar />

      {/* Main Content Sections */}
      <main>
        {/* Hero Section */}
        <Hero />

        {/* Interactive Terminal Agent Simulator Demo */}
        <TerminalDemo />

        {/* Architecture Deep Dive */}
        <Architecture />

        {/* MCP Protocol Standard Section */}
        <section id="mcp-standard" className="py-24 bg-[#090d16] border-t border-b border-white/10 relative overflow-hidden">
          {/* Subtle background glow */}
          <div className="absolute top-1/2 left-1/4 w-[500px] h-[500px] bg-gradient-to-r from-orange-600/10 to-purple-600/10 rounded-full blur-[140px] pointer-events-none" />

          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">
              {/* Left Column: Information (6 cols) */}
              <div className="lg:col-span-6 space-y-6">
                <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-orange-500/10 border border-orange-500/20 text-orange-400 text-xs font-mono">
                  <Code2 className="w-3.5 h-3.5" />
                  <span>Standardized AI Protocol</span>
                </div>

                <h2 className="text-3xl sm:text-5xl font-extrabold text-white tracking-tight leading-tight">
                  Built natively on the{' '}
                  <span className="bg-gradient-to-r from-orange-400 via-amber-300 to-yellow-400 bg-clip-text text-transparent">
                    Model Context Protocol
                  </span>
                </h2>

                <p className="text-zinc-300 text-base sm:text-lg leading-relaxed">
                  Agni is not just another dashboard with a web UI—it exposes a pure MCP server interface. Your AI coding agent gets structured tools, resources, and live prompt contexts out of the box.
                </p>

                <div className="space-y-3 pt-2">
                  <div className="flex items-start gap-3 p-3 rounded-xl bg-[#030712] border border-white/10">
                    <CheckCircle2 className="w-5 h-5 text-orange-400 shrink-0 mt-0.5" />
                    <div>
                      <h4 className="text-sm font-bold text-white">Tool: agni_deploy_app</h4>
                      <p className="text-xs text-zinc-400">
                        Tarballs workspace, builds OCI image, provisions Kata Firecracker Pod in k3s.
                      </p>
                    </div>
                  </div>

                  <div className="flex items-start gap-3 p-3 rounded-xl bg-[#030712] border border-white/10">
                    <CheckCircle2 className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
                    <div>
                      <h4 className="text-sm font-bold text-white">Resource: agni://deployments</h4>
                      <p className="text-xs text-zinc-400">
                        Query active MicroVM instances, vCPU/RAM metrics, and cert-manager TLS statuses.
                      </p>
                    </div>
                  </div>

                  <div className="flex items-start gap-3 p-3 rounded-xl bg-[#030712] border border-white/10">
                    <CheckCircle2 className="w-5 h-5 text-purple-400 shrink-0 mt-0.5" />
                    <div>
                      <h4 className="text-sm font-bold text-white">Tool: agni_generate_magic_link</h4>
                      <p className="text-xs text-zinc-400">
                        Creates an instant authenticated preview link for human code reviewers.
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Right Column: Code Snippet Card (6 cols) */}
              <div className="lg:col-span-6">
                <div className="bg-[#030712] border border-orange-500/30 rounded-2xl overflow-hidden shadow-2xl">
                  {/* Header */}
                  <div className="bg-[#090d16] px-4 py-3 border-b border-white/10 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="w-3 h-3 rounded-full bg-red-500/80" />
                      <div className="w-3 h-3 rounded-full bg-yellow-500/80" />
                      <div className="w-3 h-3 rounded-full bg-green-500/80" />
                      <span className="text-xs font-mono text-zinc-400 ml-2">
                        agni-mcp-schema.json
                      </span>
                    </div>
                    <span className="text-[10px] font-mono text-orange-400 bg-orange-500/10 px-2 py-0.5 rounded border border-orange-500/20">
                      JSON-RPC 2.0
                    </span>
                  </div>

                  {/* Schema Snippet */}
                  <div className="p-5 font-mono text-xs text-zinc-300 overflow-x-auto space-y-1">
                    <p className="text-zinc-500">// Agni MCP Tool Definition</p>
                    <p><span className="text-purple-400">"name"</span>: <span className="text-amber-300">"agni_deploy_app"</span>,</p>
                    <p><span className="text-purple-400">"description"</span>: <span className="text-green-300">"Deploy an application into a Kata Firecracker MicroVM on k3s with TLS and magic link auth"</span>,</p>
                    <p><span className="text-purple-400">"inputSchema"</span>: &#123;</p>
                    <p className="pl-4"><span className="text-purple-400">"type"</span>: <span className="text-amber-300">"object"</span>,</p>
                    <p className="pl-4"><span className="text-purple-400">"properties"</span>: &#123;</p>
                    <p className="pl-8"><span className="text-purple-400">"path"</span>: &#123; <span className="text-purple-400">"type"</span>: <span className="text-amber-300">"string"</span>, <span className="text-purple-400">"description"</span>: <span className="text-zinc-400">"Path to workspace root"</span> &#125;,</p>
                    <p className="pl-8"><span className="text-purple-400">"port"</span>: &#123; <span className="text-purple-400">"type"</span>: <span className="text-amber-300">"number"</span>, <span className="text-purple-400">"default"</span>: <span className="text-orange-400">3000</span> &#125;,</p>
                    <p className="pl-8"><span className="text-purple-400">"runtime"</span>: &#123; <span className="text-purple-400">"type"</span>: <span className="text-amber-300">"string"</span>, <span className="text-purple-400">"enum"</span>: [<span className="text-amber-300">"kata-fc"</span>, <span className="text-amber-300">"gvisor"</span>] &#125;</p>
                    <p className="pl-4">&#125;,</p>
                    <p className="pl-4"><span className="text-purple-400">"required"</span>: [<span className="text-amber-300">"path"</span>]</p>
                    <p>&#125;</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Feature Cards Grid */}
        <Features />

        {/* Bottom CTA Banner */}
        <section className="py-20 bg-[#030712] relative overflow-hidden border-t border-white/10">
          <div className="absolute inset-0 bg-gradient-to-r from-orange-600/20 via-amber-600/10 to-purple-600/20 blur-3xl opacity-30 pointer-events-none" />

          <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10 text-center space-y-6">
            <div className="inline-flex items-center justify-center p-3 rounded-2xl bg-orange-500/10 border border-orange-500/30 text-orange-400 mb-2">
              <Flame className="w-8 h-8 fill-orange-500/20" />
            </div>

            <h2 className="text-3xl sm:text-5xl font-extrabold text-white tracking-tight">
              Ready to Give Your AI Agents a <span className="text-orange-400">Production Deploy Target</span>?
            </h2>

            <p className="text-zinc-400 text-base sm:text-lg max-w-2xl mx-auto">
              Start hosting agent deployments with Kata Firecracker microVM isolation and instant magic links today.
            </p>

            <div className="pt-4 flex flex-col sm:flex-row items-center justify-center gap-4">
              <Link
                to="/register"
                className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-8 py-4 text-base font-bold text-black bg-gradient-to-r from-orange-400 via-amber-400 to-yellow-400 hover:from-orange-300 hover:to-amber-300 rounded-xl shadow-xl shadow-orange-500/30 transition-all hover:scale-[1.03]"
              >
                <Sparkles className="w-5 h-5 fill-black/20" />
                <span>Get Started Free</span>
                <ArrowRight className="w-5 h-5" />
              </Link>

              <a
                href="https://github.com/indralab/agni"
                target="_blank"
                rel="noopener noreferrer"
                className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-8 py-4 text-base font-semibold text-white bg-zinc-900 hover:bg-zinc-800 border border-zinc-700 rounded-xl transition-all"
              >
                <span>Star on GitHub</span>
              </a>
            </div>
          </div>
        </section>
      </main>

      {/* Footer */}
      <Footer />
    </div>
  );
}
