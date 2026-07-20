import { createFileRoute } from "@tanstack/react-router";
import { useSuspenseQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { listAnggota, upsertAnggota, deleteAnggota } from "@/lib/koperasi.functions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
  Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger,
} from "@/components/ui/dialog";
import { DeleteConfirm } from "@/components/delete-confirm";
import { useState } from "react";
import { Plus, Pencil, Trash2, Search } from "lucide-react";
import { formatTanggal } from "@/lib/format";
import { toast } from "sonner";
import { useRouteContext } from "@tanstack/react-router";

export const Route = createFileRoute("/_app/anggota")({
  head: () => ({ meta: [{ title: "Anggota — Koperasi SMP Negeri 36 Samarinda" }] }),
  component: AnggotaPage,
});

type Anggota = {
  id: string;
  nama: string;
  nip: string | null;
  jabatan: string | null;
  telepon: string | null;
  tanggal_bergabung: string;
  aktif: boolean;
  catatan: string | null;
};

function AnggotaPage() {
  const { user } = useRouteContext({ from: "/_app" });
  const isSuper = user?.role === "super";
  const qc = useQueryClient();
  const listFn = useServerFn(listAnggota);
  const upsertFn = useServerFn(upsertAnggota);
  const deleteFn = useServerFn(deleteAnggota);

  const { data } = useSuspenseQuery({ queryKey: ["anggota"], queryFn: () => listFn() });

  const [q, setQ] = useState("");
  const [editing, setEditing] = useState<Partial<Anggota> | null>(null);
  const [open, setOpen] = useState(false);

  const upsertM = useMutation({
    mutationFn: (d: any) => upsertFn({ data: d }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["anggota"] });
      setOpen(false);
      setEditing(null);
      toast.success("Data anggota disimpan");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const delM = useMutation({
    mutationFn: (d: { id: string; superPassword?: string }) => deleteFn({ data: d }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["anggota"] });
      toast.success("Anggota dihapus");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const filtered = (data as Anggota[]).filter((a) =>
    [a.nama, a.nip, a.jabatan].filter(Boolean).some((s) => s!.toLowerCase().includes(q.toLowerCase())),
  );

  function openNew() { setEditing({ aktif: true, tanggal_bergabung: new Date().toISOString().slice(0, 10) }); setOpen(true); }
  function openEdit(a: Anggota) { setEditing(a); setOpen(true); }

  function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    upsertM.mutate({
      id: editing?.id,
      nama: String(fd.get("nama") || "").trim(),
      nip: String(fd.get("nip") || "") || null,
      jabatan: String(fd.get("jabatan") || "") || null,
      telepon: String(fd.get("telepon") || "") || null,
      tanggal_bergabung: String(fd.get("tanggal_bergabung") || new Date().toISOString().slice(0, 10)),
      aktif: fd.get("aktif") === "on",
      catatan: String(fd.get("catatan") || "") || null,
    });
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Anggota</h1>
          <p className="text-sm text-muted-foreground">Kelola data anggota koperasi.</p>
        </div>
        <Dialog open={open} onOpenChange={(o) => { setOpen(o); if (!o) setEditing(null); }}>
          <DialogTrigger asChild>
            <Button onClick={openNew}><Plus className="w-4 h-4" />Tambah Anggota</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{editing?.id ? "Ubah" : "Tambah"} Anggota</DialogTitle>
            </DialogHeader>
            <form onSubmit={submit} className="space-y-3" key={editing?.id ?? "new"}>
              <div className="space-y-1.5"><Label>Nama Lengkap</Label><Input name="nama" defaultValue={editing?.nama ?? ""} required /></div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5"><Label>NIP</Label><Input name="nip" defaultValue={editing?.nip ?? ""} /></div>
                <div className="space-y-1.5"><Label>Jabatan</Label><Input name="jabatan" defaultValue={editing?.jabatan ?? ""} /></div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5"><Label>Telepon</Label><Input name="telepon" defaultValue={editing?.telepon ?? ""} /></div>
                <div className="space-y-1.5"><Label>Tanggal Bergabung</Label><Input name="tanggal_bergabung" type="date" defaultValue={editing?.tanggal_bergabung ?? new Date().toISOString().slice(0,10)} required /></div>
              </div>
              <div className="space-y-1.5"><Label>Catatan</Label><Textarea name="catatan" defaultValue={editing?.catatan ?? ""} rows={2} /></div>
              <div className="flex items-center gap-2"><Switch name="aktif" defaultChecked={editing?.aktif ?? true} /><Label className="cursor-pointer">Aktif</Label></div>
              <DialogFooter>
                <Button type="button" variant="ghost" onClick={() => setOpen(false)}>Batal</Button>
                <Button type="submit" disabled={upsertM.isPending}>Simpan</Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <Card>
        <CardContent className="p-0">
          <div className="p-4 border-b">
            <div className="relative max-w-sm">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
              <Input placeholder="Cari nama, NIP, jabatan..." className="pl-9" value={q} onChange={(e) => setQ(e.target.value)} />
            </div>
          </div>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nama</TableHead>
                <TableHead>NIP</TableHead>
                <TableHead>Jabatan</TableHead>
                <TableHead>Bergabung</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="w-0">Aksi</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.length === 0 && (
                <TableRow><TableCell colSpan={6} className="text-center text-sm text-muted-foreground py-8">Belum ada data anggota.</TableCell></TableRow>
              )}
              {filtered.map((a) => (
                <TableRow key={a.id}>
                  <TableCell className="font-medium">{a.nama}</TableCell>
                  <TableCell className="text-muted-foreground">{a.nip || "-"}</TableCell>
                  <TableCell className="text-muted-foreground">{a.jabatan || "-"}</TableCell>
                  <TableCell className="text-muted-foreground">{formatTanggal(a.tanggal_bergabung)}</TableCell>
                  <TableCell>{a.aktif ? <Badge>Aktif</Badge> : <Badge variant="secondary">Nonaktif</Badge>}</TableCell>
                  <TableCell>
                    <div className="flex gap-1">
                      <Button size="icon" variant="ghost" onClick={() => openEdit(a)}><Pencil className="w-4 h-4" /></Button>
                      <DeleteConfirm
                        isSuper={isSuper}
                        title="Hapus anggota?"
                        description={<>Semua data simpanan dan pinjaman terkait <b>{a.nama}</b> akan ikut terhapus.</>}
                        onConfirm={(pw) => delM.mutateAsync({ id: a.id, superPassword: pw })}
                        trigger={<Button size="icon" variant="ghost"><Trash2 className="w-4 h-4 text-destructive" /></Button>}
                      />
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
