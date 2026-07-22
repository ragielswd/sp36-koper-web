import { createFileRoute, redirect } from "@tanstack/react-router";
import { useSuspenseQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import {
  databaseStats, truncateTable, resetAllData, backupDatabase,
  getSettings, updateSettings, restoreDatabase,
} from "@/lib/koperasi.functions";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Database, Download, FileJson, FileSpreadsheet, ShieldAlert, Trash2, Upload, MessageCircle, Save } from "lucide-react";
import { useRef, useState } from "react";
import { toast } from "sonner";
import * as XLSX from "xlsx";

export const Route = createFileRoute("/_app/database")({
  head: () => ({ meta: [{ title: "Kelola Database — Koperasi SMP Negeri 36 Samarinda" }] }),
  beforeLoad: ({ context }) => {
    const user = (context as any).user;
    if (user?.role !== "super") throw redirect({ to: "/dashboard" });
  },
  component: DatabasePage,
});

const LABEL: Record<string, string> = {
  anggota: "Anggota",
  simpanan: "Transaksi Simpanan",
  pinjaman: "Pinjaman",
  angsuran: "Angsuran",
  admin_users: "Akun Admin",
};

function ResetTableDialog({
  table,
  onDone,
}: { table: "anggota" | "simpanan" | "pinjaman" | "angsuran"; onDone: () => void }) {
  const truncFn = useServerFn(truncateTable);
  const [pw, setPw] = useState("");
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);

  async function run() {
    setBusy(true);
    try {
      await truncFn({ data: { table, superPassword: pw } });
      toast.success(`Tabel ${LABEL[table]} dikosongkan`);
      setOpen(false);
      setPw("");
      onDone();
    } catch (e: any) {
      toast.error(e.message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <AlertDialog open={open} onOpenChange={(v) => { setOpen(v); if (!v) setPw(""); }}>
      <AlertDialogTrigger asChild>
        <Button size="sm" variant="outline"><Trash2 className="w-3.5 h-3.5" />Kosongkan</Button>
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Kosongkan tabel {LABEL[table]}?</AlertDialogTitle>
          <AlertDialogDescription>
            Seluruh baris pada tabel <b>{table}</b> akan dihapus permanen. Masukkan password Super Admin untuk melanjutkan.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <div className="space-y-1.5">
          <Label>Password Super Admin</Label>
          <Input type="password" value={pw} onChange={(e) => setPw(e.target.value)} autoFocus />
        </div>
        <AlertDialogFooter>
          <AlertDialogCancel>Batal</AlertDialogCancel>
          <AlertDialogAction disabled={busy || !pw} onClick={run}>Hapus Semua</AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}

/** Ubah workbook Excel hasil backup menjadi struktur { tables: {...} } yang cocok untuk restore. */
function excelToDump(wb: XLSX.WorkBook): any {
  const tables: Record<string, any[]> = {};
  for (const name of wb.SheetNames) {
    const key = name.toLowerCase();
    if (key === "meta") continue;
    if (!["anggota", "simpanan", "pinjaman", "angsuran", "admin_users"].includes(key)) continue;
    const ws = wb.Sheets[name];
    const rows = XLSX.utils.sheet_to_json<any>(ws, { defval: null });
    // filter placeholder row "(kosong)"
    tables[key] = rows.filter((r) => !(Object.keys(r).length === 1 && r["__EMPTY"] === "(kosong)"));
  }
  return { version: 1, tables };
}

function DatabasePage() {
  const qc = useQueryClient();
  const statsFn = useServerFn(databaseStats);
  const resetFn = useServerFn(resetAllData);
  const backupFn = useServerFn(backupDatabase);
  const settingsFn = useServerFn(getSettings);
  const updateSettingsFn = useServerFn(updateSettings);
  const restoreFn = useServerFn(restoreDatabase);

  const { data } = useSuspenseQuery({ queryKey: ["database-stats"], queryFn: () => statsFn() });
  const { data: settings } = useSuspenseQuery({ queryKey: ["settings"], queryFn: () => settingsFn() });

  const [backupBusy, setBackupBusy] = useState(false);
  const [wa, setWa] = useState((settings as any)?.whatsapp_number ?? "");
  const [waBusy, setWaBusy] = useState(false);

  const [restoreDump, setRestoreDump] = useState<any | null>(null);
  const [restoreName, setRestoreName] = useState<string>("");
  const [restorePreview, setRestorePreview] = useState<Record<string, number>>({});
  const [restorePw, setRestorePw] = useState("");
  const [restoreOpen, setRestoreOpen] = useState(false);
  const [restoreBusy, setRestoreBusy] = useState(false);
  const fileRef = useRef<HTMLInputElement | null>(null);

  const stamp = () => {
    const d = new Date();
    const pad = (n: number) => String(n).padStart(2, "0");
    return `${d.getFullYear()}${pad(d.getMonth() + 1)}${pad(d.getDate())}-${pad(d.getHours())}${pad(d.getMinutes())}`;
  };

  async function downloadBackupJSON() {
    setBackupBusy(true);
    try {
      const dump = await backupFn();
      const blob = new Blob([JSON.stringify(dump, null, 2)], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `backup-koperasi-${stamp()}.json`;
      a.click();
      URL.revokeObjectURL(url);
      toast.success("Backup JSON diunduh");
    } catch (e: any) {
      toast.error(e.message);
    } finally {
      setBackupBusy(false);
    }
  }

  async function downloadBackupXLSX() {
    setBackupBusy(true);
    try {
      const dump: any = await backupFn();
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(
        wb,
        XLSX.utils.aoa_to_sheet([
          ["Backup Koperasi SMP Negeri 36 Samarinda"],
          ["Dibuat", dump.generated_at],
          ["Versi", dump.version],
        ]),
        "META",
      );
      for (const [t, rows] of Object.entries(dump.tables as Record<string, any[]>)) {
        const ws = rows.length
          ? XLSX.utils.json_to_sheet(rows)
          : XLSX.utils.aoa_to_sheet([["(kosong)"]]);
        XLSX.utils.book_append_sheet(wb, ws, t.slice(0, 31));
      }
      XLSX.writeFile(wb, `backup-koperasi-${stamp()}.xlsx`);
      toast.success("Backup Excel diunduh");
    } catch (e: any) {
      toast.error(e.message);
    } finally {
      setBackupBusy(false);
    }
  }

  async function handleFilePicked(f: File) {
    setRestoreName(f.name);
    try {
      let dump: any;
      if (f.name.toLowerCase().endsWith(".json")) {
        dump = JSON.parse(await f.text());
      } else {
        const buf = await f.arrayBuffer();
        const wb = XLSX.read(buf, { type: "array" });
        dump = excelToDump(wb);
      }
      if (!dump || !dump.tables) throw new Error("File tidak mengandung struktur 'tables' yang valid.");
      const preview: Record<string, number> = {};
      for (const t of ["anggota", "simpanan", "pinjaman", "angsuran"] as const) {
        preview[t] = Array.isArray(dump.tables[t]) ? dump.tables[t].length : 0;
      }
      setRestoreDump(dump);
      setRestorePreview(preview);
      toast.success("File dibaca. Verifikasi jumlah baris sebelum memulihkan.");
    } catch (e: any) {
      setRestoreDump(null);
      setRestorePreview({});
      toast.error(`Gagal membaca file: ${e.message}`);
    }
  }

  async function runRestore() {
    if (!restoreDump) return toast.error("Pilih file backup terlebih dahulu.");
    if (!restorePw) return toast.error("Masukkan password Super Admin.");
    setRestoreBusy(true);
    try {
      const res: any = await restoreFn({ data: { dump: restoreDump, superPassword: restorePw } });
      const total = Object.values(res.stats ?? {}).reduce((a: number, b: any) => a + Number(b), 0);
      toast.success(`Pemulihan selesai. ${total} baris diimpor.`);
      setRestoreOpen(false);
      setRestorePw("");
      setRestoreDump(null);
      setRestoreName("");
      setRestorePreview({});
      qc.invalidateQueries();
    } catch (e: any) {
      toast.error(e.message);
    } finally {
      setRestoreBusy(false);
    }
  }

  async function saveWa() {
    setWaBusy(true);
    try {
      await updateSettingsFn({ data: { whatsapp_number: wa.trim() || null } });
      toast.success("Nomor WhatsApp koperasi disimpan");
      qc.invalidateQueries({ queryKey: ["settings"] });
    } catch (e: any) {
      toast.error(e.message);
    } finally {
      setWaBusy(false);
    }
  }

  const [pw, setPw] = useState("");
  const [busy, setBusy] = useState(false);
  const [openAll, setOpenAll] = useState(false);

  function refresh() { qc.invalidateQueries({ queryKey: ["database-stats"] }); }

  async function resetAll() {
    setBusy(true);
    try {
      await resetFn({ data: { superPassword: pw } });
      toast.success("Semua data koperasi dikosongkan");
      setOpenAll(false);
      setPw("");
      refresh();
    } catch (e: any) {
      toast.error(e.message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight flex items-center gap-2">
          <Database className="w-5 h-5" />Kelola Database
        </h1>
        <p className="text-sm text-muted-foreground">Pengaturan koperasi, backup, pemulihan data, dan pemeliharaan tabel.</p>
      </div>

      <Card>
        <CardHeader className="py-3">
          <CardTitle className="text-base flex items-center gap-2">
            <MessageCircle className="w-4 h-4 text-emerald-600" />Nomor WhatsApp Koperasi
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <p className="text-sm text-muted-foreground">
            Nomor ini akan ditampilkan pada pesan penagihan angsuran yang dikirim ke WhatsApp anggota. Gunakan format internasional (contoh: <code>628123456789</code>) atau lokal (<code>08123456789</code>).
          </p>
          <div className="flex flex-col sm:flex-row gap-2 sm:items-end">
            <div className="flex-1 space-y-1.5">
              <Label>Nomor WhatsApp</Label>
              <Input value={wa} onChange={(e) => setWa(e.target.value)} placeholder="cth. 08123456789" />
            </div>
            <Button onClick={saveWa} disabled={waBusy}><Save className="w-4 h-4" />Simpan</Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="py-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Download className="w-4 h-4" />Backup Database
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <p className="text-sm text-muted-foreground">
            Unduh salinan seluruh data koperasi (anggota, simpanan, pinjaman, angsuran, dan akun admin tanpa password) untuk arsip atau pemulihan manual.
          </p>
          <div className="flex flex-wrap gap-2">
            <Button onClick={downloadBackupJSON} disabled={backupBusy}>
              <FileJson className="w-4 h-4" />Backup JSON
            </Button>
            <Button variant="outline" onClick={downloadBackupXLSX} disabled={backupBusy}>
              <FileSpreadsheet className="w-4 h-4" />Backup Excel
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="py-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Upload className="w-4 h-4" />Pulihkan (Restore) Database
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <p className="text-sm text-muted-foreground">
            Impor file <b>Backup JSON</b> atau <b>Backup Excel</b> hasil unduhan sebelumnya. Struktur file akan divalidasi dulu; jika valid, seluruh data anggota/simpanan/pinjaman/angsuran akan <b>diganti</b> dengan isi file. Akun admin tidak terpengaruh.
          </p>
          <div className="flex flex-wrap items-center gap-2">
            <input
              ref={fileRef}
              type="file"
              accept=".json,.xlsx,.xls"
              className="hidden"
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (f) handleFilePicked(f);
                e.target.value = "";
              }}
            />
            <Button variant="outline" onClick={() => fileRef.current?.click()}>
              <Upload className="w-4 h-4" />Pilih File Backup
            </Button>
            {restoreName && <span className="text-sm text-muted-foreground">{restoreName}</span>}
          </div>

          {restoreDump && (
            <div className="rounded-lg border bg-muted/30 p-3 text-sm">
              <div className="text-xs uppercase text-muted-foreground mb-2">Ringkasan Data yang Akan Diimpor</div>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                {(["anggota", "simpanan", "pinjaman", "angsuran"] as const).map((t) => (
                  <div key={t} className="flex justify-between bg-background rounded-md px-2 py-1.5 border">
                    <span className="text-muted-foreground">{LABEL[t]}</span>
                    <span className="font-mono font-medium">{restorePreview[t] ?? 0}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          <AlertDialog open={restoreOpen} onOpenChange={(v) => { setRestoreOpen(v); if (!v) setRestorePw(""); }}>
            <AlertDialogTrigger asChild>
              <Button disabled={!restoreDump} className="bg-amber-600 hover:bg-amber-700">
                <Upload className="w-4 h-4" />Pulihkan dari File
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Timpa seluruh data koperasi?</AlertDialogTitle>
                <AlertDialogDescription>
                  Data anggota, simpanan, pinjaman, dan angsuran saat ini akan <b>dihapus</b> dan digantikan dengan isi file backup. Tindakan ini tidak dapat dibatalkan. Masukkan password Super Admin untuk melanjutkan.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <div className="space-y-1.5">
                <Label>Password Super Admin</Label>
                <Input type="password" value={restorePw} onChange={(e) => setRestorePw(e.target.value)} autoFocus />
              </div>
              <AlertDialogFooter>
                <AlertDialogCancel>Batal</AlertDialogCancel>
                <AlertDialogAction disabled={restoreBusy || !restorePw} onClick={runRestore}>Ya, Pulihkan</AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="py-3"><CardTitle className="text-base">Ringkasan Tabel</CardTitle></CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Tabel</TableHead>
                <TableHead>Nama Teknis</TableHead>
                <TableHead className="text-right">Jumlah Baris</TableHead>
                <TableHead className="w-0">Aksi</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {(data as any[]).map((row) => (
                <TableRow key={row.table}>
                  <TableCell className="font-medium">{LABEL[row.table] ?? row.table}</TableCell>
                  <TableCell className="text-muted-foreground text-sm">{row.table}</TableCell>
                  <TableCell className="text-right font-mono">{row.count}</TableCell>
                  <TableCell>
                    {row.table !== "admin_users" && (
                      <ResetTableDialog table={row.table} onDone={refresh} />
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Card className="border-destructive/40">
        <CardHeader className="py-3">
          <CardTitle className="text-base flex items-center gap-2 text-destructive">
            <ShieldAlert className="w-4 h-4" />Zona Berbahaya
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <p className="text-sm text-muted-foreground">
            Reset total akan menghapus seluruh data <b>anggota, simpanan, pinjaman, dan angsuran</b>. Akun admin tidak terpengaruh.
          </p>
          <AlertDialog open={openAll} onOpenChange={(v) => { setOpenAll(v); if (!v) setPw(""); }}>
            <AlertDialogTrigger asChild>
              <Button variant="destructive"><Trash2 className="w-4 h-4" />Reset Semua Data Koperasi</Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Reset seluruh data koperasi?</AlertDialogTitle>
                <AlertDialogDescription>
                  Tindakan ini tidak dapat dibatalkan. Masukkan password Super Admin untuk konfirmasi.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <div className="space-y-1.5">
                <Label>Password Super Admin</Label>
                <Input type="password" value={pw} onChange={(e) => setPw(e.target.value)} autoFocus />
              </div>
              <AlertDialogFooter>
                <AlertDialogCancel>Batal</AlertDialogCancel>
                <AlertDialogAction disabled={busy || !pw} onClick={resetAll}>Ya, Reset Semua</AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </CardContent>
      </Card>
    </div>
  );
}
