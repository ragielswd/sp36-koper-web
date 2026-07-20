import { createFileRoute, Outlet, redirect, Link, useRouter, useRouterState } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { me, logout } from "@/lib/gate.functions";
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
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { LayoutDashboard, Users, PiggyBank, Landmark, FileBarChart2, LogOut, ShieldCheck, Database } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Toaster } from "@/components/ui/sonner";

import logoAsset from "@/assets/logo-koperasi.png.asset.json";

export const Route = createFileRoute("/_app")({
  beforeLoad: async () => {
    const user = await me();
    if (!user) throw redirect({ to: "/unlock" });
    return { user };
  },
  component: AppLayout,
});

const nav = [
  { url: "/dashboard", label: "Dashboard", icon: LayoutDashboard, roles: "all" as const },
  { url: "/anggota", label: "Anggota", icon: Users, roles: "admin" as const },
  { url: "/simpanan", label: "Simpanan", icon: PiggyBank, roles: "admin" as const },
  { url: "/pinjaman", label: "Pinjaman", icon: Landmark, roles: "admin" as const },
  { url: "/laporan", label: "Laporan", icon: FileBarChart2, roles: "all" as const },
  { url: "/admin", label: "Kelola Admin", icon: ShieldCheck, roles: "super" as const },
  { url: "/database", label: "Kelola Database", icon: Database, roles: "super" as const },
];

function AppLayout() {
  const router = useRouter();
  const { user } = Route.useRouteContext();
  const logoutFn = useServerFn(logout);
  const pathname = useRouterState({ select: (s) => s.location.pathname });

  async function handleSignOut() {
    await logoutFn();
    await router.navigate({ to: "/unlock", replace: true });
  }

  return (
    <SidebarProvider>
      <div className="min-h-screen flex w-full bg-muted/20">
        <Sidebar collapsible="icon">
          <SidebarHeader className="border-b">
            <div className="flex items-center gap-2 px-2 py-2">
              <img src={logoAsset.url} alt="Logo Koperasi SMP Negeri 36 Samarinda" className="w-8 h-8 rounded-lg object-contain bg-white" />
              <div className="flex flex-col leading-tight group-data-[collapsible=icon]:hidden">
                <span className="text-sm font-semibold">Koperasi SMP Negeri 36 Samarinda</span>
                <span className="text-xs text-muted-foreground">Simpan Pinjam</span>
              </div>
            </div>
          </SidebarHeader>
          <SidebarContent>
            <SidebarGroup>
              <SidebarGroupContent>
                <SidebarMenu>
                  {nav.filter((n) => n.roles === "all" || (n.roles === "super" ? user?.role === "super" : user?.role !== "super")).map((item) => {
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
            <div className="px-2 py-1 group-data-[collapsible=icon]:hidden">
              <div className="text-xs font-medium truncate">{user?.nama}</div>
              <div className="text-[10px] text-muted-foreground uppercase tracking-wide">{user?.role === "super" ? "Super Admin" : "Admin"}</div>
            </div>
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button variant="ghost" size="sm" className="justify-start">
                  <LogOut className="w-4 h-4" />
                  <span className="group-data-[collapsible=icon]:hidden">Keluar</span>
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Keluar dari aplikasi?</AlertDialogTitle>
                  <AlertDialogDescription>
                    Anda akan diarahkan ke halaman login. Pastikan semua data telah tersimpan.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Batal</AlertDialogCancel>
                  <AlertDialogAction onClick={handleSignOut}>Ya, Keluar</AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
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
