import { createFileRoute } from "@tanstack/react-router";
import { useSuspenseQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useMemo, useState } from "react";
import * as XLSX from "xlsx";
import { listSimpanan, listPinjaman, listAnggota } from "@/lib/koperasi.functions";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { rupiah } from "@/lib/format";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Printer, FileSpreadsheet, RotateCcw } from "lucide-react";

export const Route = createFileRoute("/_app/laporan")({
  head: () => ({ meta: [{ title: "Laporan — Koperasi SMPN 36" }] }),
  component: LaporanPage,
});

type Filters = {
  dari: string;
  sampai: string;
  anggotaId: string;
  statusAnggota: "semua" | "aktif" | "nonaktif";
  jenisSimpanan: "semua" | "pokok" | "wajib" | "sukarela";
};

const defaultFilters: Filters = {
  dari: "",
  sampai: "",
  anggotaId: "semua",
  statusAnggota: "semua",
  jenisSimpanan: "semua",
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

  const [f, setF] = useState<Filters>(defaultFilters);

  const filtered = useMemo(() => {
    const anggotaList = (anggota as any[]).filter((a) => {
      if (f.anggotaId !== "semua" && a.id !== f.anggotaId) return false;
      if (f.statusAnggota === "aktif" && !a.aktif) return false;
      if (f.statusAnggota === "nonaktif" && a.aktif) return false;
      return true;
    });
    const anggotaIds = new Set(anggotaList.map((a) => a.id));

    const simpananList = (simpanan as any[]).filter((s) => {
      if (!anggotaIds.has(s.anggota_id)) return false;
      if (f.jenisSimpanan !== "semua" && s.jenis !== f.jenisSimpanan) return false;
      if (!inRange(s.tanggal, f.dari, f.sampai)) return false;
      return true;
    });

    const pinjamanList = (pinjaman as any[])
      .filter((p) => anggotaIds.has(p.anggota_id) && inRange(p.tanggal_pinjam, f.dari, f.sampai))
      .map((p) => ({
        ...p,
        angsuran: (p.angsuran ?? []).filter((ag: any) => inRange(ag.tanggal, f.dari, f.sampai)),
      }));

    const rekap = anggotaList.map((a) => {
      const s = simpananList.filter((x) => x.anggota_id === a.id);
      const setor = s.filter((x) => x.tipe === "setor").reduce((n, x) => n + Number(x.jumlah), 0);
      const tarik = s.filter((x) => x.tipe === "tarik").reduce((n, x) => n + Number(x.jumlah), 0);
      const saldoSimpanan = setor - tarik;
      const p = pinjamanList.filter((x) => x.anggota_id === a.id);
      const totalPokok = p.reduce((n, x) => n + Number(x.pokok), 0);
      const totalBayar = p.reduce((n, x) => n + x.angsuran.reduce((m: number, ag: any) => m + Number(ag.pokok), 0), 0);
      const sisaPinjaman = totalPokok - totalBayar;
      const pinjamanAktif = p.filter((x) => x.status === "aktif").length;
      return { anggota: a, saldoSimpanan, sisaPinjaman, pinjamanAktif, setor, tarik };
    });

    return { anggotaList, simpananList, pinjamanList, rekap };
  }, [anggota, simpanan, pinjaman, f]);

  const totalSimpanan = filtered.rekap.reduce((n, r) => n + r.saldoSimpanan, 0);
  const totalSisaPinjaman = filtered.rekap.reduce((n, r) => n + r.sisaPinjaman, 0);

  function exportExcel() {
    const wb = XLSX.utils.book_new();

    const infoRows = [
      ["Laporan Koperasi Simpan Pinjam SMPN 36"],
      ["Dicetak", new Date().toLocaleString("id-ID")],
      ["Periode", `${f.dari || "awal"} s/d ${f.sampai || "sekarang"}`],
      ["Status Anggota", f.statusAnggota],
      ["Jenis Simpanan", f.jenisSimpanan],
      ["Anggota", f.anggotaId === "semua" ? "Semua" : (anggota as any[]).find((a) => a.id === f.anggotaId)?.nama ?? "-"],
      [],
    ];

    // Sheet 1: Rekap per anggota
    const rekapRows = filtered.rekap.map((r) => ({
      Nama: r.anggota.nama,
      NIP: r.anggota.nip || "",
      Jabatan: r.anggota.jabatan || "",
      Status: r.anggota.aktif ? "Aktif" : "Nonaktif",
      "Total Setor": r.setor,
      "Total Tarik": r.tarik,
      "Saldo Simpanan": r.saldoSimpanan,
      "Sisa Pinjaman": r.sisaPinjaman,
      "Pinjaman Aktif": r.pinjamanAktif,
    }));
    const ws1 = XLSX.utils.aoa_to_sheet(infoRows);
    XLSX.utils.sheet_add_json(ws1, rekapRows, { origin: -1 });
    XLSX.utils.sheet_add_aoa(ws1, [["", "", "", "TOTAL", filtered.rekap.reduce((n, r) => n + r.setor, 0), filtered.rekap.reduce((n, r) => n + r.tarik, 0), totalSimpanan, totalSisaPinjaman, ""]], { origin: -1 });
    XLSX.utils.book_append_sheet(wb, ws1, "Rekap");

    // Sheet 2: Riwayat simpanan
    const anggotaMap = new Map((anggota as any[]).map((a) => [a.id, a]));
    const simpananRows = filtered.simpananList.map((s) => ({
      Tanggal: s.tanggal,
      Anggota: anggotaMap.get(s.anggota_id)?.nama ?? "-",
      Jenis: s.jenis,
      Tipe: s.tipe,
      Jumlah: Number(s.jumlah),
      Catatan: s.catatan || "",
    }));
    const ws2 = XLSX.utils.json_to_sheet(simpananRows);
    XLSX.utils.book_append_sheet(wb, ws2, "Simpanan");

    // Sheet 3: Pinjaman & Angsuran
    const pinjamanRows = filtered.pinjamanList.map((p) => {
      const totalBayar = p.angsuran.reduce((m: number, ag: any) => m + Number(ag.pokok), 0);
      return {
        "Tgl Pinjam": p.tanggal_pinjam,
        Anggota: anggotaMap.get(p.anggota_id)?.nama ?? "-",
        Pokok: Number(p.pokok),
        "Bunga (%)": Number(p.bunga_persen),
        "Tipe Bunga": p.bunga_tipe,
        "Tenor (bln)": p.tenor_bulan,
        Status: p.status,
        "Total Angsuran": totalBayar,
        "Sisa Pokok": Number(p.pokok) - totalBayar,
      };
    });
    const ws3 = XLSX.utils.json_to_sheet(pinjamanRows);
    XLSX.utils.book_append_sheet(wb, ws3, "Pinjaman");

    const angsuranRows = filtered.pinjamanList.flatMap((p) =>
      p.angsuran.map((ag: any) => ({
        Tanggal: ag.tanggal,
        Anggota: anggotaMap.get(p.anggota_id)?.nama ?? "-",
        "Pokok Pinjaman": Number(p.pokok),
        Pokok: Number(ag.pokok),
        Bunga: Number(ag.bunga),
        Denda: Number(ag.denda),
        Total: Number(ag.pokok) + Number(ag.bunga) + Number(ag.denda),
      })),
    );
    const ws4 = XLSX.utils.json_to_sheet(angsuranRows);
    XLSX.utils.book_append_sheet(wb, ws4, "Angsuran");

    const stamp = new Date().toISOString().slice(0, 10);
    XLSX.writeFile(wb, `laporan-koperasi-${stamp}.xlsx`);
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-2 print:hidden">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Laporan</h1>
          <p className="text-sm text-muted-foreground">Rekap saldo simpanan dan sisa pinjaman per anggota.</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => window.print()}><Printer className="w-4 h-4" />Cetak</Button>
          <Button onClick={exportExcel}><FileSpreadsheet className="w-4 h-4" />Ekspor Excel</Button>
        </div>
      </div>

      <Card className="print:hidden">
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Filter</CardTitle>
        </CardHeader>
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
          </div>
          <div className="mt-3 flex justify-end">
            <Button variant="ghost" size="sm" onClick={() => setF(defaultFilters)}>
              <RotateCcw className="w-4 h-4" />Reset Filter
            </Button>
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card><CardContent className="p-4"><div className="text-xs uppercase text-muted-foreground">Anggota</div><div className="text-xl font-semibold mt-1">{filtered.rekap.length}</div></CardContent></Card>
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
              {filtered.rekap.length === 0 && (
                <TableRow><TableCell colSpan={6} className="text-center text-sm text-muted-foreground py-8">Tidak ada data untuk filter ini.</TableCell></TableRow>
              )}
              {filtered.rekap.map((r) => (
                <TableRow key={r.anggota.id}>
                  <TableCell className="font-medium">{r.anggota.nama}</TableCell>
                  <TableCell className="text-muted-foreground">{r.anggota.nip || "-"}</TableCell>
                  <TableCell>{r.anggota.aktif ? <Badge>Aktif</Badge> : <Badge variant="secondary">Nonaktif</Badge>}</TableCell>
                  <TableCell className="text-right">{rupiah(r.saldoSimpanan)}</TableCell>
                  <TableCell className="text-right">{rupiah(r.sisaPinjaman)}</TableCell>
                  <TableCell className="text-center">{r.pinjamanAktif}</TableCell>
                </TableRow>
              ))}
              {filtered.rekap.length > 0 && (
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
