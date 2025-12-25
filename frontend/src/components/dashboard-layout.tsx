import { Link, Outlet, useLocation } from 'react-router-dom';
import { useAuth } from '@/hooks/use-auth';
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarProvider,
  SidebarInset,
  SidebarTrigger,
} from './ui/sidebar';
import { Separator } from './ui/separator';
import { Button } from './ui/button';
import { Building2, LayoutDashboard, Users, LogOut } from 'lucide-react';

const navigation = [
  {
    title: 'Dashboard',
    url: '/',
    icon: LayoutDashboard,
  },
  {
    title: 'Businesses',
    url: '/businesses',
    icon: Building2,
  },
  {
    title: 'Users',
    url: '/users',
    icon: Users,
  },
];

export function DashboardLayout() {
  const location = useLocation();
  const { user, logout } = useAuth();

  return (
    <SidebarProvider>
      <Sidebar>
        <SidebarHeader className='border-b border-sidebar-border'>
          <div className='flex items-center gap-2 px-4 py-4'>
            <div className='flex flex-col'>
              <span className='text-lg font-bold text-black'>Nexar Admin</span>
              <span className='text-xs text-muted-foreground'>
                Billing Control Panel
              </span>
            </div>
          </div>
        </SidebarHeader>
        <SidebarContent>
          <SidebarGroup>
            <SidebarGroupLabel>Navigation</SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                {navigation.map((item) => (
                  <SidebarMenuItem key={item.title}>
                    <SidebarMenuButton
                      asChild
                      isActive={location.pathname === item.url}
                      className='data-[active=true]:bg-blue-500 data-[active=true]:text-white'
                    >
                      <Link to={item.url}>
                        <item.icon className='h-4 w-4' />
                        <span>{item.title}</span>
                      </Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                ))}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        </SidebarContent>
      </Sidebar>
      <SidebarInset>
        <header className='flex h-16 shrink-0 items-center gap-2 border-b border-border px-4 bg-background/95 backdrop-blur supports-backdrop-filter:bg-background/60'>
          <SidebarTrigger className='-ml-1 h-8 w-8' />
          <Separator orientation='vertical' className='h-6' />
          <div className='flex-1' />
          {user && (
            <div className='flex items-center gap-3'>
              <div className='text-right'>
                <p className='text-sm font-medium'>
                  {user.firstName} {user.lastName}
                </p>
                <p className='text-xs text-muted-foreground capitalize'>
                  {user.role.replace('_', ' ')}
                </p>
              </div>
              <Button
                variant='ghost'
                size='icon'
                onClick={logout}
                title='Logout'
              >
                <LogOut className='h-4 w-4' />
              </Button>
            </div>
          )}
        </header>
        <main className='flex-1 overflow-auto p-6 bg-muted/30'>
          <Outlet />
        </main>
      </SidebarInset>
    </SidebarProvider>
  );
}

export default DashboardLayout;
