import { createFileRoute } from "@tanstack/react-router";
import { useSuspenseQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { listSimpanan, createSimpanan, deleteSimpanan, listAnggota } from "@/lib/koperasi.functions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { useState } from "react";
import { Plus, Trash2, ArrowDownCircle, ArrowUpCircle } from "lucide-react";
import { formatTanggal, rupiah } from "@/lib/format";
import { toast } from "sonner";

export const Route = createFileRoute("/_app/simpanan")({
  head: () => ({ meta: [{ title: "Simpanan — Koperasi SMPN 36" }] }),
  component: SimpananPage,
});

function SimpananPage() {
  const qc = useQueryClient();
  const listFn = useServerFn(listSimpanan);
  const anggotaFn = useServerFn(listAnggota);
  const createFn = useServerFn(createSimpanan);
  const delFn = useServerFn(deleteSimpanan);

  const { data: simpanan } = useSuspenseQuery({ queryKey: ["simpanan"], queryFn: () => listFn() });
  const { data: anggota } = useSuspenseQuery({ queryKey: ["anggota"], queryFn: () => anggotaFn() });

  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({
    anggota_id: "",
    jenis: "wajib" as "pokok" | "wajib" | "sukarela",
    tipe: "setor" as "setor" | "tarik",
    jumlah: "",
    tanggal: new Date().toISOString().slice(0, 10),
    catatan: "",
  });

  const createM = useMutation({
    mutationFn: (d: any) => createFn({ data: d }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["simpanan"] });
      qc.invalidateQueries({ queryKey: ["dashboard"] });
      setOpen(false);
      setForm({ anggota_id: "", jenis: "wajib", tipe: "setor", jumlah: "", tanggal: new Date().toISOString().slice(0,10), catatan: "" });
      toast.success("Transaksi simpanan dicatat");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const delM = useMutation({
    mutationFn: (id: string) => delFn({ data: { id } }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["simpanan"] });
      qc.invalidateQueries({ queryKey: ["dashboard"] });
      toast.success("Transaksi dihapus");
    },
  });

  function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.anggota_id) return toast.error("Pilih anggota");
    const jumlah = Number(form.jumlah);
    if (!(jumlah > 0)) return toast.error("Jumlah harus lebih dari 0");
    createM.mutate({ ...form, jumlah });
  }

  const totalSetor = (simpanan as any[]).filter((s) => s.tipe === "setor").reduce((n, s) => n + Number(s.jumlah), 0);
  const totalTarik = (simpanan as any[]).filter((s) => s.tipe === "tarik").reduce((n, s) => n + Number(s.jumlah), 0);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Simpanan</h1>
          <p className="text-sm text-muted-foreground">Setoran dan penarikan simpanan pokok, wajib, dan sukarela.</p>
        </div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button><Plus className="w-4 h-4" />Catat Transaksi</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle>Catat Simpanan</DialogTitle></DialogHeader>
            <form onSubmit={submit} className="space-y-3">
              <div className="space-y-1.5">
                <Label>Anggota</Label>
                <Select value={form.anggota_id} onValueChange={(v) => setForm({ ...form, anggota_id: v })}>
                  <SelectTrigger><SelectValue placeholder="Pilih anggota" /></SelectTrigger>
                  <SelectContent>
                    {(anggota as any[]).map((a) => <SelectItem key={a.id} value={a.id}>{a.nama}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label>Jenis</Label>
                  <Select value={form.jenis} onValueChange={(v: any) => setForm({ ...form, jenis: v })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="pokok">Pokok</SelectItem>
                      <SelectItem value="wajib">Wajib</SelectItem>
                      <SelectItem value="sukarela">Sukarela</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label>Tipe</Label>
                  <Select value={form.tipe} onValueChange={(v: any) => setForm({ ...form, tipe: v })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="setor">Setoran</SelectItem>
                      <SelectItem value="tarik">Penarikan</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5"><Label>Jumlah (Rp)</Label><Input type="number" min="0" step="1000" value={form.jumlah} onChange={(e) => setForm({ ...form, jumlah: e.target.value })} required /></div>
                <div className="space-y-1.5"><Label>Tanggal</Label><Input type="date" value={form.tanggal} onChange={(e) => setForm({ ...form, tanggal: e.target.value })} required /></div>
              </div>
              <div className="space-y-1.5"><Label>Catatan</Label><Textarea rows={2} value={form.catatan} onChange={(e) => setForm({ ...form, catatan: e.target.value })} /></div>
              <DialogFooter>
                <Button type="button" variant="ghost" onClick={() => setOpen(false)}>Batal</Button>
                <Button type="submit" disabled={createM.isPending}>Simpan</Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card><CardContent className="p-4"><div className="text-xs text-muted-foreground uppercase">Total Setoran</div><div className="text-xl font-semibold mt-1">{rupiah(totalSetor)}</div></CardContent></Card>
        <Card><CardContent className="p-4"><div className="text-xs text-muted-foreground uppercase">Total Penarikan</div><div className="text-xl font-semibold mt-1">{rupiah(totalTarik)}</div></CardContent></Card>
        <Card><CardContent className="p-4"><div className="text-xs text-muted-foreground uppercase">Saldo</div><div className="text-xl font-semibold mt-1 text-primary">{rupiah(totalSetor - totalTarik)}</div></CardContent></Card>
      </div>

      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Tanggal</TableHead>
                <TableHead>Anggota</TableHead>
                <TableHead>Jenis</TableHead>
                <TableHead>Tipe</TableHead>
                <TableHead className="text-right">Jumlah</TableHead>
                <TableHead>Catatan</TableHead>
                <TableHead className="w-0"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {(simpanan as any[]).length === 0 && (
                <TableRow><TableCell colSpan={7} className="text-center text-sm text-muted-foreground py-8">Belum ada transaksi.</TableCell></TableRow>
              )}
              {(simpanan as any[]).map((s) => (
                <TableRow key={s.id}>
                  <TableCell>{formatTanggal(s.tanggal)}</TableCell>
                  <TableCell className="font-medium">{s.anggota?.nama ?? "-"}</TableCell>
                  <TableCell><Badge variant="outline" className="capitalize">{s.jenis}</Badge></TableCell>
                  <TableCell>
                    {s.tipe === "setor"
                      ? <span className="inline-flex items-center gap-1 text-emerald-600 text-sm"><ArrowDownCircle className="w-4 h-4" />Setor</span>
                      : <span className="inline-flex items-center gap-1 text-amber-600 text-sm"><ArrowUpCircle className="w-4 h-4" />Tarik</span>}
                  </TableCell>
                  <TableCell className={`text-right font-medium ${s.tipe === "tarik" ? "text-amber-600" : ""}`}>
                    {s.tipe === "tarik" ? "-" : ""}{rupiah(s.jumlah)}
                  </TableCell>
                  <TableCell className="text-muted-foreground text-sm">{s.catatan || "-"}</TableCell>
                  <TableCell>
                    <AlertDialog>
                      <AlertDialogTrigger asChild><Button size="icon" variant="ghost"><Trash2 className="w-4 h-4 text-destructive" /></Button></AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader><AlertDialogTitle>Hapus transaksi?</AlertDialogTitle><AlertDialogDescription>Tindakan ini tidak dapat dibatalkan.</AlertDialogDescription></AlertDialogHeader>
                        <AlertDialogFooter><AlertDialogCancel>Batal</AlertDialogCancel><AlertDialogAction onClick={() => delM.mutate(s.id)}>Hapus</AlertDialogAction></AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
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
