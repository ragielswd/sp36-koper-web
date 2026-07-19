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
import { ArrowLeft, Plus, Trash2, Printer, CheckCircle2, Circle } from "lucide-react";
import { formatTanggal, rupiah, hitungAngsuranBulanan } from "@/lib/format";
import { toast } from "sonner";
import logoAsset from "@/assets/logo-koperasi.png.asset.json";

export const Route = createFileRoute("/_app/pinjaman_/$id")({
  head: () => ({ meta: [{ title: "Detail Pinjaman — Koperasi SMPN 36" }] }),
  component: PinjamanDetailPage,
});

type Angsuran = {
  id: string;
  tanggal: string;
  pokok: number | string;
  bunga: number | string;
  denda: number | string;
  catatan?: string | null;
};

function cetakKuitansi(opts: {
  no: number;
  totalTenor: number;
  namaAnggota: string;
  nip?: string | null;
  pokok: number;
  bunga: number;
  denda: number;
  tanggal: string;
  catatan?: string | null;
}) {
  const total = opts.pokok + opts.bunga + opts.denda;
  const terbilangTotal = rupiah(total);
  const html = `<!doctype html>
<html><head><meta charset="utf-8"><title>Kuitansi Angsuran ${opts.no}</title>
<style>
  * { box-sizing: border-box; }
  body { font-family: ui-sans-serif, system-ui, sans-serif; margin: 24px; color:#111827; }
  .wrap { max-width: 620px; margin: 0 auto; border: 1px solid #d1d5db; padding: 24px; position:relative; overflow:hidden; }
  .wrap::before { content:""; position:absolute; inset:0; background: url('${logoAsset.url}') center/60% no-repeat; opacity:.06; pointer-events:none; }
  header { display:flex; align-items:center; gap:12px; border-bottom:2px solid #111827; padding-bottom:12px; margin-bottom:16px; }
  header img { width:56px; height:56px; object-fit:contain; }
  h1 { font-size: 16px; margin:0; }
  .sub { font-size: 12px; color:#4b5563; }
  .title { text-align:center; font-weight:700; letter-spacing:.08em; text-transform:uppercase; margin:12px 0; font-size:14px; }
  table { width:100%; font-size:13px; border-collapse:collapse; }
  td { padding: 4px 6px; vertical-align: top; }
  td.k { color:#4b5563; width: 38%; }
  .total { border-top:1px dashed #9ca3af; margin-top:10px; padding-top:8px; display:flex; justify-content:space-between; font-weight:700; font-size:15px; }
  .sign { display:flex; justify-content:space-between; margin-top:40px; font-size:12px; }
  .sign div { text-align:center; width:200px; }
  .line { border-top:1px solid #111827; margin-top:56px; padding-top:4px; }
  @media print { .noprint { display:none } body { margin: 0 } .wrap { border: none } }
</style></head><body>
<div class="wrap">
  <header>
    <img src="${logoAsset.url}" alt=""/>
    <div>
      <h1>Koperasi Simpan Pinjam SMP Negeri 36</h1>
      <div class="sub">Kuitansi Pembayaran Angsuran</div>
    </div>
  </header>
  <div class="title">Kuitansi No. ${String(opts.no).padStart(3, "0")} / ${opts.totalTenor}</div>
  <table>
    <tr><td class="k">Telah diterima dari</td><td>: <b>${opts.namaAnggota}</b>${opts.nip ? " (NIP " + opts.nip + ")" : ""}</td></tr>
    <tr><td class="k">Tanggal pembayaran</td><td>: ${formatTanggal(opts.tanggal)}</td></tr>
    <tr><td class="k">Angsuran ke</td><td>: ${opts.no} dari ${opts.totalTenor}</td></tr>
    <tr><td class="k">Pokok</td><td>: ${rupiah(opts.pokok)}</td></tr>
    <tr><td class="k">Bunga / Jasa</td><td>: ${rupiah(opts.bunga)}</td></tr>
    <tr><td class="k">Denda</td><td>: ${rupiah(opts.denda)}</td></tr>
    ${opts.catatan ? `<tr><td class="k">Catatan</td><td>: ${opts.catatan}</td></tr>` : ""}
  </table>
  <div class="total"><span>Total Pembayaran</span><span>${terbilangTotal}</span></div>
  <div class="sign">
    <div><div class="line">Anggota</div></div>
    <div><div class="line">Bendahara Koperasi</div></div>
  </div>
</div>
<script>window.addEventListener('load',()=>{setTimeout(()=>window.print(),200)})</script>
</body></html>`;
  const w = window.open("", "_blank", "width=800,height=900");
  if (!w) return toast.error("Popup diblokir browser");
  w.document.open();
  w.document.write(html);
  w.document.close();
}

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
  const angsuran = (data.angsuran as Angsuran[]).slice().sort((a, b) => a.tanggal.localeCompare(b.tanggal));
  const totalPokokBayar = angsuran.reduce((n, a) => n + Number(a.pokok), 0);
  const totalBungaBayar = angsuran.reduce((n, a) => n + Number(a.bunga), 0);
  const sisa = Number(p.pokok) - totalPokokBayar;
  const preview = hitungAngsuranBulanan(Number(p.pokok), Number(p.bunga_persen), Number(p.tenor_bulan), p.bunga_tipe);
  const tenor = Number(p.tenor_bulan);

  // Build tenor schedule (jadwal): 1..tenor rows, each expected pokok + bunga per bulan.
  const jadwal = Array.from({ length: tenor }, (_, i) => {
    const bayar = angsuran[i]; // pair sequentially by index
    return {
      no: i + 1,
      expectedPokok: preview.pokok,
      expectedBunga: preview.bunga,
      expectedTotal: preview.total,
      bayar,
    };
  });

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
        <Card><CardContent className="p-4"><div className="text-xs uppercase text-muted-foreground">Angsuran / Bulan</div><div className="text-lg font-semibold mt-1">{rupiah(preview.total)}</div></CardContent></Card>
        <Card><CardContent className="p-4"><div className="text-xs uppercase text-muted-foreground">Sisa Pokok</div><div className="text-lg font-semibold mt-1 text-primary">{rupiah(sisa)}</div></CardContent></Card>
      </div>

      <Card>
        <CardHeader className="flex-row items-center justify-between space-y-0">
          <div>
            <CardTitle className="text-base">Jadwal Tenor & Pembayaran</CardTitle>
            <p className="text-xs text-muted-foreground mt-0.5">Klik "Cetak Kuitansi" untuk setiap tenor yang sudah dibayarkan.</p>
          </div>
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
                <TableHead className="w-12">#</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Tanggal Bayar</TableHead>
                <TableHead className="text-right">Pokok</TableHead>
                <TableHead className="text-right">Bunga</TableHead>
                <TableHead className="text-right">Denda</TableHead>
                <TableHead className="text-right">Total</TableHead>
                <TableHead className="w-0">Aksi</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {jadwal.map((row) => {
                const paid = !!row.bayar;
                return (
                  <TableRow key={row.no} className={paid ? "" : "text-muted-foreground"}>
                    <TableCell className="font-medium">{row.no}</TableCell>
                    <TableCell>
                      {paid ? (
                        <span className="inline-flex items-center gap-1 text-emerald-600 text-xs font-medium"><CheckCircle2 className="w-3.5 h-3.5" />Lunas</span>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-xs"><Circle className="w-3.5 h-3.5" />Belum</span>
                      )}
                    </TableCell>
                    <TableCell>{paid ? formatTanggal(row.bayar!.tanggal) : "-"}</TableCell>
                    <TableCell className="text-right">{rupiah(paid ? Number(row.bayar!.pokok) : row.expectedPokok)}</TableCell>
                    <TableCell className="text-right">{rupiah(paid ? Number(row.bayar!.bunga) : row.expectedBunga)}</TableCell>
                    <TableCell className="text-right">{rupiah(paid ? Number(row.bayar!.denda) : 0)}</TableCell>
                    <TableCell className="text-right font-medium">
                      {rupiah(paid ? Number(row.bayar!.pokok) + Number(row.bayar!.bunga) + Number(row.bayar!.denda) : row.expectedTotal)}
                    </TableCell>
                    <TableCell>
                      {paid ? (
                        <div className="flex gap-1">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() =>
                              cetakKuitansi({
                                no: row.no,
                                totalTenor: tenor,
                                namaAnggota: p.anggota?.nama ?? "-",
                                nip: p.anggota?.nip,
                                pokok: Number(row.bayar!.pokok),
                                bunga: Number(row.bayar!.bunga),
                                denda: Number(row.bayar!.denda),
                                tanggal: row.bayar!.tanggal,
                                catatan: row.bayar!.catatan,
                              })
                            }
                          >
                            <Printer className="w-3.5 h-3.5" />Kuitansi
                          </Button>
                          <AlertDialog>
                            <AlertDialogTrigger asChild><Button size="icon" variant="ghost"><Trash2 className="w-4 h-4 text-destructive" /></Button></AlertDialogTrigger>
                            <AlertDialogContent>
                              <AlertDialogHeader><AlertDialogTitle>Hapus angsuran ini?</AlertDialogTitle></AlertDialogHeader>
                              <AlertDialogFooter><AlertDialogCancel>Batal</AlertDialogCancel><AlertDialogAction onClick={() => delM.mutate(row.bayar!.id)}>Hapus</AlertDialogAction></AlertDialogFooter>
                            </AlertDialogContent>
                          </AlertDialog>
                        </div>
                      ) : (
                        <span className="text-xs text-muted-foreground">—</span>
                      )}
                    </TableCell>
                  </TableRow>
                );
              })}
              <TableRow className="bg-muted/40 font-medium">
                <TableCell colSpan={3}>Total Terbayar</TableCell>
                <TableCell className="text-right">{rupiah(totalPokokBayar)}</TableCell>
                <TableCell className="text-right">{rupiah(totalBungaBayar)}</TableCell>
                <TableCell />
                <TableCell className="text-right">{rupiah(totalPokokBayar + totalBungaBayar)}</TableCell>
                <TableCell />
              </TableRow>
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
