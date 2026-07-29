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
  Code2,
  Flame,
  CheckCircle2,
} from 'lucide-react';

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-background text-foreground selection:bg-orange-500 selection:text-white font-sans antialiased overflow-x-hidden">
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
        <section id="ai-connect" className="py-24 bg-card border-t border-b border-border relative overflow-hidden">
          {/* Subtle background glow */}
          <div className="absolute top-1/2 left-1/4 w-[500px] h-[500px] bg-gradient-to-r from-orange-500/10 to-purple-500/10 rounded-full blur-[140px] pointer-events-none" />

          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">
              {/* Left Column: Information (6 cols) */}
              <div className="lg:col-span-6 space-y-6">
                <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-orange-500/10 border border-orange-500/20 text-orange-500 text-xs font-mono">
                  <Code2 className="w-3.5 h-3.5" />
                  <span>Direct AI Assistant Integration</span>
                </div>

                <h2 className="text-3xl sm:text-5xl font-extrabold text-foreground tracking-tight leading-tight">
                  Works Directly With Your Favorite{' '}
                  <span className="bg-gradient-to-r from-orange-500 via-amber-500 to-yellow-500 bg-clip-text text-transparent">
                    AI Coding Assistants
                  </span>
                </h2>

                <p className="text-muted-foreground text-base sm:text-lg leading-relaxed">
                  Agni connects to AI tools using the universal Model Context Protocol (MCP). Your AI coding helpers can deploy, test, and update your apps automatically without you ever leaving your code editor.
                </p>

                <div className="space-y-3 pt-2">
                  <div className="flex items-start gap-3 p-3.5 rounded-xl bg-background border border-border">
                    <CheckCircle2 className="w-5 h-5 text-orange-500 shrink-0 mt-0.5" />
                    <div>
                      <h4 className="text-sm font-bold text-foreground">Launch Apps from Chat</h4>
                      <p className="text-xs text-muted-foreground">
                        Tell your AI: "Deploy my app", and Agni packages and launches it instantly.
                      </p>
                    </div>
                  </div>

                  <div className="flex items-start gap-3 p-3.5 rounded-xl bg-background border border-border">
                    <CheckCircle2 className="w-5 h-5 text-amber-500 shrink-0 mt-0.5" />
                    <div>
                      <h4 className="text-sm font-bold text-foreground">Live App Monitoring</h4>
                      <p className="text-xs text-muted-foreground">
                        Your AI can check memory usage, server status, and live error logs automatically.
                      </p>
                    </div>
                  </div>

                  <div className="flex items-start gap-3 p-3.5 rounded-xl bg-background border border-border">
                    <CheckCircle2 className="w-5 h-5 text-purple-500 shrink-0 mt-0.5" />
                    <div>
                      <h4 className="text-sm font-bold text-foreground">1-Click Share Links</h4>
                      <p className="text-xs text-muted-foreground">
                        Generate secure magic links for friends or code reviewers with custom expiration.
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Right Column: Code Snippet Card (6 cols) */}
              <div className="lg:col-span-6">
                <div className="bg-background border border-orange-500/30 rounded-2xl overflow-hidden shadow-xl">
                  {/* Header */}
                  <div className="bg-muted px-4 py-3 border-b border-border flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="w-3 h-3 rounded-full bg-red-500/80" />
                      <div className="w-3 h-3 rounded-full bg-yellow-500/80" />
                      <div className="w-3 h-3 rounded-full bg-green-500/80" />
                      <span className="text-xs font-mono text-muted-foreground ml-2">
                        agni-ai-connector.json
                      </span>
                    </div>
                    <span className="text-[10px] font-mono text-orange-500 bg-orange-500/10 px-2 py-0.5 rounded border border-orange-500/20">
                      Standard MCP Format
                    </span>
                  </div>

                  {/* Schema Snippet */}
                  <div className="p-5 font-mono text-xs text-foreground overflow-x-auto space-y-1">
                    <p className="text-muted-foreground">// How your AI assistant talks to Agni</p>
                    <p><span className="text-purple-500">"name"</span>: <span className="text-amber-500">"agni_deploy_app"</span>,</p>
                    <p><span className="text-purple-500">"description"</span>: <span className="text-green-500">"Deploys your app into a secure micro-sandbox with a live HTTPS link"</span>,</p>
                    <p><span className="text-purple-500">"input"</span>: &#123;</p>
                    <p className="pl-4"><span className="text-purple-500">"project_path"</span>: <span className="text-amber-500">"./my-app"</span>,</p>
                    <p className="pl-4"><span className="text-purple-500">"port"</span>: <span className="text-orange-500">3000</span>,</p>
                    <p className="pl-4"><span className="text-purple-500">"security_lock"</span>: <span className="text-purple-500">true</span></p>
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
        <section className="py-20 bg-background relative overflow-hidden border-t border-border">
          <div className="absolute inset-0 bg-gradient-to-r from-orange-500/10 via-amber-500/10 to-purple-500/10 blur-3xl opacity-30 pointer-events-none" />

          <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10 text-center space-y-6">
            <div className="inline-flex items-center justify-center p-3 rounded-2xl bg-orange-500/10 border border-orange-500/30 text-orange-500 mb-2">
              <Flame className="w-8 h-8 fill-orange-500/20" />
            </div>

            <h2 className="text-3xl sm:text-5xl font-extrabold text-foreground tracking-tight">
              Ready to Give Your AI Assistants an <span className="text-orange-500">Instant Deploy Home</span>?
            </h2>

            <p className="text-muted-foreground text-base sm:text-lg max-w-2xl mx-auto">
              Start launching apps with micro-sandbox security and instant share links today.
            </p>

            <div className="pt-4 flex flex-col sm:flex-row items-center justify-center gap-4">
              <Link
                to="/register"
                className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-8 py-4 text-base font-bold text-white bg-gradient-to-r from-orange-500 via-amber-600 to-amber-600 hover:from-orange-600 hover:to-amber-700 rounded-xl shadow-xl shadow-orange-500/25 transition-all hover:scale-[1.03]"
              >
                <Sparkles className="w-5 h-5 fill-white/20" />
                <span>Get Started Free</span>
                <ArrowRight className="w-5 h-5" />
              </Link>
            </div>
          </div>
        </section>
      </main>

      {/* Footer */}
      <Footer />
    </div>
  );
}
