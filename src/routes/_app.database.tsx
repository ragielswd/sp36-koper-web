import { createFileRoute, redirect } from "@tanstack/react-router";
import { useSuspenseQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { databaseStats, truncateTable, resetAllData, backupDatabase } from "@/lib/koperasi.functions";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Database, Download, FileJson, FileSpreadsheet, ShieldAlert, Trash2 } from "lucide-react";
import { useState } from "react";
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

function DatabasePage() {
  const qc = useQueryClient();
  const statsFn = useServerFn(databaseStats);
  const resetFn = useServerFn(resetAllData);
  const { data } = useSuspenseQuery({ queryKey: ["database-stats"], queryFn: () => statsFn() });

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
        <p className="text-sm text-muted-foreground">Ringkasan seluruh tabel dan alat pemeliharaan data.</p>
      </div>

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
