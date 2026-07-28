import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Flame, Menu, X, ArrowRight, LayoutDashboard, LogIn, Sparkles, BookOpen } from 'lucide-react';
import { GithubIcon } from '@/components/icons/GithubIcon';
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
    { name: 'Features', href: '#features' },
    { name: 'Architecture', href: '#architecture' },
    { name: 'MCP Standard', href: '#mcp-standard' },
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
          ? 'bg-[#030712]/85 backdrop-blur-md border-b border-white/10 shadow-2xl shadow-orange-950/20 py-3'
          : 'bg-transparent py-5 border-b border-white/5'
      }`}
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex items-center justify-between">
        {/* Brand Logo */}
        <Link to="/" className="flex items-center gap-3 group">
          <div className="relative flex items-center justify-center w-10 h-10 rounded-xl bg-gradient-to-br from-orange-500 via-amber-600 to-red-600 p-[1px] shadow-lg shadow-orange-500/20 group-hover:shadow-orange-500/40 transition-all duration-300">
            <div className="w-full h-full bg-[#090d16] rounded-[11px] flex items-center justify-center transition-colors group-hover:bg-[#0d1220]">
              <Flame className="w-5 h-5 text-orange-500 fill-orange-500/20 group-hover:scale-110 transition-transform duration-300" />
            </div>
          </div>
          <div className="flex flex-col">
            <div className="flex items-center gap-2">
              <span className="font-extrabold text-xl tracking-tight text-white font-mono">
                AGNI
              </span>
              <span className="px-1.5 py-0.5 text-[10px] font-mono font-semibold rounded bg-orange-500/10 text-orange-400 border border-orange-500/30">
                MCP
              </span>
            </div>
            <span className="text-[10px] text-zinc-400 font-mono hidden sm:inline-block -mt-1">
              v0.1.0-beta
            </span>
          </div>
        </Link>

        {/* Desktop Navigation Links */}
        <nav className="hidden md:flex items-center gap-1 bg-[#090d16]/80 p-1.5 rounded-full border border-white/10 backdrop-blur-md">
          {navLinks.map((link) => (
            <a
              key={link.name}
              href={link.href}
              onClick={(e) => handleScrollTo(e, link.href)}
              className="px-4 py-1.5 text-xs font-medium text-zinc-300 hover:text-white hover:bg-white/5 rounded-full transition-all duration-200"
            >
              {link.name}
            </a>
          ))}
        </nav>

        {/* Right CTA Actions */}
        <div className="hidden sm:flex items-center gap-3">
          <a
            href="https://github.com/indralab/agni"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-2 px-3 py-1.5 text-xs font-medium text-zinc-300 hover:text-white bg-zinc-900/80 hover:bg-zinc-800 rounded-lg border border-zinc-700/60 transition-all duration-200"
          >
            <GithubIcon className="w-3.5 h-3.5" />
            <span>GitHub</span>
            <span className="px-1.5 py-0.2 rounded bg-zinc-800 text-[10px] text-amber-400 font-mono">
              ★ 1.4k
            </span>
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
                className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-zinc-300 hover:text-white hover:bg-white/5 rounded-lg transition-all"
              >
                <LogIn className="w-3.5 h-3.5" />
                <span>Sign In</span>
              </Link>

              <Link
                to="/register"
                className="flex items-center gap-1.5 px-4 py-1.5 text-xs font-semibold text-black bg-gradient-to-r from-orange-400 to-amber-400 hover:from-orange-300 hover:to-amber-300 rounded-lg shadow-lg shadow-orange-500/20 transition-all duration-200 hover:scale-[1.02]"
              >
                <Sparkles className="w-3.5 h-3.5 fill-black/20" />
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
            className="p-2 text-zinc-400 hover:text-white bg-zinc-900/60 rounded-lg border border-zinc-800"
            aria-label="Toggle menu"
          >
            {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        </div>
      </div>

      {/* Mobile Drawer */}
      {mobileMenuOpen && (
        <div className="md:hidden bg-[#090d16] border-b border-white/10 px-4 pt-3 pb-6 space-y-3 mt-2">
          <div className="flex flex-col space-y-2">
            {navLinks.map((link) => (
              <a
                key={link.name}
                href={link.href}
                onClick={(e) => handleScrollTo(e, link.href)}
                className="px-3 py-2 text-sm font-medium text-zinc-300 hover:text-white hover:bg-white/5 rounded-lg"
              >
                {link.name}
              </a>
            ))}
          </div>

          <div className="pt-3 border-t border-white/10 flex flex-col gap-2">
            <a
              href="https://github.com/indralab/agni"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center justify-center gap-2 py-2 text-xs font-medium text-zinc-300 bg-zinc-900 rounded-lg border border-zinc-800"
            >
              <GithubIcon className="w-4 h-4" />
              <span>View Source on GitHub</span>
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
                  className="flex items-center justify-center py-2 text-xs font-medium text-zinc-300 bg-zinc-900 rounded-lg border border-zinc-800"
                >
                  Sign In
                </Link>
                <Link
                  to="/register"
                  className="flex items-center justify-center py-2 text-xs font-semibold text-black bg-gradient-to-r from-orange-400 to-amber-400 rounded-lg"
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
