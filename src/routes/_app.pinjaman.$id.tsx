import { createFileRoute, Link } from "@tanstack/react-router";
import { useSuspenseQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { getPinjamanDetail, createAngsuran, deleteAngsuran } from "@/lib/koperasi.functions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { useState } from "react";
import { ArrowLeft, Plus, Trash2 } from "lucide-react";
import { formatTanggal, rupiah, hitungAngsuranBulanan } from "@/lib/format";
import { toast } from "sonner";

export const Route = createFileRoute("/_app/pinjaman/$id")({
  head: () => ({ meta: [{ title: "Detail Pinjaman — Koperasi SMPN 36" }] }),
  component: PinjamanDetailPage,
});

function PinjamanDetailPage() {
  const { id } = Route.useParams();
  const qc = useQueryClient();
  const detailFn = useServerFn(getPinjamanDetail);
  const createFn = useServerFn(createAngsuran);
  const delFn = useServerFn(deleteAngsuran);

  const { data } = useSuspenseQuery({
    queryKey: ["pinjaman", id],
    queryFn: () => detailFn({ data: { id } }),
  });

  const p = data.pinjaman as any;
  const angsuran = data.angsuran as any[];
  const totalPokok = angsuran.reduce((n, a) => n + Number(a.pokok), 0);
  const totalBunga = angsuran.reduce((n, a) => n + Number(a.bunga), 0);
  const sisa = Number(p.pokok) - totalPokok;
  const preview = hitungAngsuranBulanan(Number(p.pokok), Number(p.bunga_persen), Number(p.tenor_bulan), p.bunga_tipe);

  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({
    tanggal: new Date().toISOString().slice(0, 10),
    pokok: String(preview.pokok.toFixed(0)),
    bunga: String(preview.bunga.toFixed(0)),
    denda: "0",
    catatan: "",
  });

  const createM = useMutation({
    mutationFn: (d: any) => createFn({ data: d }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["pinjaman", id] });
      qc.invalidateQueries({ queryKey: ["pinjaman"] });
      qc.invalidateQueries({ queryKey: ["dashboard"] });
      setOpen(false);
      toast.success("Angsuran dicatat");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const delM = useMutation({
    mutationFn: (aid: string) => delFn({ data: { id: aid } }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["pinjaman", id] });
      qc.invalidateQueries({ queryKey: ["dashboard"] });
    },
  });

  function submit(e: React.FormEvent) {
    e.preventDefault();
    createM.mutate({
      pinjaman_id: id,
      tanggal: form.tanggal,
      pokok: Number(form.pokok) || 0,
      bunga: Number(form.bunga) || 0,
      denda: Number(form.denda) || 0,
      catatan: form.catatan || null,
    });
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <Button asChild variant="ghost" size="sm"><Link to="/pinjaman"><ArrowLeft className="w-4 h-4" />Kembali</Link></Button>
      </div>

      <div className="flex items-start justify-between gap-3 flex-wrap">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">{p.anggota?.nama}</h1>
          <p className="text-sm text-muted-foreground">Pinjaman sejak {formatTanggal(p.tanggal_pinjam)} · NIP {p.anggota?.nip || "-"}</p>
        </div>
        {p.status === "aktif" && <Badge>Aktif</Badge>}
        {p.status === "lunas" && <Badge variant="secondary">Lunas</Badge>}
        {p.status === "macet" && <Badge variant="destructive">Macet</Badge>}
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Card><CardContent className="p-4"><div className="text-xs uppercase text-muted-foreground">Pokok</div><div className="text-lg font-semibold mt-1">{rupiah(p.pokok)}</div></CardContent></Card>
        <Card><CardContent className="p-4"><div className="text-xs uppercase text-muted-foreground">Tenor</div><div className="text-lg font-semibold mt-1">{p.tenor_bulan} bulan</div></CardContent></Card>
        <Card><CardContent className="p-4"><div className="text-xs uppercase text-muted-foreground">Bunga</div><div className="text-lg font-semibold mt-1 capitalize">{p.bunga_tipe === "tanpa" ? "Tanpa bunga" : `${p.bunga_persen}${p.bunga_tipe === "tetap" ? "" : "%"} · ${p.bunga_tipe}`}</div></CardContent></Card>
        <Card><CardContent className="p-4"><div className="text-xs uppercase text-muted-foreground">Sisa Pokok</div><div className="text-lg font-semibold mt-1 text-primary">{rupiah(sisa)}</div></CardContent></Card>
      </div>

      <Card>
        <CardHeader className="flex-row items-center justify-between space-y-0">
          <CardTitle className="text-base">Riwayat Angsuran</CardTitle>
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild><Button size="sm"><Plus className="w-4 h-4" />Catat Angsuran</Button></DialogTrigger>
            <DialogContent>
              <DialogHeader><DialogTitle>Catat Angsuran</DialogTitle></DialogHeader>
              <form onSubmit={submit} className="space-y-3">
                <div className="space-y-1.5"><Label>Tanggal</Label><Input type="date" value={form.tanggal} onChange={(e) => setForm({ ...form, tanggal: e.target.value })} required /></div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5"><Label>Pokok (Rp)</Label><Input type="number" min="0" value={form.pokok} onChange={(e) => setForm({ ...form, pokok: e.target.value })} /></div>
                  <div className="space-y-1.5"><Label>Bunga/Jasa (Rp)</Label><Input type="number" min="0" value={form.bunga} onChange={(e) => setForm({ ...form, bunga: e.target.value })} /></div>
                </div>
                <div className="space-y-1.5"><Label>Denda (Rp)</Label><Input type="number" min="0" value={form.denda} onChange={(e) => setForm({ ...form, denda: e.target.value })} /></div>
                <DialogFooter>
                  <Button type="button" variant="ghost" onClick={() => setOpen(false)}>Batal</Button>
                  <Button type="submit" disabled={createM.isPending}>Simpan</Button>
                </DialogFooter>
              </form>
            </DialogContent>
          </Dialog>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>#</TableHead>
                <TableHead>Tanggal</TableHead>
                <TableHead className="text-right">Pokok</TableHead>
                <TableHead className="text-right">Bunga</TableHead>
                <TableHead className="text-right">Denda</TableHead>
                <TableHead className="text-right">Total</TableHead>
                <TableHead className="w-0"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {angsuran.length === 0 && (
                <TableRow><TableCell colSpan={7} className="text-center text-sm text-muted-foreground py-8">Belum ada angsuran.</TableCell></TableRow>
              )}
              {angsuran.map((a, i) => (
                <TableRow key={a.id}>
                  <TableCell>{i + 1}</TableCell>
                  <TableCell>{formatTanggal(a.tanggal)}</TableCell>
                  <TableCell className="text-right">{rupiah(a.pokok)}</TableCell>
                  <TableCell className="text-right">{rupiah(a.bunga)}</TableCell>
                  <TableCell className="text-right">{rupiah(a.denda)}</TableCell>
                  <TableCell className="text-right font-medium">{rupiah(Number(a.pokok) + Number(a.bunga) + Number(a.denda))}</TableCell>
                  <TableCell>
                    <AlertDialog>
                      <AlertDialogTrigger asChild><Button size="icon" variant="ghost"><Trash2 className="w-4 h-4 text-destructive" /></Button></AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader><AlertDialogTitle>Hapus angsuran ini?</AlertDialogTitle></AlertDialogHeader>
                        <AlertDialogFooter><AlertDialogCancel>Batal</AlertDialogCancel><AlertDialogAction onClick={() => delM.mutate(a.id)}>Hapus</AlertDialogAction></AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  </TableCell>
                </TableRow>
              ))}
              {angsuran.length > 0 && (
                <TableRow className="bg-muted/40 font-medium">
                  <TableCell colSpan={2}>Total</TableCell>
                  <TableCell className="text-right">{rupiah(totalPokok)}</TableCell>
                  <TableCell className="text-right">{rupiah(totalBunga)}</TableCell>
                  <TableCell />
                  <TableCell className="text-right">{rupiah(totalPokok + totalBunga)}</TableCell>
                  <TableCell />
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
