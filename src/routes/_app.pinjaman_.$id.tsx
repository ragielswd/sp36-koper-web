import { createFileRoute, Link, useRouter, useRouteContext } from "@tanstack/react-router";
import { useSuspenseQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { getPinjamanDetail, createAngsuran, deleteAngsuran, getSettings } from "@/lib/koperasi.functions";
import { WhatsAppTagihanButton } from "@/components/whatsapp-tagihan";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { DeleteConfirm } from "@/components/delete-confirm";
import { useState } from "react";
import { ArrowLeft, Plus, Trash2, Printer, CheckCircle2, Circle, ChevronRight } from "lucide-react";
import { formatTanggal, rupiah, hitungAngsuranBulanan } from "@/lib/format";
import { toast } from "sonner";
import { MoneyInput } from "@/components/money-input";
import { printHtml } from "@/lib/print";
import { renderKuitansiAngsuran } from "@/lib/dokumen";

export const Route = createFileRoute("/_app/pinjaman_/$id")({
  head: () => ({ meta: [{ title: "Detail Pinjaman — Koperasi SMP Negeri 36 Samarinda" }] }),
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

function PinjamanDetailPage() {
  const { id } = Route.useParams();
  const router = useRouter();
  const { user } = useRouteContext({ from: "/_app" });
  const operator = user?.nama ?? "Petugas";
  const isSuper = user?.role === "super";

  const qc = useQueryClient();
  const detailFn = useServerFn(getPinjamanDetail);
  const createFn = useServerFn(createAngsuran);
  const delFn = useServerFn(deleteAngsuran);
  const settingsFn = useServerFn(getSettings);

  const { data } = useSuspenseQuery({
    queryKey: ["pinjaman", id],
    queryFn: () => detailFn({ data: { id } }),
  });
  const { data: settings } = useSuspenseQuery({ queryKey: ["settings"], queryFn: () => settingsFn() });
  const koperasiWa = (settings as any)?.whatsapp_number ?? null;

  const p = data.pinjaman as any;
  const angsuran = (data.angsuran as Angsuran[]).slice().sort((a, b) => a.tanggal.localeCompare(b.tanggal));
  const totalPokokBayar = angsuran.reduce((n, a) => n + Number(a.pokok), 0);
  const totalBungaBayar = angsuran.reduce((n, a) => n + Number(a.bunga), 0);
  const sisa = Number(p.pokok) - totalPokokBayar;
  const preview = hitungAngsuranBulanan(Number(p.pokok), Number(p.bunga_persen), Number(p.tenor_bulan), p.bunga_tipe);
  const tenor = Number(p.tenor_bulan);

  let running = Number(p.pokok);
  const jadwal = Array.from({ length: tenor }, (_, i) => {
    const bayar = angsuran[i];
    const sisaSebelum = running;
    if (bayar) running = Math.max(0, running - Number(bayar.pokok));
    return {
      no: i + 1,
      expectedPokok: preview.pokok,
      expectedBunga: preview.bunga,
      expectedTotal: preview.total,
      sisaSebelum,
      sisaSetelah: bayar ? running : Math.max(0, sisaSebelum - preview.pokok),
      bayar,
    };
  });

  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({
    tanggal: new Date().toISOString().slice(0, 10),
    pokok: String(Math.round(preview.pokok)),
    bunga: String(Math.round(preview.bunga)),
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
    mutationFn: (d: { id: string; superPassword?: string }) => delFn({ data: d }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["pinjaman", id] });
      qc.invalidateQueries({ queryKey: ["dashboard"] });
      toast.success("Angsuran dihapus");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  function submit(e: React.FormEvent) {
    e.preventDefault();
    createM.mutate({
      pinjaman_id: id,
      tanggal: form.tanggal,
      pokok: Number(form.pokok) || 0,
      bunga: Number(form.bunga) || 0,
      denda: 0,
      catatan: form.catatan || null,
    });
  }

  const sisaSaatCatat = Math.max(0, sisa - (Number(form.pokok) || 0));

  function goBack() {
    if (typeof window !== "undefined" && window.history.length > 1) router.history.back();
    else router.navigate({ to: "/pinjaman" });
  }

  return (
    <div className="space-y-4">
      <nav className="flex items-center gap-1 text-sm text-muted-foreground" aria-label="Breadcrumb">
        <Link to="/dashboard" className="hover:text-foreground">Dashboard</Link>
        <ChevronRight className="w-3.5 h-3.5" />
        <Link to="/pinjaman" className="hover:text-foreground">Pinjaman</Link>
        <ChevronRight className="w-3.5 h-3.5" />
        <span className="text-foreground font-medium">{p.anggota?.nama ?? "Detail"}</span>
      </nav>

      <div className="flex items-center gap-2">
        <Button variant="ghost" size="sm" onClick={goBack}><ArrowLeft className="w-4 h-4" />Kembali</Button>
      </div>

      <div className="flex items-start justify-between gap-3 flex-wrap">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">{p.anggota?.nama}</h1>
          <p className="text-sm text-muted-foreground">
            Pinjaman sejak {formatTanggal(p.tanggal_pinjam)} · NIP {p.anggota?.nip || "-"}
            {p.tgl_jatuh_tempo ? ` · jatuh tempo tiap tgl. ${p.tgl_jatuh_tempo}` : ""}
          </p>
        </div>
        {p.status === "aktif" && <Badge>Aktif</Badge>}
        {p.status === "lunas" && <Badge variant="secondary">Lunas</Badge>}
        {p.status === "macet" && <Badge variant="destructive">Macet</Badge>}
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Card><CardContent className="p-4"><div className="text-xs uppercase text-muted-foreground">Pokok</div><div className="text-lg font-semibold mt-1">{rupiah(p.pokok)}</div></CardContent></Card>
        <Card><CardContent className="p-4"><div className="text-xs uppercase text-muted-foreground">Tenor</div><div className="text-lg font-semibold mt-1">{p.tenor_bulan} bulan</div></CardContent></Card>
        <Card><CardContent className="p-4"><div className="text-xs uppercase text-muted-foreground">Angsuran / Bulan</div><div className="text-lg font-semibold mt-1">{rupiah(preview.total)}</div></CardContent></Card>
        <Card><CardContent className="p-4"><div className="text-xs uppercase text-muted-foreground">Sisa Pinjaman</div><div className="text-lg font-semibold mt-1 text-primary">{rupiah(sisa)}</div></CardContent></Card>
      </div>

      <Card>
        <CardHeader className="flex-row items-center justify-between space-y-0">
          <div>
            <CardTitle className="text-base">Jadwal Tenor & Pembayaran</CardTitle>
            <p className="text-xs text-muted-foreground mt-0.5">Klik "Kuitansi" untuk mencetak kuitansi sesuai tenor & status pembayarannya.</p>
          </div>
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild><Button size="sm" disabled={sisa <= 0}><Plus className="w-4 h-4" />Catat Angsuran</Button></DialogTrigger>
            <DialogContent>
              <DialogHeader><DialogTitle>Catat Angsuran</DialogTitle></DialogHeader>
              <form onSubmit={submit} className="space-y-3">
                <div className="space-y-1.5"><Label>Tanggal</Label><Input type="date" value={form.tanggal} onChange={(e) => setForm({ ...form, tanggal: e.target.value })} required /></div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5"><Label>Pokok (Rp)</Label><MoneyInput value={form.pokok} onChange={(v) => setForm({ ...form, pokok: v })} /></div>
                  <div className="space-y-1.5"><Label>Bunga/Jasa (Rp)</Label><MoneyInput value={form.bunga} onChange={(v) => setForm({ ...form, bunga: v })} /></div>
                </div>
                <div className="space-y-1.5">
                  <Label>Sisa Pinjaman</Label>
                  <div className="rounded-md border bg-muted/40 px-3 py-2 text-sm flex justify-between">
                    <span className="text-muted-foreground">Sebelum bayar</span>
                    <span className="font-medium">{rupiah(sisa)}</span>
                  </div>
                  <div className="rounded-md border bg-muted/40 px-3 py-2 text-sm flex justify-between">
                    <span className="text-muted-foreground">Setelah bayar</span>
                    <span className="font-semibold text-primary">{rupiah(sisaSaatCatat)}</span>
                  </div>
                </div>
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
                <TableHead className="text-right">Sisa Pinjaman</TableHead>
                <TableHead className="text-right">Total</TableHead>
                <TableHead className="w-0">Aksi</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {jadwal.map((row) => {
                const paid = !!row.bayar;
                const rowPokok = paid ? Number(row.bayar!.pokok) : row.expectedPokok;
                const rowBunga = paid ? Number(row.bayar!.bunga) : row.expectedBunga;
                const rowDenda = paid ? Number(row.bayar!.denda) : 0;
                const rowTotal = paid ? rowPokok + rowBunga + rowDenda : row.expectedTotal;
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
                    <TableCell className="text-right">{rupiah(rowPokok)}</TableCell>
                    <TableCell className="text-right">{rupiah(rowBunga)}</TableCell>
                    <TableCell className="text-right">{rupiah(row.sisaSetelah)}</TableCell>
                    <TableCell className="text-right font-medium">{rupiah(rowTotal)}</TableCell>
                    <TableCell>
                      <div className="flex gap-1">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() =>
                            printHtml(renderKuitansiAngsuran({
                              no: row.no,
                              totalTenor: tenor,
                              namaAnggota: p.anggota?.nama ?? "-",
                              nip: p.anggota?.nip,
                              pokok: rowPokok,
                              bunga: rowBunga,
                              denda: rowDenda,
                              tanggal: paid ? row.bayar!.tanggal : new Date().toISOString().slice(0, 10),
                              catatan: paid ? row.bayar!.catatan : "Kuitansi tenor belum dibayar (rencana).",
                              sisaSetelah: row.sisaSetelah,
                              status: paid ? "Lunas" : "Belum",
                              operator: (paid ? (row.bayar as any).dibuat_oleh : p.dibuat_oleh) ?? operator,
                            }))
                          }
                        >
                          <Printer className="w-3.5 h-3.5" />Kuitansi
                        </Button>
                        {paid && (
                          <DeleteConfirm
                            isSuper={isSuper}
                            title="Hapus angsuran ini?"
                            description="Sisa pinjaman akan disesuaikan otomatis."
                            onConfirm={(pw) => delM.mutateAsync({ id: row.bayar!.id, superPassword: pw })}
                            trigger={<Button size="icon" variant="ghost"><Trash2 className="w-4 h-4 text-destructive" /></Button>}
                          />
                        )}
                      </div>
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
