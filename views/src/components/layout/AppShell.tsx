import { useNavigate, Link, Outlet } from 'react-router-dom';
import {
  Moon,
  Sun,
  LogOut,
  Settings,
  Shield,
  ExternalLink,
} from 'lucide-react';
import { SidebarInset, SidebarProvider } from '@/components/ui/sidebar';
import { Button } from '@/components/ui/button';
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
