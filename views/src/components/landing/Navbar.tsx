import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Flame, Menu, X, ArrowRight, LayoutDashboard, LogIn, Sparkles, BookOpen } from 'lucide-react';
import { useAuth } from '@/contexts/auth';

export function Navbar() {
  const { isAuthenticated } = useAuth();
  const [scrolled, setScrolled] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 20);
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const navLinks = [
    { name: 'How It Works', href: '#how-it-works' },
    { name: 'Features', href: '#features' },
    { name: 'AI Connect', href: '#ai-connect' },
    { name: 'Interactive Demo', href: '#demo' },
  ];

  const handleScrollTo = (e: React.MouseEvent<HTMLAnchorElement>, href: string) => {
    e.preventDefault();
    setMobileMenuOpen(false);
    const target = document.querySelector(href);
    if (target) {
      target.scrollIntoView({ behavior: 'smooth' });
    }
  };

  return (
    <header
      className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
        scrolled
          ? 'bg-background/85 backdrop-blur-md border-b border-border shadow-lg py-3'
          : 'bg-transparent py-5 border-b border-border/40'
      }`}
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex items-center justify-between">
        {/* Brand Logo */}
        <Link to="/" className="flex items-center gap-3 group">
          <div className="relative flex items-center justify-center w-10 h-10 rounded-xl bg-gradient-to-br from-orange-500 via-amber-600 to-red-600 p-[1px] shadow-lg shadow-orange-500/20 group-hover:shadow-orange-500/40 transition-all duration-300">
            <div className="w-full h-full bg-card rounded-[11px] flex items-center justify-center transition-colors group-hover:bg-muted">
              <Flame className="w-5 h-5 text-orange-500 fill-orange-500/20 group-hover:scale-110 transition-transform duration-300" />
            </div>
          </div>
          <div className="flex flex-col">
            <div className="flex items-center gap-2">
              <span className="font-extrabold text-xl tracking-tight text-foreground font-mono">
                AGNI
              </span>
              <span className="px-1.5 py-0.5 text-[10px] font-mono font-semibold rounded bg-orange-500/10 text-orange-500 border border-orange-500/30">
                MCP
              </span>
            </div>
            <span className="text-[10px] text-muted-foreground font-mono hidden sm:inline-block -mt-1">
              v0.1.0-beta
            </span>
          </div>
        </Link>

        {/* Desktop Navigation Links */}
        <nav className="hidden md:flex items-center gap-1 bg-card/80 p-1.5 rounded-full border border-border backdrop-blur-md shadow-sm">
          {navLinks.map((link) => (
            <a
              key={link.name}
              href={link.href}
              onClick={(e) => handleScrollTo(e, link.href)}
              className="px-4 py-1.5 text-xs font-medium text-muted-foreground hover:text-foreground hover:bg-muted rounded-full transition-all duration-200"
            >
              {link.name}
            </a>
          ))}
        </nav>

        {/* Right CTA Actions */}
        <div className="hidden sm:flex items-center gap-3">
          <a
            href="https://docs.agni.dev"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-2 px-3.5 py-1.5 text-xs font-medium text-muted-foreground hover:text-foreground bg-secondary/80 hover:bg-secondary rounded-lg border border-border transition-all duration-200"
          >
            <BookOpen className="w-3.5 h-3.5 text-orange-500" />
            <span>Documentation</span>
          </a>

          {isAuthenticated ? (
            <Link
              to="/dashboard"
              className="flex items-center gap-2 px-4 py-2 text-xs font-semibold text-white bg-gradient-to-r from-orange-500 to-amber-600 hover:from-orange-600 hover:to-amber-700 rounded-lg shadow-md shadow-orange-500/25 transition-all duration-200 hover:scale-[1.02]"
            >
              <LayoutDashboard className="w-3.5 h-3.5" />
              <span>Open Dashboard</span>
            </Link>
          ) : (
            <div className="flex items-center gap-2">
              <Link
                to="/login"
                className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-muted-foreground hover:text-foreground hover:bg-muted rounded-lg transition-all"
              >
                <LogIn className="w-3.5 h-3.5" />
                <span>Sign In</span>
              </Link>

              <Link
                to="/register"
                className="flex items-center gap-1.5 px-4 py-1.5 text-xs font-semibold text-white bg-gradient-to-r from-orange-500 via-amber-600 to-red-600 hover:from-orange-600 hover:to-red-700 rounded-lg shadow-lg shadow-orange-500/20 transition-all duration-200 hover:scale-[1.02]"
              >
                <Sparkles className="w-3.5 h-3.5 fill-white/20" />
                <span>Deploy Now</span>
                <ArrowRight className="w-3 h-3 ml-0.5" />
              </Link>
            </div>
          )}
        </div>

        {/* Mobile menu button */}
        <div className="flex md:hidden items-center gap-2">
          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="p-2 text-muted-foreground hover:text-foreground bg-muted rounded-lg border border-border"
            aria-label="Toggle menu"
          >
            {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        </div>
      </div>

      {/* Mobile Drawer */}
      {mobileMenuOpen && (
        <div className="md:hidden bg-card border-b border-border px-4 pt-3 pb-6 space-y-3 mt-2">
          <div className="flex flex-col space-y-2">
            {navLinks.map((link) => (
              <a
                key={link.name}
                href={link.href}
                onClick={(e) => handleScrollTo(e, link.href)}
                className="px-3 py-2 text-sm font-medium text-muted-foreground hover:text-foreground hover:bg-muted rounded-lg"
              >
                {link.name}
              </a>
            ))}
          </div>

          <div className="pt-3 border-t border-border flex flex-col gap-2">
            <a
              href="https://docs.agni.dev"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center justify-center gap-2 py-2 text-xs font-medium text-muted-foreground bg-muted rounded-lg border border-border"
            >
              <BookOpen className="w-4 h-4 text-orange-500" />
              <span>Read Documentation</span>
            </a>

            {isAuthenticated ? (
              <Link
                to="/dashboard"
                className="flex items-center justify-center gap-2 py-2.5 text-xs font-semibold text-white bg-orange-600 rounded-lg"
              >
                <LayoutDashboard className="w-4 h-4" />
                <span>Open Dashboard</span>
              </Link>
            ) : (
              <div className="grid grid-cols-2 gap-2 pt-1">
                <Link
                  to="/login"
                  className="flex items-center justify-center py-2 text-xs font-medium text-muted-foreground bg-muted rounded-lg border border-border"
                >
                  Sign In
                </Link>
                <Link
                  to="/register"
                  className="flex items-center justify-center py-2 text-xs font-semibold text-white bg-gradient-to-r from-orange-500 to-amber-600 rounded-lg"
                >
                  Deploy Now
                </Link>
              </div>
            )}
          </div>
        </div>
      )}
    </header>
  );
}
