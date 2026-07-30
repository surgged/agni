import { useNavigate, Link, Outlet } from 'react-router-dom';
import {
  Flame,
  Search,
  Moon,
  Sun,
  Bell,
  BookOpen,
  LogOut,
  Settings,
  Shield,
  ExternalLink,
  Cpu,
} from 'lucide-react';
import { GithubIcon as Github } from '@/components/icons/GithubIcon';
import { SidebarInset, SidebarProvider, SidebarTrigger } from '@/components/ui/sidebar';
import { Separator } from '@/components/ui/separator';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { AppSidebar } from './AppSidebar';
import { BreadcrumbNav } from './BreadcrumbNav';
import { useTheme } from '@/components/theme-provider';
import { useAuth } from '@/contexts/auth';
import { GithubIcon } from '@/components/icons/GithubIcon';
import { toast } from 'sonner';


export function AppShell() {
  const { theme, setTheme } = useTheme();
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const getInitials = (name?: string) => {
    if (!name) return 'AD';
    return name
      .split(' ')
      .map((n) => n[0])
      .join('')
      .substring(0, 2)
      .toUpperCase();
  };

  const handleLogout = () => {
    logout();
    toast.success('Logged out successfully');
    navigate('/login');
  };

  const handleNotificationClick = () => {
    toast.info('Cluster Health Alert', {
      description: 'Node k3s-node-01 is operating at 100% health with Kata MicroVM hypervisor active.',
    });
  };

  return (
    <SidebarProvider>
      <AppSidebar />
      <SidebarInset className="flex flex-col min-h-screen">
        {/* Top Navbar Header */}
        <header className="sticky top-0 z-30 flex h-16 shrink-0 items-center gap-2 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 transition-all">
          <div className="flex items-center gap-3 px-4 w-full">
            {/* Breadcrumb Navigation */}
            <div>
              <BreadcrumbNav />
            </div>

            {/* Right Quick Links & Actions */}
            <div className="ml-auto flex items-center gap-2">
              {/* Search Bar */}
              <div className="hidden md:flex relative w-52 lg:w-64">
                <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
                <Input
                  placeholder="Search apps, microvms... (⌘K)"
                  className="pl-8 h-9 rounded-lg bg-muted/40 border-border/50 text-xs focus-visible:ring-amber-500"
                />
              </div>

              {/* Quick Link: Agni Docs */}
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="size-9 rounded-lg text-muted-foreground hover:text-foreground"
                      asChild
                    >
                      <a href="https://docs.agni.dev" target="_blank" rel="noreferrer">
                        <BookOpen className="size-4" />
                        <span className="sr-only">Documentation</span>
                      </a>
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent side="bottom" className="text-xs">
                    Agni Docs
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>

              {/* Quick Link: GitHub Repo */}
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="size-9 rounded-lg text-muted-foreground hover:text-foreground"
                      asChild
                    >
                      <a href="https://github.com/indralab/agni" target="_blank" rel="noreferrer">
                        <GithubIcon className="size-4" />
                        <span className="sr-only">GitHub Repository</span>
                      </a>
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent side="bottom" className="text-xs">
                    GitHub Repo
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>

              {/* Theme Switcher */}
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="size-9 rounded-lg text-muted-foreground hover:text-foreground"
                      onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
                    >
                      <Sun className="size-4 rotate-0 scale-100 transition-all dark:-rotate-90 dark:scale-0" />
                      <Moon className="absolute size-4 rotate-90 scale-0 transition-all dark:rotate-0 dark:scale-100" />
                      <span className="sr-only">Toggle theme</span>
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent side="bottom" className="text-xs">
                    Switch Theme
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>

              {/* Toast Notification Center Bell */}
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="icon" className="size-9 rounded-lg relative text-muted-foreground hover:text-foreground">
                    <Bell className="size-4" />
                    <span className="absolute top-2 right-2 size-2 rounded-full bg-amber-500 animate-ping" />
                    <span className="absolute top-2 right-2 size-2 rounded-full bg-amber-500" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-80 p-2">
                  <DropdownMenuLabel className="flex items-center justify-between text-xs font-semibold">
                    <span>Notifications & Cluster Status</span>
                    <Badge variant="secondary" className="text-[10px]">3 New</Badge>
                  </DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  <div className="space-y-1 py-1">
                    <DropdownMenuItem className="flex flex-col items-start gap-1 p-2 cursor-pointer" onClick={handleNotificationClick}>
                      <div className="flex items-center gap-1.5 text-xs font-semibold text-emerald-500">
                        <Cpu className="size-3.5" />
                        <span>Kata MicroVM active</span>
                      </div>
                      <p className="text-[11px] text-muted-foreground">
                        MicroVM kata-node-01 initialized with 512MB RAM in 120ms.
                      </p>
                    </DropdownMenuItem>
                    <DropdownMenuItem className="flex flex-col items-start gap-1 p-2 cursor-pointer" onClick={handleNotificationClick}>
                      <div className="flex items-center gap-1.5 text-xs font-semibold text-amber-500">
                        <Shield className="size-3.5" />
                        <span>agni-mcp Connected</span>
                      </div>
                      <p className="text-[11px] text-muted-foreground">
                        Agent token verified from Claude Desktop integration.
                      </p>
                    </DropdownMenuItem>
                  </div>
                </DropdownMenuContent>
              </DropdownMenu>

              {/* User Avatar & Dropdown Menu */}
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" className="relative size-9 rounded-full p-0 ring-2 ring-amber-500/20 hover:ring-amber-500/40">
                    <Avatar className="size-8">
                      {user?.avatar ? <AvatarImage src={user.avatar} alt={user?.name || 'User'} /> : null}
                      <AvatarFallback className="bg-gradient-to-tr from-amber-500 to-orange-600 text-white text-xs font-semibold">
                        {getInitials(user?.name)}
                      </AvatarFallback>
                    </Avatar>
                  </Button>
                </DropdownMenuTrigger>

                <DropdownMenuContent className="w-56" align="end" sideOffset={8}>
                  <DropdownMenuLabel className="font-normal p-3">
                    <div className="flex flex-col space-y-1">
                      <p className="text-sm font-semibold leading-none">{user?.name || 'Agni Developer'}</p>
                      <p className="text-xs leading-none text-muted-foreground">{user?.email || 'dev@agni.io'}</p>
                      <div className="pt-1.5">
                        <Badge variant="outline" className="text-[10px] py-0 px-1.5 border-amber-500/30 text-amber-600 dark:text-amber-400 font-mono">
                          {user?.role || 'Cluster Admin'}
                        </Badge>
                      </div>
                    </div>
                  </DropdownMenuLabel>
                  <DropdownMenuSeparator />

                  <DropdownMenuGroup>
                    <DropdownMenuItem asChild className="cursor-pointer">
                      <Link to="/settings">
                        <Settings className="mr-2 size-4 text-muted-foreground" />
                        <span>Account Settings</span>
                      </Link>
                    </DropdownMenuItem>
                    <DropdownMenuItem asChild className="cursor-pointer">
                      <Link to="/login">
                        <Shield className="mr-2 size-4 text-muted-foreground" />
                        <span>Agent API Tokens</span>
                      </Link>
                    </DropdownMenuItem>
                    <DropdownMenuItem asChild className="cursor-pointer">
                      <a href="https://docs.agni.dev" target="_blank" rel="noreferrer">
                        <ExternalLink className="mr-2 size-4 text-muted-foreground" />
                        <span>Agni Specs & Docs</span>
                      </a>
                    </DropdownMenuItem>
                  </DropdownMenuGroup>

                  <DropdownMenuSeparator />

                  <DropdownMenuItem
                    className="text-destructive focus:bg-destructive/10 focus:text-destructive cursor-pointer font-medium"
                    onClick={handleLogout}
                  >
                    <LogOut className="mr-2 size-4" />
                    <span>Log out</span>
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>
        </header>

        {/* Main View Area */}
        <main className="flex-1 overflow-y-auto">
          <div className="p-4 md:p-6 max-w-7xl mx-auto">
            <Outlet />
          </div>
        </main>
      </SidebarInset>
    </SidebarProvider>
  );
}
