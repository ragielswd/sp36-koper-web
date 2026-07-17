import { createFileRoute, Outlet, redirect, Link, useRouter, useRouterState } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { checkUnlocked, lockSite } from "@/lib/gate.functions";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarProvider,
  SidebarTrigger,
  SidebarHeader,
  SidebarFooter,
} from "@/components/ui/sidebar";
import { LayoutDashboard, Users, PiggyBank, Landmark, FileBarChart2, LogOut, GraduationCap } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Toaster } from "@/components/ui/sonner";

export const Route = createFileRoute("/_app")({
  beforeLoad: async () => {
    const { unlocked } = await checkUnlocked();
    if (!unlocked) throw redirect({ to: "/unlock" });
  },
  component: AppLayout,
});

const nav = [
  { url: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { url: "/anggota", label: "Anggota", icon: Users },
  { url: "/simpanan", label: "Simpanan", icon: PiggyBank },
  { url: "/pinjaman", label: "Pinjaman", icon: Landmark },
  { url: "/laporan", label: "Laporan", icon: FileBarChart2 },
];

function AppLayout() {
  const router = useRouter();
  const lock = useServerFn(lockSite);
  const pathname = useRouterState({ select: (s) => s.location.pathname });

  async function handleSignOut() {
    await lock();
    await router.navigate({ to: "/unlock", replace: true });
  }

  return (
    <SidebarProvider>
      <div className="min-h-screen flex w-full bg-muted/20">
        <Sidebar collapsible="icon">
          <SidebarHeader className="border-b">
            <div className="flex items-center gap-2 px-2 py-2">
              <div className="w-8 h-8 rounded-lg bg-primary text-primary-foreground flex items-center justify-center">
                <GraduationCap className="w-4 h-4" />
              </div>
              <div className="flex flex-col leading-tight group-data-[collapsible=icon]:hidden">
                <span className="text-sm font-semibold">Koperasi SMPN 36</span>
                <span className="text-xs text-muted-foreground">Simpan Pinjam</span>
              </div>
            </div>
          </SidebarHeader>
          <SidebarContent>
            <SidebarGroup>
              <SidebarGroupContent>
                <SidebarMenu>
                  {nav.map((item) => {
                    const active = pathname === item.url || pathname.startsWith(item.url + "/");
                    return (
                      <SidebarMenuItem key={item.url}>
                        <SidebarMenuButton asChild isActive={active}>
                          <Link to={item.url}>
                            <item.icon className="w-4 h-4" />
                            <span>{item.label}</span>
                          </Link>
                        </SidebarMenuButton>
                      </SidebarMenuItem>
                    );
                  })}
                </SidebarMenu>
              </SidebarGroupContent>
            </SidebarGroup>
          </SidebarContent>
          <SidebarFooter className="border-t">
            <Button variant="ghost" size="sm" onClick={handleSignOut} className="justify-start">
              <LogOut className="w-4 h-4" />
              <span className="group-data-[collapsible=icon]:hidden">Keluar</span>
            </Button>
          </SidebarFooter>
        </Sidebar>
        <div className="flex-1 flex flex-col min-w-0">
          <header className="h-14 flex items-center gap-2 border-b bg-background px-4 sticky top-0 z-10">
            <SidebarTrigger />
            <div className="text-sm font-medium">Panel Admin</div>
          </header>
          <main className="flex-1 p-4 md:p-6 max-w-7xl w-full mx-auto">
            <Outlet />
          </main>
        </div>
      </div>
      <Toaster richColors position="top-right" />
    </SidebarProvider>
  );
}
