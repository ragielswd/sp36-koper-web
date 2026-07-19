import { createFileRoute } from "@tanstack/react-router";
import { useSuspenseQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { listSimpanan, createSimpanan, updateSimpanan, deleteSimpanan, listAnggota } from "@/lib/koperasi.functions";
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
import { useEffect, useState } from "react";
import { Plus, Trash2, ArrowDownCircle, ArrowUpCircle, Pencil, Printer } from "lucide-react";
import { formatTanggal, rupiah } from "@/lib/format";
import { toast } from "sonner";
import { MoneyInput } from "@/components/money-input";
import { printHtml } from "@/lib/print";
import { renderStrukSimpanan } from "@/lib/dokumen";

export const Route = createFileRoute("/_app/simpanan")({
  head: () => ({ meta: [{ title: "Simpanan — Koperasi SMPN 36" }] }),
  component: SimpananPage,
});

const LAST_ANGGOTA_KEY = "koperasi.lastAnggotaId";

type FormState = {
  id?: string;
  anggota_id: string;
  jenis: "pokok" | "wajib" | "sukarela";
  tipe: "setor" | "tarik";
  jumlah: string;
  tanggal: string;
  catatan: string;
};

function emptyForm(anggotaId = ""): FormState {
  return {
    anggota_id: anggotaId,
    jenis: "wajib",
    tipe: "setor",
    jumlah: "",
    tanggal: new Date().toISOString().slice(0, 10),
    catatan: "",
  };
}

function SimpananPage() {
  const qc = useQueryClient();
  const listFn = useServerFn(listSimpanan);
  const anggotaFn = useServerFn(listAnggota);
  const createFn = useServerFn(createSimpanan);
  const updateFn = useServerFn(updateSimpanan);
  const delFn = useServerFn(deleteSimpanan);

  const { data: simpanan } = useSuspenseQuery({ queryKey: ["simpanan"], queryFn: () => listFn() });
  const { data: anggota } = useSuspenseQuery({ queryKey: ["anggota"], queryFn: () => anggotaFn() });

  const [open, setOpen] = useState(false);
  const [form, setForm] = useState<FormState>(() => emptyForm());

  // On mount, prefill anggota from localStorage
  useEffect(() => {
    if (typeof window === "undefined") return;
    const last = window.localStorage.getItem(LAST_ANGGOTA_KEY) ?? "";
    if (last) setForm((f) => ({ ...f, anggota_id: last }));
  }, []);

  function openCreate() {
    const last = typeof window !== "undefined" ? window.localStorage.getItem(LAST_ANGGOTA_KEY) ?? "" : "";
    setForm(emptyForm(last));
    setOpen(true);
  }

  function openEdit(s: any) {
    setForm({
      id: s.id,
      anggota_id: s.anggota_id,
      jenis: s.jenis,
      tipe: s.tipe,
      jumlah: String(Math.round(Number(s.jumlah))),
      tanggal: s.tanggal,
      catatan: s.catatan ?? "",
    });
    setOpen(true);
  }

  const createM = useMutation({
    mutationFn: (d: any) => createFn({ data: d }),
    onSuccess: (res: any, vars: any) => {
      qc.invalidateQueries({ queryKey: ["simpanan"] });
      qc.invalidateQueries({ queryKey: ["dashboard"] });
      if (typeof window !== "undefined") window.localStorage.setItem(LAST_ANGGOTA_KEY, vars.anggota_id);
      setOpen(false);
      toast.success("Transaksi simpanan dicatat");
      // Print struk with returned row
      const row = res?.row ?? vars;
      const anggotaObj = (anggota as any[]).find((a) => a.id === vars.anggota_id);
      printHtml(renderStrukSimpanan({
        namaAnggota: row.anggota?.nama ?? anggotaObj?.nama ?? "-",
        nip: row.anggota?.nip ?? anggotaObj?.nip,
        tanggal: row.tanggal ?? vars.tanggal,
        jenis: row.jenis ?? vars.jenis,
        tipe: row.tipe ?? vars.tipe,
        jumlah: Number(row.jumlah ?? vars.jumlah),
        catatan: row.catatan ?? vars.catatan ?? null,
        nomor: row.id ?? "",
      }));
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const updateM = useMutation({
    mutationFn: (d: any) => updateFn({ data: d }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["simpanan"] });
      qc.invalidateQueries({ queryKey: ["dashboard"] });
      setOpen(false);
      toast.success("Transaksi diperbarui");
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
    const payload = {
      anggota_id: form.anggota_id,
      jenis: form.jenis,
      tipe: form.tipe,
      jumlah,
      tanggal: form.tanggal,
      catatan: form.catatan || null,
    };
    if (form.id) updateM.mutate({ id: form.id, ...payload });
    else createM.mutate(payload);
  }

  function cetakStruk(s: any) {
    printHtml(renderStrukSimpanan({
      namaAnggota: s.anggota?.nama ?? "-",
      nip: s.anggota?.nip,
      tanggal: s.tanggal,
      jenis: s.jenis,
      tipe: s.tipe,
      jumlah: Number(s.jumlah),
      catatan: s.catatan,
      nomor: s.id,
    }));
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
        <Dialog open={open} onOpenChange={(v) => { setOpen(v); if (!v) setForm(emptyForm(form.anggota_id)); }}>
          <DialogTrigger asChild>
            <Button onClick={openCreate}><Plus className="w-4 h-4" />Catat Transaksi</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle>{form.id ? "Edit Simpanan" : "Catat Simpanan"}</DialogTitle></DialogHeader>
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
                <div className="space-y-1.5"><Label>Tanggal</Label><Input type="date" value={form.tanggal} onChange={(e) => setForm({ ...form, tanggal: e.target.value })} required /></div>
              </div>
              <div className="space-y-1.5"><Label>Jumlah (Rp)</Label><MoneyInput value={form.jumlah} onChange={(v) => setForm({ ...form, jumlah: v })} required /></div>
              <div className="space-y-1.5"><Label>Catatan</Label><Textarea rows={2} value={form.catatan} onChange={(e) => setForm({ ...form, catatan: e.target.value })} /></div>
              <DialogFooter>
                <Button type="button" variant="ghost" onClick={() => setOpen(false)}>Batal</Button>
                <Button type="submit" disabled={createM.isPending || updateM.isPending}>{form.id ? "Simpan Perubahan" : "Simpan & Cetak Struk"}</Button>
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
                <TableHead className="w-0">Aksi</TableHead>
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
                    <div className="flex gap-1">
                      <Button size="icon" variant="ghost" onClick={() => cetakStruk(s)} title="Cetak struk"><Printer className="w-4 h-4" /></Button>
                      <Button size="icon" variant="ghost" onClick={() => openEdit(s)} title="Edit"><Pencil className="w-4 h-4" /></Button>
                      <AlertDialog>
                        <AlertDialogTrigger asChild><Button size="icon" variant="ghost"><Trash2 className="w-4 h-4 text-destructive" /></Button></AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader><AlertDialogTitle>Hapus transaksi?</AlertDialogTitle><AlertDialogDescription>Tindakan ini tidak dapat dibatalkan.</AlertDialogDescription></AlertDialogHeader>
                          <AlertDialogFooter><AlertDialogCancel>Batal</AlertDialogCancel><AlertDialogAction onClick={() => delM.mutate(s.id)}>Hapus</AlertDialogAction></AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
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
