import {
  Flame,
  Settings2,
  Home,
  LogOut,
  ChevronDown,
} from 'lucide-react';
import { Link, useLocation, useNavigate } from 'react-router-dom';

import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarTrigger,
} from '@/components/ui/sidebar';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { useAuth } from '@/contexts/auth';
import { toast } from 'sonner';

const mainNavItems = [
  {
    title: 'Dashboard',
    url: '/dashboard',
    icon: Home,
  },
  {
    title: 'Settings',
    url: '/settings',
    icon: Settings2,
  },
];

export function AppSidebar() {
  const location = useLocation();
  const navigate = useNavigate();
  const { user, logout } = useAuth();

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
    <Sidebar collapsible="icon" variant="inset">
      <SidebarHeader className="flex flex-row items-center justify-between gap-2 p-2">
        <SidebarMenu className="flex-1">
          <SidebarMenuItem>
            <div className="flex items-center gap-2 px-2 py-1.5">
              <div className="flex aspect-square size-8 items-center justify-center rounded-lg bg-gradient-to-tr from-amber-500 to-orange-600 text-white shadow-sm shrink-0">
                <Flame className="size-4 animate-pulse" />
              </div>
              <div className="flex flex-col gap-0.5 leading-none">
                <span className="font-semibold text-sm">Agni Engine</span>
                <span className="text-[11px] text-muted-foreground">v0.1.0</span>
              </div>
            </div>
          </SidebarMenuItem>
        </SidebarMenu>
        <SidebarTrigger className="text-muted-foreground hover:text-foreground shrink-0" />
      </SidebarHeader>

      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupContent>
            <SidebarMenu>
              {mainNavItems.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton
                    asChild
                    isActive={location.pathname === item.url || (item.url === '/dashboard' && location.pathname === '/')}
                    tooltip={item.title}
                  >
                    <Link to={item.url}>
                      <item.icon className="size-4" />
                      <span>{item.title}</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter>
        <SidebarMenu>
          <SidebarMenuItem>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <SidebarMenuButton
                  size="lg"
                  className="data-[state=open]:bg-sidebar-accent data-[state=open]:text-sidebar-accent-foreground"
                >
                  <Avatar className="h-8 w-8 rounded-lg">
                    {user?.avatar ? <AvatarImage src={user.avatar} alt={user?.name} /> : null}
                    <AvatarFallback className="rounded-lg bg-gradient-to-tr from-amber-500 to-orange-600 text-white text-xs font-semibold">
                      {getInitials(user?.name)}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex flex-col gap-0.5 leading-none">
                    <span className="font-semibold text-sm truncate max-w-[120px]">
                      {user?.name || 'Agni Developer'}
                    </span>
                    <span className="text-xs text-muted-foreground truncate max-w-[120px]">
                      {user?.email || 'dev@agni.io'}
                    </span>
                  </div>
                  <ChevronDown className="ml-auto size-4" />
                </SidebarMenuButton>
              </DropdownMenuTrigger>
              <DropdownMenuContent
                className="w-[--radix-dropdown-menu-trigger-width] min-w-56"
                align="start"
                side="top"
                sideOffset={4}
              >
                <DropdownMenuItem onClick={() => navigate('/settings')}>
                  <Settings2 className="mr-2 size-4 text-muted-foreground" />
                  <span>Account Settings</span>
                </DropdownMenuItem>
                <DropdownMenuItem className="text-destructive font-medium" onClick={handleLogout}>
                  <LogOut className="mr-2 size-4" />
                  <span>Log out</span>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>
    </Sidebar>
  );
}
