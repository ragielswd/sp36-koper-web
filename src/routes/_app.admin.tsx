import { createFileRoute, redirect } from "@tanstack/react-router";
import { useSuspenseQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";
import { toast } from "sonner";
import { listAdmins, createAdmin, updateAdmin, resetAdminPassword, deleteAdmin } from "@/lib/admin.functions";
import { me } from "@/lib/gate.functions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { Switch } from "@/components/ui/switch";
import { Plus, KeyRound, Trash2 } from "lucide-react";

export const Route = createFileRoute("/_app/admin")({
  beforeLoad: async () => {
    const user = await me();
    if (!user || user.role !== "super") throw redirect({ to: "/dashboard" });
  },
  head: () => ({ meta: [{ title: "Kelola Admin — Koperasi SMPN 36" }] }),
  loader: ({ context }) =>
    context.queryClient.ensureQueryData({ queryKey: ["admins"], queryFn: () => listAdmins() }),
  component: AdminPage,
});

function AdminPage() {
  const qc = useQueryClient();
  const listFn = useServerFn(listAdmins);
  const createFn = useServerFn(createAdmin);
  const updateFn = useServerFn(updateAdmin);
  const resetFn = useServerFn(resetAdminPassword);
  const deleteFn = useServerFn(deleteAdmin);
  const { user: currentUser } = Route.useRouteContext() as { user: { userId: string } };

  const { data: admins } = useSuspenseQuery({ queryKey: ["admins"], queryFn: () => listFn() });

  const [openCreate, setOpenCreate] = useState(false);
  const [form, setForm] = useState({ username: "", nama: "", password: "", role: "admin" as "admin" | "super" });
  const [resetTarget, setResetTarget] = useState<{ id: string; username: string } | null>(null);
  const [newPass, setNewPass] = useState("");

  const invalidate = () => qc.invalidateQueries({ queryKey: ["admins"] });

  const createM = useMutation({
    mutationFn: (d: typeof form) => createFn({ data: d }),
    onSuccess: () => { toast.success("Admin ditambahkan"); setOpenCreate(false); setForm({ username: "", nama: "", password: "", role: "admin" }); invalidate(); },
    onError: (e: Error) => toast.error(e.message),
  });
  const updateM = useMutation({
    mutationFn: (d: { id: string; nama?: string; role?: "super" | "admin"; aktif?: boolean }) => updateFn({ data: d }),
    onSuccess: () => { toast.success("Tersimpan"); invalidate(); },
    onError: (e: Error) => toast.error(e.message),
  });
  const resetM = useMutation({
    mutationFn: (d: { id: string; newPassword: string }) => resetFn({ data: d }),
    onSuccess: () => { toast.success("Password direset"); setResetTarget(null); setNewPass(""); },
    onError: (e: Error) => toast.error(e.message),
  });
  const deleteM = useMutation({
    mutationFn: (id: string) => deleteFn({ data: { id } }),
    onSuccess: () => { toast.success("Admin dihapus"); invalidate(); },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Kelola Admin</h1>
          <p className="text-sm text-muted-foreground">Tambah, edit, atau hapus akun admin. Hanya super admin dapat mengakses halaman ini.</p>
        </div>
        <Dialog open={openCreate} onOpenChange={setOpenCreate}>
          <DialogTrigger asChild>
            <Button><Plus className="w-4 h-4" />Tambah Admin</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle>Tambah Admin</DialogTitle></DialogHeader>
            <div className="space-y-3">
              <div className="space-y-1.5">
                <Label>Username</Label>
                <Input value={form.username} onChange={(e) => setForm({ ...form, username: e.target.value })} placeholder="mis. andi.wijaya" />
                <p className="text-xs text-muted-foreground">3-32 karakter (huruf kecil, angka, . atau _)</p>
              </div>
              <div className="space-y-1.5"><Label>Nama Lengkap</Label><Input value={form.nama} onChange={(e) => setForm({ ...form, nama: e.target.value })} /></div>
              <div className="space-y-1.5"><Label>Password</Label><Input type="password" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} placeholder="minimal 6 karakter" /></div>
              <div className="space-y-1.5">
                <Label>Role</Label>
                <Select value={form.role} onValueChange={(v) => setForm({ ...form, role: v as "admin" | "super" })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="admin">Admin</SelectItem>
                    <SelectItem value="super">Super Admin</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setOpenCreate(false)}>Batal</Button>
              <Button onClick={() => createM.mutate(form)} disabled={createM.isPending}>Simpan</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      <Card>
        <CardHeader><CardTitle className="text-base">Daftar Admin</CardTitle></CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Username</TableHead>
                <TableHead>Nama</TableHead>
                <TableHead>Role</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Aksi</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {admins.map((a) => {
                const isSelf = a.id === currentUser.userId;
                return (
                  <TableRow key={a.id}>
                    <TableCell className="font-medium">{a.username}{isSelf && <span className="ml-2 text-xs text-muted-foreground">(Anda)</span>}</TableCell>
                    <TableCell>{a.nama}</TableCell>
                    <TableCell>
                      <Select value={a.role} disabled={isSelf} onValueChange={(v) => updateM.mutate({ id: a.id, role: v as "super" | "admin" })}>
                        <SelectTrigger className="w-32 h-8"><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="admin">Admin</SelectItem>
                          <SelectItem value="super">Super Admin</SelectItem>
                        </SelectContent>
                      </Select>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Switch checked={a.aktif} disabled={isSelf} onCheckedChange={(v) => updateM.mutate({ id: a.id, aktif: v })} />
                        {a.aktif ? <Badge>Aktif</Badge> : <Badge variant="secondary">Nonaktif</Badge>}
                      </div>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="inline-flex gap-1">
                        <Button size="sm" variant="ghost" onClick={() => setResetTarget({ id: a.id, username: a.username })}><KeyRound className="w-4 h-4" /></Button>
                        <Button size="sm" variant="ghost" disabled={isSelf} onClick={() => { if (confirm(`Hapus admin ${a.username}?`)) deleteM.mutate(a.id); }}>
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Dialog open={!!resetTarget} onOpenChange={(o) => !o && setResetTarget(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle>Reset Password — {resetTarget?.username}</DialogTitle></DialogHeader>
          <div className="space-y-1.5">
            <Label>Password Baru</Label>
            <Input type="password" value={newPass} onChange={(e) => setNewPass(e.target.value)} placeholder="minimal 6 karakter" />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setResetTarget(null)}>Batal</Button>
            <Button disabled={!newPass || resetM.isPending} onClick={() => resetTarget && resetM.mutate({ id: resetTarget.id, newPassword: newPass })}>Simpan</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
