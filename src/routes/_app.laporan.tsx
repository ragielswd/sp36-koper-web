import { createFileRoute } from "@tanstack/react-router";
import { useSuspenseQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useMemo, useState } from "react";
import * as XLSX from "xlsx";
import { listSimpanan, listPinjaman, listAnggota } from "@/lib/koperasi.functions";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { rupiah, formatTanggal } from "@/lib/format";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Printer, FileSpreadsheet, RotateCcw } from "lucide-react";

export const Route = createFileRoute("/_app/laporan")({
  head: () => ({ meta: [{ title: "Laporan — Koperasi SMPN 36" }] }),
  component: LaporanPage,
});

type ReportView = "simpanan" | "pinjaman" | "mutasi";

type Filters = {
  dari: string;
  sampai: string;
  anggotaId: string;
  statusAnggota: "semua" | "aktif" | "nonaktif";
  jenisSimpanan: "semua" | "pokok" | "wajib" | "sukarela";
  statusPinjaman: "semua" | "aktif" | "lunas" | "macet";
};

const defaultFilters: Filters = {
  dari: "",
  sampai: "",
  anggotaId: "semua",
  statusAnggota: "semua",
  jenisSimpanan: "semua",
  statusPinjaman: "semua",
};

function inRange(tanggal: string, dari: string, sampai: string) {
  if (dari && tanggal < dari) return false;
  if (sampai && tanggal > sampai) return false;
  return true;
}

function LaporanPage() {
  const anggotaFn = useServerFn(listAnggota);
  const simpananFn = useServerFn(listSimpanan);
  const pinjamanFn = useServerFn(listPinjaman);
  const { data: anggota } = useSuspenseQuery({ queryKey: ["anggota"], queryFn: () => anggotaFn() });
  const { data: simpanan } = useSuspenseQuery({ queryKey: ["simpanan"], queryFn: () => simpananFn() });
  const { data: pinjaman } = useSuspenseQuery({ queryKey: ["pinjaman"], queryFn: () => pinjamanFn() });

  const [view, setView] = useState<ReportView>("simpanan");
  const [f, setF] = useState<Filters>(defaultFilters);

  const anggotaMap = useMemo(() => new Map((anggota as any[]).map((a) => [a.id, a])), [anggota]);

  const filteredAnggotaIds = useMemo(() => {
    const list = (anggota as any[]).filter((a) => {
      if (f.anggotaId !== "semua" && a.id !== f.anggotaId) return false;
      if (f.statusAnggota === "aktif" && !a.aktif) return false;
      if (f.statusAnggota === "nonaktif" && a.aktif) return false;
      return true;
    });
    return new Set(list.map((a) => a.id));
  }, [anggota, f]);

  // ==== SIMPANAN rows ====
  const simpananRows = useMemo(() => {
    return (simpanan as any[])
      .filter((s) => filteredAnggotaIds.has(s.anggota_id))
      .filter((s) => f.jenisSimpanan === "semua" || s.jenis === f.jenisSimpanan)
      .filter((s) => inRange(s.tanggal, f.dari, f.sampai))
      .sort((a, b) => a.tanggal.localeCompare(b.tanggal));
  }, [simpanan, filteredAnggotaIds, f]);

  const simpananTotals = useMemo(() => {
    const setor = simpananRows.filter((s) => s.tipe === "setor").reduce((n, s) => n + Number(s.jumlah), 0);
    const tarik = simpananRows.filter((s) => s.tipe === "tarik").reduce((n, s) => n + Number(s.jumlah), 0);
    return { setor, tarik, saldo: setor - tarik };
  }, [simpananRows]);

  // ==== PINJAMAN rows ====
  const pinjamanRows = useMemo(() => {
    return (pinjaman as any[])
      .filter((p) => filteredAnggotaIds.has(p.anggota_id))
      .filter((p) => f.statusPinjaman === "semua" || p.status === f.statusPinjaman)
      .filter((p) => inRange(p.tanggal_pinjam, f.dari, f.sampai))
      .map((p) => {
        const angsuran = (p.angsuran ?? []).filter((ag: any) => inRange(ag.tanggal, f.dari, f.sampai));
        const totalBayarPokok = angsuran.reduce((n: number, a: any) => n + Number(a.pokok), 0);
        const totalBayarBunga = angsuran.reduce((n: number, a: any) => n + Number(a.bunga), 0);
        const totalDenda = angsuran.reduce((n: number, a: any) => n + Number(a.denda), 0);
        return { ...p, angsuran, totalBayarPokok, totalBayarBunga, totalDenda, sisa: Number(p.pokok) - totalBayarPokok };
      })
      .sort((a, b) => a.tanggal_pinjam.localeCompare(b.tanggal_pinjam));
  }, [pinjaman, filteredAnggotaIds, f]);

  const pinjamanTotals = useMemo(() => {
    const pokok = pinjamanRows.reduce((n, p) => n + Number(p.pokok), 0);
    const bayarPokok = pinjamanRows.reduce((n, p) => n + p.totalBayarPokok, 0);
    const bayarBunga = pinjamanRows.reduce((n, p) => n + p.totalBayarBunga, 0);
    const denda = pinjamanRows.reduce((n, p) => n + p.totalDenda, 0);
    return { pokok, bayarPokok, bayarBunga, denda, sisa: pokok - bayarPokok };
  }, [pinjamanRows]);

  // ==== MUTASI SALDO KOPERASI (kas gabungan) ====
  const mutasiRows = useMemo(() => {
    type Row = { tanggal: string; keterangan: string; anggota: string; masuk: number; keluar: number };
    const rows: Row[] = [];
    for (const s of simpananRows) {
      const nama = anggotaMap.get(s.anggota_id)?.nama ?? "-";
      if (s.tipe === "setor") {
        rows.push({ tanggal: s.tanggal, keterangan: `Setoran simpanan ${s.jenis}`, anggota: nama, masuk: Number(s.jumlah), keluar: 0 });
      } else {
        rows.push({ tanggal: s.tanggal, keterangan: `Penarikan simpanan ${s.jenis}`, anggota: nama, masuk: 0, keluar: Number(s.jumlah) });
      }
    }
    for (const p of pinjamanRows) {
      const nama = anggotaMap.get(p.anggota_id)?.nama ?? "-";
      rows.push({ tanggal: p.tanggal_pinjam, keterangan: `Pencairan pinjaman`, anggota: nama, masuk: 0, keluar: Number(p.pokok) });
      for (const a of p.angsuran as any[]) {
        rows.push({
          tanggal: a.tanggal,
          keterangan: `Angsuran pinjaman`,
          anggota: nama,
          masuk: Number(a.pokok) + Number(a.bunga) + Number(a.denda),
          keluar: 0,
        });
      }
    }
    rows.sort((a, b) => a.tanggal.localeCompare(b.tanggal));
    let saldo = 0;
    return rows.map((r) => {
      saldo += r.masuk - r.keluar;
      return { ...r, saldo };
    });
  }, [simpananRows, pinjamanRows, anggotaMap]);

  const mutasiTotals = useMemo(() => {
    const masuk = mutasiRows.reduce((n, r) => n + r.masuk, 0);
    const keluar = mutasiRows.reduce((n, r) => n + r.keluar, 0);
    return { masuk, keluar, saldo: masuk - keluar };
  }, [mutasiRows]);

  const viewLabel = view === "simpanan" ? "Laporan Simpanan" : view === "pinjaman" ? "Laporan Pinjaman" : "Mutasi Saldo Koperasi";

  function exportExcel() {
    const wb = XLSX.utils.book_new();
    const info = [
      ["Koperasi Simpan Pinjam SMP Negeri 36"],
      [viewLabel],
      ["Dicetak", new Date().toLocaleString("id-ID")],
      ["Periode", `${f.dari || "awal"} s/d ${f.sampai || "sekarang"}`],
      ["Anggota", f.anggotaId === "semua" ? "Semua" : anggotaMap.get(f.anggotaId)?.nama ?? "-"],
      [],
    ];
    let rows: Record<string, any>[] = [];
    let sheetName = "Laporan";

    if (view === "simpanan") {
      sheetName = "Simpanan";
      rows = simpananRows.map((s) => ({
        Tanggal: s.tanggal,
        Anggota: anggotaMap.get(s.anggota_id)?.nama ?? "-",
        Jenis: s.jenis,
        Tipe: s.tipe,
        Jumlah: Number(s.jumlah),
        Catatan: s.catatan || "",
      }));
    } else if (view === "pinjaman") {
      sheetName = "Pinjaman";
      rows = pinjamanRows.map((p) => ({
        "Tgl Pinjam": p.tanggal_pinjam,
        Anggota: anggotaMap.get(p.anggota_id)?.nama ?? "-",
        Pokok: Number(p.pokok),
        "Bunga (%)": Number(p.bunga_persen),
        "Tipe Bunga": p.bunga_tipe,
        "Tenor (bln)": p.tenor_bulan,
        Status: p.status,
        "Bayar Pokok": p.totalBayarPokok,
        "Bayar Bunga": p.totalBayarBunga,
        Denda: p.totalDenda,
        "Sisa Pokok": p.sisa,
      }));
    } else {
      sheetName = "Mutasi";
      rows = mutasiRows.map((r) => ({
        Tanggal: r.tanggal,
        Keterangan: r.keterangan,
        Anggota: r.anggota,
        Masuk: r.masuk,
        Keluar: r.keluar,
        Saldo: r.saldo,
      }));
    }

    const ws = XLSX.utils.aoa_to_sheet(info);
    XLSX.utils.sheet_add_json(ws, rows, { origin: -1 });
    XLSX.utils.book_append_sheet(wb, ws, sheetName);
    const stamp = new Date().toISOString().slice(0, 10);
    XLSX.writeFile(wb, `laporan-${view}-${stamp}.xlsx`);
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-2 print:hidden">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Laporan</h1>
          <p className="text-sm text-muted-foreground">Pilih jenis laporan lalu terapkan filter yang diinginkan.</p>
        </div>
        <div className="flex gap-2 items-center">
          <Select value={view} onValueChange={(v) => setView(v as ReportView)}>
            <SelectTrigger className="w-56"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="simpanan">Laporan Simpanan</SelectItem>
              <SelectItem value="pinjaman">Laporan Pinjaman</SelectItem>
              <SelectItem value="mutasi">Mutasi Saldo Koperasi</SelectItem>
            </SelectContent>
          </Select>
          <Button variant="outline" onClick={() => window.print()}><Printer className="w-4 h-4" />Cetak</Button>
          <Button onClick={exportExcel}><FileSpreadsheet className="w-4 h-4" />Ekspor Excel</Button>
        </div>
      </div>

      <Card className="print:hidden">
        <CardHeader className="pb-3"><CardTitle className="text-base">Filter</CardTitle></CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
            <div className="space-y-1.5">
              <Label>Dari Tanggal</Label>
              <Input type="date" value={f.dari} onChange={(e) => setF({ ...f, dari: e.target.value })} />
            </div>
            <div className="space-y-1.5">
              <Label>Sampai Tanggal</Label>
              <Input type="date" value={f.sampai} onChange={(e) => setF({ ...f, sampai: e.target.value })} />
            </div>
            <div className="space-y-1.5">
              <Label>Anggota</Label>
              <Select value={f.anggotaId} onValueChange={(v) => setF({ ...f, anggotaId: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="semua">Semua Anggota</SelectItem>
                  {(anggota as any[]).map((a) => (
                    <SelectItem key={a.id} value={a.id}>{a.nama}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Status Anggota</Label>
              <Select value={f.statusAnggota} onValueChange={(v) => setF({ ...f, statusAnggota: v as Filters["statusAnggota"] })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="semua">Semua</SelectItem>
                  <SelectItem value="aktif">Aktif</SelectItem>
                  <SelectItem value="nonaktif">Nonaktif</SelectItem>
                </SelectContent>
              </Select>
            </div>
            {view === "simpanan" && (
              <div className="space-y-1.5">
                <Label>Jenis Simpanan</Label>
                <Select value={f.jenisSimpanan} onValueChange={(v) => setF({ ...f, jenisSimpanan: v as Filters["jenisSimpanan"] })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="semua">Semua</SelectItem>
                    <SelectItem value="pokok">Pokok</SelectItem>
                    <SelectItem value="wajib">Wajib</SelectItem>
                    <SelectItem value="sukarela">Sukarela</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            )}
            {view === "pinjaman" && (
              <div className="space-y-1.5">
                <Label>Status Pinjaman</Label>
                <Select value={f.statusPinjaman} onValueChange={(v) => setF({ ...f, statusPinjaman: v as Filters["statusPinjaman"] })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="semua">Semua</SelectItem>
                    <SelectItem value="aktif">Aktif</SelectItem>
                    <SelectItem value="lunas">Lunas</SelectItem>
                    <SelectItem value="macet">Macet</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            )}
          </div>
          <div className="mt-3 flex justify-end">
            <Button variant="ghost" size="sm" onClick={() => setF(defaultFilters)}>
              <RotateCcw className="w-4 h-4" />Reset Filter
            </Button>
          </div>
        </CardContent>
      </Card>

      {view === "simpanan" && (
        <>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <Card><CardContent className="p-4"><div className="text-xs uppercase text-muted-foreground">Total Setoran</div><div className="text-xl font-semibold mt-1 text-emerald-600">{rupiah(simpananTotals.setor)}</div></CardContent></Card>
            <Card><CardContent className="p-4"><div className="text-xs uppercase text-muted-foreground">Total Penarikan</div><div className="text-xl font-semibold mt-1 text-amber-600">{rupiah(simpananTotals.tarik)}</div></CardContent></Card>
            <Card><CardContent className="p-4"><div className="text-xs uppercase text-muted-foreground">Saldo Bersih</div><div className="text-xl font-semibold mt-1">{rupiah(simpananTotals.saldo)}</div></CardContent></Card>
          </div>
          <Card>
            <CardHeader><CardTitle className="text-base">Laporan Simpanan</CardTitle></CardHeader>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Tanggal</TableHead>
                    <TableHead>Anggota</TableHead>
                    <TableHead>Jenis</TableHead>
                    <TableHead>Tipe</TableHead>
                    <TableHead className="text-right">Jumlah</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {simpananRows.length === 0 && (
                    <TableRow><TableCell colSpan={5} className="text-center text-sm text-muted-foreground py-8">Tidak ada data.</TableCell></TableRow>
                  )}
                  {simpananRows.map((s) => (
                    <TableRow key={s.id}>
                      <TableCell>{formatTanggal(s.tanggal)}</TableCell>
                      <TableCell className="font-medium">{anggotaMap.get(s.anggota_id)?.nama ?? "-"}</TableCell>
                      <TableCell className="capitalize">{s.jenis}</TableCell>
                      <TableCell>
                        {s.tipe === "setor" ? <Badge>Setor</Badge> : <Badge variant="secondary">Tarik</Badge>}
                      </TableCell>
                      <TableCell className="text-right">{rupiah(s.jumlah)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </>
      )}

      {view === "pinjaman" && (
        <>
          <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
            <Card><CardContent className="p-4"><div className="text-xs uppercase text-muted-foreground">Total Pokok</div><div className="text-xl font-semibold mt-1">{rupiah(pinjamanTotals.pokok)}</div></CardContent></Card>
            <Card><CardContent className="p-4"><div className="text-xs uppercase text-muted-foreground">Terbayar (Pokok)</div><div className="text-xl font-semibold mt-1 text-emerald-600">{rupiah(pinjamanTotals.bayarPokok)}</div></CardContent></Card>
            <Card><CardContent className="p-4"><div className="text-xs uppercase text-muted-foreground">Bunga Diterima</div><div className="text-xl font-semibold mt-1">{rupiah(pinjamanTotals.bayarBunga)}</div></CardContent></Card>
            <Card><CardContent className="p-4"><div className="text-xs uppercase text-muted-foreground">Sisa Piutang</div><div className="text-xl font-semibold mt-1 text-amber-600">{rupiah(pinjamanTotals.sisa)}</div></CardContent></Card>
          </div>
          <Card>
            <CardHeader><CardTitle className="text-base">Laporan Pinjaman</CardTitle></CardHeader>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Tgl Pinjam</TableHead>
                    <TableHead>Anggota</TableHead>
                    <TableHead className="text-right">Pokok</TableHead>
                    <TableHead>Tenor</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Bayar</TableHead>
                    <TableHead className="text-right">Sisa</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {pinjamanRows.length === 0 && (
                    <TableRow><TableCell colSpan={7} className="text-center text-sm text-muted-foreground py-8">Tidak ada data.</TableCell></TableRow>
                  )}
                  {pinjamanRows.map((p) => (
                    <TableRow key={p.id}>
                      <TableCell>{formatTanggal(p.tanggal_pinjam)}</TableCell>
                      <TableCell className="font-medium">{anggotaMap.get(p.anggota_id)?.nama ?? "-"}</TableCell>
                      <TableCell className="text-right">{rupiah(p.pokok)}</TableCell>
                      <TableCell>{p.tenor_bulan} bln</TableCell>
                      <TableCell>
                        {p.status === "aktif" && <Badge>Aktif</Badge>}
                        {p.status === "lunas" && <Badge variant="secondary">Lunas</Badge>}
                        {p.status === "macet" && <Badge variant="destructive">Macet</Badge>}
                      </TableCell>
                      <TableCell className="text-right">{rupiah(p.totalBayarPokok)}</TableCell>
                      <TableCell className="text-right font-medium">{rupiah(p.sisa)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </>
      )}

      {view === "mutasi" && (
        <>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <Card><CardContent className="p-4"><div className="text-xs uppercase text-muted-foreground">Total Kas Masuk</div><div className="text-xl font-semibold mt-1 text-emerald-600">{rupiah(mutasiTotals.masuk)}</div></CardContent></Card>
            <Card><CardContent className="p-4"><div className="text-xs uppercase text-muted-foreground">Total Kas Keluar</div><div className="text-xl font-semibold mt-1 text-amber-600">{rupiah(mutasiTotals.keluar)}</div></CardContent></Card>
            <Card><CardContent className="p-4"><div className="text-xs uppercase text-muted-foreground">Saldo Akhir</div><div className="text-xl font-semibold mt-1 text-primary">{rupiah(mutasiTotals.saldo)}</div></CardContent></Card>
          </div>
          <Card>
            <CardHeader><CardTitle className="text-base">Mutasi Saldo Koperasi</CardTitle></CardHeader>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Tanggal</TableHead>
                    <TableHead>Keterangan</TableHead>
                    <TableHead>Anggota</TableHead>
                    <TableHead className="text-right">Masuk</TableHead>
                    <TableHead className="text-right">Keluar</TableHead>
                    <TableHead className="text-right">Saldo</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {mutasiRows.length === 0 && (
                    <TableRow><TableCell colSpan={6} className="text-center text-sm text-muted-foreground py-8">Tidak ada mutasi.</TableCell></TableRow>
                  )}
                  {mutasiRows.map((r, i) => (
                    <TableRow key={i}>
                      <TableCell>{formatTanggal(r.tanggal)}</TableCell>
                      <TableCell>{r.keterangan}</TableCell>
                      <TableCell className="text-muted-foreground">{r.anggota}</TableCell>
                      <TableCell className="text-right text-emerald-600">{r.masuk ? rupiah(r.masuk) : "-"}</TableCell>
                      <TableCell className="text-right text-amber-600">{r.keluar ? rupiah(r.keluar) : "-"}</TableCell>
                      <TableCell className="text-right font-medium">{rupiah(r.saldo)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}
