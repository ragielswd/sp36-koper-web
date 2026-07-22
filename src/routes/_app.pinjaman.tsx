import { createFileRoute, Link, useRouteContext } from "@tanstack/react-router";
import { useSuspenseQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { listPinjaman, createPinjaman, updatePinjaman, deletePinjaman, listAnggota, updatePinjamanStatus, getSettings } from "@/lib/koperasi.functions";
import { RecentActivity } from "@/components/recent-activity";
import { WhatsAppTagihanButton } from "@/components/whatsapp-tagihan";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { DeleteConfirm } from "@/components/delete-confirm";
import { useState } from "react";
import { Plus, Trash2, Eye, Pencil, Printer, AlertTriangle, CheckCircle2 } from "lucide-react";
import { formatTanggal, rupiah, hitungAngsuranBulanan } from "@/lib/format";
import { toast } from "sonner";
import { MoneyInput } from "@/components/money-input";
import { printHtml } from "@/lib/print";
import { renderSuratPerjanjian } from "@/lib/dokumen";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_app/pinjaman")({
  head: () => ({ meta: [{ title: "Pinjaman — Koperasi SMP Negeri 36 Samarinda" }] }),
  component: PinjamanPage,
});

type FormState = {
  id?: string;
  anggota_id: string;
  pokok: string;
  bunga_persen: string;
  bunga_tipe: "flat" | "menurun" | "tetap" | "tanpa";
  tenor_bulan: string;
  tanggal_pinjam: string;
  tgl_jatuh_tempo: string;
  catatan: string;
};

function emptyForm(): FormState {
  return {
    anggota_id: "",
    pokok: "",
    bunga_persen: "1",
    bunga_tipe: "flat",
    tenor_bulan: "10",
    tanggal_pinjam: new Date().toISOString().slice(0, 10),
    tgl_jatuh_tempo: "5",
    catatan: "",
  };
}

/**
 * Hitung berapa hari lagi jatuh tempo bulanan aktif. Jika tanggal jatuh
 * tempo bulan ini sudah lewat, gunakan bulan berikutnya. Return null jika
 * tidak ada tgl_jatuh_tempo.
 */
function hariMenujuJatuhTempo(tgl?: number | null): number | null {
  if (!tgl) return null;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const y = today.getFullYear();
  const m = today.getMonth();
  let due = new Date(y, m, tgl);
  if (due < today) due = new Date(y, m + 1, tgl);
  return Math.round((due.getTime() - today.getTime()) / 86400000);
}

function PinjamanPage() {
  const { user } = useRouteContext({ from: "/_app" });
  const operator = user?.nama ?? "Petugas";
  const isSuper = user?.role === "super";

  const qc = useQueryClient();
  const listFn = useServerFn(listPinjaman);
  const anggotaFn = useServerFn(listAnggota);
  const createFn = useServerFn(createPinjaman);
  const updateFn = useServerFn(updatePinjaman);
  const delFn = useServerFn(deletePinjaman);
  const statusFn = useServerFn(updatePinjamanStatus);

  const { data: pinjaman } = useSuspenseQuery({ queryKey: ["pinjaman"], queryFn: () => listFn() });
  const { data: anggota } = useSuspenseQuery({ queryKey: ["anggota"], queryFn: () => anggotaFn() });

  const [open, setOpen] = useState(false);
  const [form, setForm] = useState<FormState>(emptyForm);

  function openCreate() { setForm(emptyForm()); setOpen(true); }
  function openEdit(p: any) {
    setForm({
      id: p.id,
      anggota_id: p.anggota_id,
      pokok: String(Math.round(Number(p.pokok))),
      bunga_persen: String(p.bunga_persen ?? 0),
      bunga_tipe: p.bunga_tipe,
      tenor_bulan: String(p.tenor_bulan),
      tanggal_pinjam: p.tanggal_pinjam,
      tgl_jatuh_tempo: p.tgl_jatuh_tempo ? String(p.tgl_jatuh_tempo) : "",
      catatan: p.catatan ?? "",
    });
    setOpen(true);
  }

  const createM = useMutation({
    mutationFn: (d: any) => createFn({ data: d }),
    onSuccess: (res: any, vars: any) => {
      qc.invalidateQueries({ queryKey: ["pinjaman"] });
      qc.invalidateQueries({ queryKey: ["dashboard"] });
      setOpen(false);
      toast.success("Pinjaman dicatat");
      const row = res?.row ?? {};
      const anggotaObj = row.anggota ?? (anggota as any[]).find((a) => a.id === vars.anggota_id) ?? {};
      const est = hitungAngsuranBulanan(vars.pokok, vars.bunga_persen, vars.tenor_bulan, vars.bunga_tipe);
      printHtml(renderSuratPerjanjian({
        namaAnggota: anggotaObj.nama ?? "-",
        nip: anggotaObj.nip,
        jabatan: anggotaObj.jabatan,
        pokok: vars.pokok,
        bungaPersen: vars.bunga_persen,
        bungaTipe: vars.bunga_tipe,
        tenor: vars.tenor_bulan,
        tanggalPinjam: vars.tanggal_pinjam,
        tglJatuhTempo: vars.tgl_jatuh_tempo,
        angsuranBulanan: est.total,
        nomor: row.id ?? "",
        operator: row.dibuat_oleh ?? operator,
      }));
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const updateM = useMutation({
    mutationFn: (d: any) => updateFn({ data: d }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["pinjaman"] });
      qc.invalidateQueries({ queryKey: ["dashboard"] });
      setOpen(false);
      toast.success("Pinjaman diperbarui");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const delM = useMutation({
    mutationFn: (d: { id: string; superPassword?: string }) => delFn({ data: d }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["pinjaman"] });
      qc.invalidateQueries({ queryKey: ["dashboard"] });
      toast.success("Pinjaman dihapus");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const statusM = useMutation({
    mutationFn: (d: { id: string; status: "aktif" | "lunas" | "macet" }) => statusFn({ data: d }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["pinjaman"] }),
  });

  function cetakUlangPerjanjian(p: any) {
    const est = hitungAngsuranBulanan(Number(p.pokok), Number(p.bunga_persen), Number(p.tenor_bulan), p.bunga_tipe);
    printHtml(renderSuratPerjanjian({
      namaAnggota: p.anggota?.nama ?? "-",
      nip: p.anggota?.nip,
      jabatan: p.anggota?.jabatan,
      pokok: Number(p.pokok),
      bungaPersen: Number(p.bunga_persen),
      bungaTipe: p.bunga_tipe,
      tenor: Number(p.tenor_bulan),
      tanggalPinjam: p.tanggal_pinjam,
      tglJatuhTempo: p.tgl_jatuh_tempo,
      angsuranBulanan: est.total,
      nomor: p.id,
      operator: p.dibuat_oleh ?? operator,
    }));
  }

  function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.anggota_id) return toast.error("Pilih anggota");
    const pokok = Number(form.pokok);
    const tenor = Number(form.tenor_bulan);
    if (!(pokok > 0) || !(tenor > 0)) return toast.error("Isi pokok dan tenor dengan benar");
    const jt = form.tgl_jatuh_tempo ? Number(form.tgl_jatuh_tempo) : null;
    if (jt !== null && (jt < 1 || jt > 31)) return toast.error("Tanggal jatuh tempo antara 1-31");
    const payload = {
      anggota_id: form.anggota_id,
      pokok,
      bunga_persen: Number(form.bunga_persen) || 0,
      bunga_tipe: form.bunga_tipe,
      tenor_bulan: tenor,
      tanggal_pinjam: form.tanggal_pinjam,
      tgl_jatuh_tempo: jt,
      catatan: form.catatan || null,
    };
    if (form.id) updateM.mutate({ id: form.id, ...payload });
    else createM.mutate(payload);
  }

  const preview = form.pokok
    ? hitungAngsuranBulanan(Number(form.pokok), Number(form.bunga_persen) || 0, Number(form.tenor_bulan) || 1, form.bunga_tipe)
    : null;

  const pinjamanAktif = (pinjaman as any[]).filter((p) => p.status !== "lunas");
  const pinjamanLunas = (pinjaman as any[]).filter((p) => p.status === "lunas");

  function renderRow(p: any) {
    const totalBayar = (p.angsuran ?? []).reduce((n: number, a: any) => n + Number(a.pokok), 0);
    const sisa = Number(p.pokok) - totalBayar;
    const hari = p.status === "aktif" ? hariMenujuJatuhTempo(p.tgl_jatuh_tempo) : null;
    const warn = hari !== null && hari <= 3;
    return (
      <TableRow key={p.id} className={cn(warn && "bg-amber-50/60")}>
        <TableCell>{formatTanggal(p.tanggal_pinjam)}</TableCell>
        <TableCell className="font-medium">{p.anggota?.nama ?? "-"}</TableCell>
        <TableCell className="text-right">{rupiah(p.pokok)}</TableCell>
        <TableCell className="text-muted-foreground">{p.tenor_bulan} bln</TableCell>
        <TableCell>
          {p.tgl_jatuh_tempo ? (
            <div className="flex items-center gap-2">
              <span className="text-muted-foreground">tiap tgl. {p.tgl_jatuh_tempo}</span>
              {warn && (
                <Badge variant="destructive" className="gap-1">
                  <AlertTriangle className="w-3 h-3" />
                  {hari === 0 ? "hari ini" : hari && hari < 0 ? "lewat" : `${hari} hari lagi`}
                </Badge>
              )}
            </div>
          ) : (
            <span className="text-muted-foreground">-</span>
          )}
        </TableCell>
        <TableCell className="text-right font-medium">{rupiah(sisa)}</TableCell>
        <TableCell>
          <Select value={p.status} onValueChange={(v: any) => statusM.mutate({ id: p.id, status: v })}>
            <SelectTrigger className="h-8 w-28">
              <SelectValue>
                {p.status === "aktif" && <Badge>Aktif</Badge>}
                {p.status === "lunas" && <Badge variant="secondary">Lunas</Badge>}
                {p.status === "macet" && <Badge variant="destructive">Macet</Badge>}
              </SelectValue>
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="aktif">Aktif</SelectItem>
              <SelectItem value="lunas">Lunas</SelectItem>
              <SelectItem value="macet">Macet</SelectItem>
            </SelectContent>
          </Select>
        </TableCell>
        <TableCell>
          <div className="flex gap-1">
            <Button asChild size="icon" variant="ghost" title="Detail">
              <Link to="/pinjaman/$id" params={{ id: p.id }}><Eye className="w-4 h-4" /></Link>
            </Button>
            <Button size="icon" variant="ghost" onClick={() => openEdit(p)} title="Edit"><Pencil className="w-4 h-4" /></Button>
            <Button size="icon" variant="ghost" onClick={() => cetakUlangPerjanjian(p)} title="Cetak surat perjanjian"><Printer className="w-4 h-4" /></Button>
            <DeleteConfirm
              isSuper={isSuper}
              title="Hapus pinjaman?"
              description="Termasuk seluruh riwayat angsuran."
              onConfirm={(pw) => delM.mutateAsync({ id: p.id, superPassword: pw })}
              trigger={<Button size="icon" variant="ghost"><Trash2 className="w-4 h-4 text-destructive" /></Button>}
            />
          </div>
        </TableCell>
      </TableRow>
    );
  }

  const tableHeader = (
    <TableHeader>
      <TableRow>
        <TableHead>Tanggal</TableHead>
        <TableHead>Anggota</TableHead>
        <TableHead className="text-right">Pokok</TableHead>
        <TableHead>Tenor</TableHead>
        <TableHead>Jatuh Tempo</TableHead>
        <TableHead className="text-right">Sisa</TableHead>
        <TableHead>Status</TableHead>
        <TableHead className="w-0">Aksi</TableHead>
      </TableRow>
    </TableHeader>
  );

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Pinjaman</h1>
          <p className="text-sm text-muted-foreground">Kelola pinjaman anggota dan angsurannya.</p>
        </div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild><Button onClick={openCreate}><Plus className="w-4 h-4" />Ajukan Pinjaman</Button></DialogTrigger>
          <DialogContent className="max-w-lg">
            <DialogHeader><DialogTitle>{form.id ? "Edit Pinjaman" : "Pinjaman Baru"}</DialogTitle></DialogHeader>
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
                <div className="space-y-1.5"><Label>Pokok (Rp)</Label><MoneyInput value={form.pokok} onChange={(v) => setForm({ ...form, pokok: v })} required /></div>
                <div className="space-y-1.5"><Label>Tenor (bulan)</Label><Input type="number" min="1" value={form.tenor_bulan} onChange={(e) => setForm({ ...form, tenor_bulan: e.target.value })} required /></div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label>Tipe Bunga</Label>
                  <Select value={form.bunga_tipe} onValueChange={(v: any) => setForm({ ...form, bunga_tipe: v })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="flat">Flat (% per bulan dari pokok)</SelectItem>
                      <SelectItem value="menurun">Menurun (efektif)</SelectItem>
                      <SelectItem value="tetap">Jasa tetap (Rp per bulan)</SelectItem>
                      <SelectItem value="tanpa">Tanpa bunga</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label>{form.bunga_tipe === "tetap" ? "Jasa (Rp)" : "Bunga (%)"}</Label>
                  {form.bunga_tipe === "tetap" ? (
                    <MoneyInput value={form.bunga_persen} onChange={(v) => setForm({ ...form, bunga_persen: v })} />
                  ) : (
                    <Input type="number" min="0" step="0.01" value={form.bunga_persen} onChange={(e) => setForm({ ...form, bunga_persen: e.target.value })} disabled={form.bunga_tipe === "tanpa"} />
                  )}
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5"><Label>Tanggal Pinjam</Label><Input type="date" value={form.tanggal_pinjam} onChange={(e) => setForm({ ...form, tanggal_pinjam: e.target.value })} required /></div>
                <div className="space-y-1.5">
                  <Label>Tgl. Pembayaran / Bulan</Label>
                  <Input type="number" min="1" max="31" value={form.tgl_jatuh_tempo} onChange={(e) => setForm({ ...form, tgl_jatuh_tempo: e.target.value })} placeholder="cth. 5" />
                  <p className="text-[11px] text-muted-foreground">Tanggal jatuh tempo angsuran setiap bulannya.</p>
                </div>
              </div>
              <div className="space-y-1.5"><Label>Catatan</Label><Textarea rows={2} value={form.catatan} onChange={(e) => setForm({ ...form, catatan: e.target.value })} /></div>

              {preview && (
                <div className="rounded-lg border bg-muted/30 p-3 text-sm">
                  <div className="text-xs text-muted-foreground uppercase mb-1">Estimasi Angsuran per Bulan</div>
                  <div className="flex justify-between"><span>Pokok</span><span className="font-medium">{rupiah(preview.pokok)}</span></div>
                  <div className="flex justify-between"><span>Bunga/Jasa</span><span className="font-medium">{rupiah(preview.bunga)}</span></div>
                  <div className="flex justify-between border-t mt-1 pt-1"><span>Total</span><span className="font-semibold text-primary">{rupiah(preview.total)}</span></div>
                </div>
              )}

              <DialogFooter>
                <Button type="button" variant="ghost" onClick={() => setOpen(false)}>Batal</Button>
                <Button type="submit" disabled={createM.isPending || updateM.isPending}>{form.id ? "Simpan Perubahan" : "Simpan & Cetak Perjanjian"}</Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <Card>
        <CardHeader className="flex-row items-center justify-between space-y-0 py-3">
          <CardTitle className="text-base flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-primary" />
            Pinjaman Aktif <span className="text-muted-foreground text-sm font-normal">({pinjamanAktif.length})</span>
          </CardTitle>
          <p className="text-xs text-muted-foreground">Baris kuning: jatuh tempo ≤ 3 hari.</p>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            {tableHeader}
            <TableBody>
              {pinjamanAktif.length === 0 && (
                <TableRow><TableCell colSpan={8} className="text-center text-sm text-muted-foreground py-8">Tidak ada pinjaman aktif.</TableCell></TableRow>
              )}
              {pinjamanAktif.map(renderRow)}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="py-3">
          <CardTitle className="text-base flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-600" />
            Pinjaman Lunas <span className="text-muted-foreground text-sm font-normal">({pinjamanLunas.length})</span>
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            {tableHeader}
            <TableBody>
              {pinjamanLunas.length === 0 && (
                <TableRow><TableCell colSpan={8} className="text-center text-sm text-muted-foreground py-8">Belum ada pinjaman lunas.</TableCell></TableRow>
              )}
              {pinjamanLunas.map(renderRow)}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
