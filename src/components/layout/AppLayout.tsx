import { useEffect } from 'react';
import { Outlet } from 'react-router-dom';

import { AppSidebar } from '@/components/layout/AppSidebar';
import { Button } from '@/components/ui/button';
import { SidebarInset, SidebarProvider, SidebarTrigger } from '@/components/ui/sidebar';
import { Separator } from '@/components/ui/separator';
import { Skeleton } from '@/components/ui/skeleton';
import { Toaster } from '@/components/ui/sonner';
import { useDataStore } from '@/stores/dataStore';

export function AppLayout() {
  const status = useDataStore((s) => s.status);
  const loadAll = useDataStore((s) => s.loadAll);

  // Boot: Seed if empty and load everything into memory
  useEffect(() => {
    void loadAll();
  }, [loadAll]);

  return (
    <SidebarProvider>
      <AppSidebar />
      <SidebarInset>
        <header className="flex h-14 shrink-0 items-center gap-2 border-b px-4 md:hidden">
          <SidebarTrigger />
          <Separator orientation="vertical" className="h-5 h-full" />
          <span className="font-semibold">Uber</span>
        </header>
        <div className="flex flex-1 flex-col gap-4 p-4 md:p-6">
          {status === 'ready' ? (
            <Outlet />
          ) : status === 'error' ? (
            <div className="flex flex-1 flex-col items-center justify-center gap-3 text-center">
              <p className="font-medium">No se pudieron cargar los datos</p>
              <p className="text-sm text-muted-foreground">Verificá que el servidor esté disponible e intentá de nuevo.</p>
              <Button variant="outline" size="sm" onClick={() => void loadAll()}>
                Reintentar
              </Button>
            </div>
          ) : (
            <div className="space-y-4">
              <Skeleton className="h-9 w-64" />
              <Skeleton className="h-28 w-full" />
              <Skeleton className="h-72 w-full" />
            </div>
          )}
        </div>
      </SidebarInset>
      {/* bottom-right: top-right sat on top of the page action buttons and ate their clicks */}
      <Toaster richColors position="bottom-right" duration={2500} />
    </SidebarProvider>
  );
}
