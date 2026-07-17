import { createFileRoute } from "@tanstack/react-router";
import { useSuspenseQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { listSimpanan, listPinjaman, listAnggota } from "@/lib/koperasi.functions";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { rupiah } from "@/lib/format";
import { Button } from "@/components/ui/button";
import { Printer } from "lucide-react";

export const Route = createFileRoute("/_app/laporan")({
  head: () => ({ meta: [{ title: "Laporan — Koperasi SMPN 36" }] }),
  component: LaporanPage,
});

function LaporanPage() {
  const anggotaFn = useServerFn(listAnggota);
  const simpananFn = useServerFn(listSimpanan);
  const pinjamanFn = useServerFn(listPinjaman);
  const { data: anggota } = useSuspenseQuery({ queryKey: ["anggota"], queryFn: () => anggotaFn() });
  const { data: simpanan } = useSuspenseQuery({ queryKey: ["simpanan"], queryFn: () => simpananFn() });
  const { data: pinjaman } = useSuspenseQuery({ queryKey: ["pinjaman"], queryFn: () => pinjamanFn() });

  // Aggregate per anggota
  const rekap = (anggota as any[]).map((a) => {
    const s = (simpanan as any[]).filter((x) => x.anggota_id === a.id);
    const setor = s.filter((x) => x.tipe === "setor").reduce((n, x) => n + Number(x.jumlah), 0);
    const tarik = s.filter((x) => x.tipe === "tarik").reduce((n, x) => n + Number(x.jumlah), 0);
    const saldoSimpanan = setor - tarik;

    const p = (pinjaman as any[]).filter((x) => x.anggota_id === a.id);
    const totalPokok = p.reduce((n, x) => n + Number(x.pokok), 0);
    const totalBayar = p.reduce((n, x) => n + (x.angsuran ?? []).reduce((m: number, ag: any) => m + Number(ag.pokok), 0), 0);
    const sisaPinjaman = totalPokok - totalBayar;
    const pinjamanAktif = p.filter((x) => x.status === "aktif").length;

    return { anggota: a, saldoSimpanan, sisaPinjaman, pinjamanAktif };
  });

  const totalSimpanan = rekap.reduce((n, r) => n + r.saldoSimpanan, 0);
  const totalSisaPinjaman = rekap.reduce((n, r) => n + r.sisaPinjaman, 0);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Laporan</h1>
          <p className="text-sm text-muted-foreground">Rekap saldo simpanan dan sisa pinjaman per anggota.</p>
        </div>
        <Button variant="outline" onClick={() => window.print()}>
          <Printer className="w-4 h-4" />Cetak
        </Button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card><CardContent className="p-4"><div className="text-xs uppercase text-muted-foreground">Total Anggota</div><div className="text-xl font-semibold mt-1">{(anggota as any[]).length}</div></CardContent></Card>
        <Card><CardContent className="p-4"><div className="text-xs uppercase text-muted-foreground">Saldo Simpanan</div><div className="text-xl font-semibold mt-1 text-emerald-600">{rupiah(totalSimpanan)}</div></CardContent></Card>
        <Card><CardContent className="p-4"><div className="text-xs uppercase text-muted-foreground">Piutang Pinjaman</div><div className="text-xl font-semibold mt-1 text-amber-600">{rupiah(totalSisaPinjaman)}</div></CardContent></Card>
      </div>

      <Card>
        <CardHeader><CardTitle className="text-base">Rekap per Anggota</CardTitle></CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nama</TableHead>
                <TableHead>NIP</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Saldo Simpanan</TableHead>
                <TableHead className="text-right">Sisa Pinjaman</TableHead>
                <TableHead className="text-center">Pinjaman Aktif</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rekap.length === 0 && (
                <TableRow><TableCell colSpan={6} className="text-center text-sm text-muted-foreground py-8">Belum ada data.</TableCell></TableRow>
              )}
              {rekap.map((r) => (
                <TableRow key={r.anggota.id}>
                  <TableCell className="font-medium">{r.anggota.nama}</TableCell>
                  <TableCell className="text-muted-foreground">{r.anggota.nip || "-"}</TableCell>
                  <TableCell>{r.anggota.aktif ? <Badge>Aktif</Badge> : <Badge variant="secondary">Nonaktif</Badge>}</TableCell>
                  <TableCell className="text-right">{rupiah(r.saldoSimpanan)}</TableCell>
                  <TableCell className="text-right">{rupiah(r.sisaPinjaman)}</TableCell>
                  <TableCell className="text-center">{r.pinjamanAktif}</TableCell>
                </TableRow>
              ))}
              {rekap.length > 0 && (
                <TableRow className="bg-muted/40 font-medium">
                  <TableCell colSpan={3}>Total</TableCell>
                  <TableCell className="text-right">{rupiah(totalSimpanan)}</TableCell>
                  <TableCell className="text-right">{rupiah(totalSisaPinjaman)}</TableCell>
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
