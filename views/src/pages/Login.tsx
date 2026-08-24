import { Navigate, Link } from 'react-router-dom';
import { Sun, Moon, ShieldCheck, Terminal, Laptop } from 'lucide-react';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useTheme } from '@/components/theme-provider';
import { useAuth } from '@/contexts/auth';
import { Logo } from '@/components/ui/Logo';
import { LoginForm } from '@/components/auth/LoginForm';

export default function Login() {
  const { theme, setTheme } = useTheme();
  const { isAuthenticated, isLoading } = useAuth();

  if (isLoading) return null;
  if (isAuthenticated) return <Navigate to="/dashboard" replace />;

  return (
    <div className="min-h-screen w-full flex flex-col md:flex-row bg-background">
      {/* Left Panel - Brand */}
      <div className="hidden md:flex flex-1 flex-col justify-between p-12 bg-muted/40 relative overflow-hidden">
        <div className="flex items-center gap-3">
          <Logo size="md" showText={false} />
          <span className="font-bold text-xl tracking-tight bg-gradient-to-r from-orange-500 via-amber-500 to-yellow-500 bg-clip-text text-transparent">
            Agni Cloud Platform
          </span>
        </div>

        <div className="space-y-6 max-w-lg z-10">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-orange-500/10 border border-orange-500/20 text-orange-600 dark:text-orange-400 text-xs font-semibold">
            <ShieldCheck className="size-3.5" />
            <span>Secure Cloud Workspace</span>
          </div>

          <h1 className="text-4xl font-extrabold tracking-tight leading-tight">
            Deploy & manage your applications instantly.
          </h1>

          <p className="text-muted-foreground text-sm leading-relaxed">
            Deploy applications instantly with secure shareable links, real-time log streaming, and API integration.
          </p>

          <div className="grid grid-cols-2 gap-4 pt-4">
            <div className="p-4 rounded-2xl bg-card/60 border border-border/50">
              <Terminal className="size-5 text-orange-500 mb-2" />
              <h3 className="font-semibold text-xs">Instant Deploys</h3>
              <p className="text-[11px] text-muted-foreground mt-0.5">Automated build & launch</p>
            </div>
            <div className="p-4 rounded-2xl bg-card/60 border border-border/50">
              <Laptop className="size-5 text-amber-500 mb-2" />
              <h3 className="font-semibold text-xs">Secure Access</h3>
              <p className="text-[11px] text-muted-foreground mt-0.5">Granular share permissions</p>
            </div>
          </div>
        </div>

        <div className="text-xs text-muted-foreground">
          © {new Date().getFullYear()} Agni Platform. All rights reserved.
        </div>
      </div>

      {/* Right Panel - Login Form */}
      <div className="flex-1 flex flex-col justify-between p-6 sm:p-12 relative">
        {/* Theme Toggle */}
        <div className="flex justify-end">
          <Button
            variant="ghost"
            size="icon"
            className="rounded-full"
            onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
          >
            <Sun className="size-5 rotate-0 scale-100 transition-all dark:-rotate-90 dark:scale-0" />
            <Moon className="absolute size-5 rotate-90 scale-0 transition-all dark:rotate-0 dark:scale-100" />
            <span className="sr-only">Toggle theme</span>
          </Button>
        </div>

        {/* Mobile Brand Header */}
        <div className="md:hidden flex flex-col items-center mb-8">
          <Logo size="lg" showText={false} />
          <h1 className="text-2xl font-extrabold mt-3 bg-gradient-to-r from-orange-500 via-amber-500 to-yellow-500 bg-clip-text text-transparent">
            Agni Cloud Platform
          </h1>
        </div>

        {/* Login Card */}
        <div className="w-full max-w-md mx-auto">
          <Card className="rounded-3xl shadow-sm border border-border overflow-hidden">
            <CardHeader className="pb-2 pt-6 px-6 border-b border-border/40 bg-muted/20 text-center">
              <h2 className="text-xl font-bold">Sign In</h2>
              <p className="text-xs text-muted-foreground mt-1">
                Enter your email and password to access your workspace
              </p>
            </CardHeader>

            <CardContent className="p-6">
              <LoginForm hideCard />
            </CardContent>
          </Card>

          <p className="text-center text-xs text-muted-foreground mt-6">
            Don&apos;t have an account?{' '}
            <Link to="/register" className="font-semibold text-orange-500 hover:text-orange-600">
              Create an account
            </Link>
          </p>
        </div>

        <div className="hidden md:block" />
      </div>
    </div>
  );
}
