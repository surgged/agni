import { Link, Navigate } from 'react-router-dom';
import { Sun, Moon, Sparkles, ShieldCheck, Terminal, Laptop } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { RegisterForm } from '@/components/auth/RegisterForm';
import { useTheme } from '@/components/theme-provider';
import { useAuth } from '@/contexts/auth';
import { Logo } from '@/components/ui/Logo';

export default function Register() {
  const { theme, setTheme } = useTheme();
  const { isAuthenticated, isLoading } = useAuth();

  if (isLoading) return null;
  if (isAuthenticated) return <Navigate to="/" replace />;

  return (
    <div className="min-h-screen w-full flex flex-col md:flex-row bg-background">
      {/* Left Panel - Brand / Marketing */}
      <div className="hidden md:flex flex-1 flex-col justify-center px-12 lg:px-24 bg-muted/50 relative overflow-hidden">
        {/* Glow effect */}
        <div className="absolute top-1/3 left-1/4 w-[500px] h-[500px] bg-gradient-to-tr from-orange-500/15 via-amber-500/10 to-purple-500/10 rounded-full blur-[140px] pointer-events-none" />

        <div className="max-w-md relative z-10">
          <div className="mb-8">
            <Logo size="lg" showText={false} />
          </div>
          <h1 className="text-4xl lg:text-5xl font-extrabold tracking-tight mb-4">
            Get started with{' '}
            <span className="bg-gradient-to-r from-orange-500 via-amber-500 to-yellow-500 bg-clip-text text-transparent">
              Agni
            </span>
          </h1>
          <p className="text-muted-foreground text-base lg:text-lg leading-relaxed">
            High-performance Kata MicroVM orchestrator and agent workspace.
            Create your account to launch hardware-isolated micro-sandboxes and deploy apps.
          </p>

          {/* Feature highlights */}
          <div className="mt-8 space-y-3">
            <div className="flex items-center gap-3 p-3.5 rounded-xl bg-background/60 border border-border">
              <Terminal className="size-5 text-orange-500 shrink-0" />
              <div>
                <span className="text-sm font-semibold">MCP Agent Integration</span>
                <p className="text-xs text-muted-foreground">Connect AI assistants directly via Model Context Protocol</p>
              </div>
            </div>
            <div className="flex items-center gap-3 p-3.5 rounded-xl bg-background/60 border border-border">
              <ShieldCheck className="size-5 text-emerald-500 shrink-0" />
              <div>
                <span className="text-sm font-semibold">Hardware-Isolated Sandboxes</span>
                <p className="text-xs text-muted-foreground">Kata MicroVM security with 420ms cold boot</p>
              </div>
            </div>
            <div className="flex items-center gap-3 p-3.5 rounded-xl bg-background/60 border border-border">
              <Sparkles className="size-5 text-amber-500 shrink-0" />
              <div>
                <span className="text-sm font-semibold">Instant Deployment</span>
                <p className="text-xs text-muted-foreground">Sub-second app launches with shareable HTTPS links</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Right Panel - Register Form */}
      <div className="flex-1 flex flex-col justify-center items-center px-6 py-12 relative">
        {/* Theme Toggle */}
        <Button
          variant="ghost"
          size="icon"
          className="absolute top-6 right-6"
          onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
        >
          <Sun className="size-5 rotate-0 scale-100 transition-all dark:-rotate-90 dark:scale-0" />
          <Moon className="absolute size-5 rotate-90 scale-0 transition-all dark:rotate-0 dark:scale-100" />
          <span className="sr-only">Toggle theme</span>
        </Button>

        {/* Mobile Brand Header */}
        <div className="md:hidden flex flex-col items-center mb-8">
          <Logo size="lg" showText={false} />
          <h1 className="text-2xl font-extrabold mt-3 bg-gradient-to-r from-orange-500 via-amber-500 to-yellow-500 bg-clip-text text-transparent">
            Agni Cloud Platform
          </h1>
        </div>

        {/* Register Form */}
        <RegisterForm />

        {/* Footer */}
        <div className="flex items-center justify-between text-xs text-muted-foreground mt-6 w-full max-w-md px-2">
          <div className="flex items-center gap-1.5">
            <Laptop className="size-3.5 text-orange-500" />
            <span>Agni Engine v0.1.0 • Kata MicroVMs</span>
          </div>
          <a
            href="https://github.com/indralab/agni"
            target="_blank"
            rel="noreferrer"
            className="hover:underline hover:text-foreground"
          >
            GitHub Repository
          </a>
        </div>

        {/* Login Link */}
        <p className="mt-4 text-sm text-muted-foreground">
          Already have an account?{' '}
          <Link to="/login" className="text-orange-500 hover:text-orange-600 font-medium">
            Sign in
          </Link>
        </p>
      </div>
    </div>
  );
}
