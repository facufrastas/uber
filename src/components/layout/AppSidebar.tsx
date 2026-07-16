import { Car, Home, LogOut, Moon, RefreshCw, Sun, SunMoon, TrendingDown, TrendingUp, Wrench } from 'lucide-react';
import { NavLink, useLocation } from 'react-router-dom';
import { toast } from 'sonner';

import { Button } from '@/components/ui/button';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Sidebar, SidebarContent, SidebarFooter, SidebarGroup, SidebarGroupContent, SidebarHeader, SidebarMenu, SidebarMenuButton, SidebarMenuItem, useSidebar } from '@/components/ui/sidebar';
import { useTheme } from '@/components/theme-provider';
import { isLocalDataSource } from '@/data/repositories';
import { useAuthStore } from '@/stores/authStore';
import { useDataStore } from '@/stores/dataStore';

const SECTIONS = [
  { title: 'Inicio', url: '/', icon: Home },
  { title: 'Ingresos', url: '/income', icon: TrendingUp },
  { title: 'Gastos', url: '/expenses', icon: TrendingDown },
  { title: 'Autos', url: '/cars', icon: Car },
  { title: 'Mantenimientos', url: '/maintenance', icon: Wrench },
];

export function AppSidebar() {
  const location = useLocation();
  const { setTheme } = useTheme();
  const resetSeed = useDataStore((s) => s.resetSeed);
  const clearSession = useAuthStore((s) => s.clear);
  const { setOpenMobile } = useSidebar();

  return (
    <Sidebar>
      <SidebarHeader className="px-4 py-3">
        <div className="flex items-center gap-2 font-semibold">
          <Car className="size-5" />
          <span className="text-lg">Uber</span>
        </div>
      </SidebarHeader>
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupContent>
            <SidebarMenu>
              {SECTIONS.map((section) => (
                <SidebarMenuItem key={section.url}>
                  <SidebarMenuButton asChild isActive={location.pathname === section.url}>
                    {/* The query string is preserved so filters follow the
                        user across sections */}
                    <NavLink to={{ pathname: section.url, search: location.search }} onClick={() => setOpenMobile(false)}>
                      <section.icon />
                      <span>{section.title}</span>
                    </NavLink>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
      <SidebarFooter className="gap-2 p-3">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" size="sm" className="justify-start">
              <SunMoon />
              Tema
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent side="top" align="start">
            <DropdownMenuItem onClick={() => setTheme('light')}>
              <Sun /> Claro
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => setTheme('dark')}>
              <Moon /> Oscuro
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => setTheme('system')}>
              <SunMoon /> Sistema
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
        {isLocalDataSource ? (
          <Button
            variant="ghost"
            size="sm"
            className="justify-start text-muted-foreground"
            onClick={async () => {
              await resetSeed();
              toast.success('Datos de prueba restablecidos');
            }}
          >
            <RefreshCw />
            Restablecer datos de prueba
          </Button>
        ) : (
          <Button variant="ghost" size="sm" className="justify-start text-muted-foreground" onClick={clearSession}>
            <LogOut />
            Cerrar sesión
          </Button>
        )}
      </SidebarFooter>
    </Sidebar>
  );
}
