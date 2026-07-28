import { Link, Navigate } from 'react-router-dom';
import { Moon, Sun } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { LoginForm } from '@/components/auth/LoginForm';
import { useTheme } from '@/components/theme-provider';
import { useAuth } from '@/contexts/auth';

export default function Login() {
  const { theme, setTheme } = useTheme();
  const { isAuthenticated, isLoading } = useAuth();

  if (isLoading) return null;
  if (isAuthenticated) return <Navigate to="/" replace />;

  return (
    <div className="h-screen w-full flex flex-col md:flex-row bg-background">
      {/* Left Panel - Welcome Message */}
      <div className="hidden md:flex flex-1 flex-col justify-center px-12 lg:px-24 bg-muted/50">
        <div className="max-w-md">
          <h1 className="text-5xl font-bold tracking-tight">Welcome back</h1>
          <p className="text-muted-foreground text-lg leading-relaxed mt-4">
            Welcome back to Agni. Your elegant cloud platform for managing
            files, documents, and media seamlessly.
          </p>
        </div>
      </div>

      {/* Right Panel - Login Form */}
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

        {/* Mobile Header */}
        <div className="md:hidden flex flex-col items-center mb-8">
          <div className="size-16 bg-primary/10 rounded-full flex items-center justify-center mb-3">
            <svg
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              className="size-8 text-primary"
            >
              <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z" />
            </svg>
          </div>
          <h2 className="text-2xl font-bold">Agni</h2>
        </div>

        <LoginForm />

        <p className="mt-6 text-sm text-muted-foreground">
          Don't have an account?{' '}
          <Link to="/register" className="text-primary hover:text-primary/80 font-medium">
            Sign up
          </Link>
        </p>
      </div>
    </div>
  );
}
