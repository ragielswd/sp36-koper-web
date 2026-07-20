import { createFileRoute } from "@tanstack/react-router";
import { useSuspenseQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { dashboardRingkasan } from "@/lib/koperasi.functions";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { rupiah } from "@/lib/format";
import { Users, PiggyBank, Landmark, TrendingUp } from "lucide-react";
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis, Legend } from "recharts";

export const Route = createFileRoute("/_app/dashboard")({
  head: () => ({ meta: [{ title: "Dashboard — Koperasi SMP Negeri 36 Samarinda" }] }),
  component: DashboardPage,
});

function DashboardPage() {
  const qc = useQueryClient();
  const fetcher = useServerFn(dashboardRingkasan);
  const { data } = useSuspenseQuery({
    queryKey: ["dashboard"],
    queryFn: () => fetcher(),
  });

  const kartu = [
    { label: "Anggota Aktif", value: `${data.anggotaAktif} / ${data.totalAnggota}`, icon: Users, tint: "bg-blue-500/10 text-blue-600" },
    { label: "Total Simpanan", value: rupiah(data.totalSimpanan), icon: PiggyBank, tint: "bg-emerald-500/10 text-emerald-600" },
    { label: "Pinjaman Aktif", value: data.pinjamanAktif, sub: `Sisa pokok ${rupiah(data.sisaPokokPinjaman)}`, icon: Landmark, tint: "bg-amber-500/10 text-amber-600" },
    { label: "Pendapatan Bunga", value: rupiah(data.totalBunga), icon: TrendingUp, tint: "bg-primary/10 text-primary" },
  ];

  return (
    <div className="space-y-6" onFocus={() => qc.invalidateQueries({ queryKey: ["dashboard"] })}>
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Dashboard</h1>
        <p className="text-sm text-muted-foreground">Ringkasan koperasi simpan pinjam.</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {kartu.map((k) => (
          <Card key={k.label}>
            <CardContent className="p-5">
              <div className="flex items-start justify-between">
                <div>
                  <div className="text-xs text-muted-foreground uppercase tracking-wide">{k.label}</div>
                  <div className="mt-2 text-2xl font-semibold">{k.value}</div>
                  {k.sub && <div className="text-xs text-muted-foreground mt-1">{k.sub}</div>}
                </div>
                <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${k.tint}`}>
                  <k.icon className="w-5 h-5" />
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="text-base">Aktivitas 6 Bulan Terakhir</CardTitle>
          </CardHeader>
          <CardContent className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={data.bulanTrend}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                <XAxis dataKey="label" fontSize={12} />
                <YAxis fontSize={12} tickFormatter={(v) => (v >= 1_000_000 ? `${(v / 1_000_000).toFixed(1)}jt` : `${(v / 1000).toFixed(0)}rb`)} />
                <Tooltip formatter={(v: number) => rupiah(v)} />
                <Legend />
                <Bar dataKey="simpanan" fill="var(--primary)" name="Simpanan" radius={[4, 4, 0, 0]} />
                <Bar dataKey="angsuran" fill="var(--chart-2)" name="Angsuran" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Simpanan per Jenis</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {(["pokok", "wajib", "sukarela"] as const).map((j) => (
              <div key={j}>
                <div className="flex justify-between text-sm">
                  <span className="capitalize text-muted-foreground">{j}</span>
                  <span className="font-medium">{rupiah(data.simpananPerJenis[j] || 0)}</span>
                </div>
                <div className="mt-1 h-2 bg-muted rounded-full overflow-hidden">
                  <div
                    className="h-full bg-primary"
                    style={{
                      width: `${Math.max(0, Math.min(100, ((data.simpananPerJenis[j] || 0) / Math.max(1, data.totalSimpanan)) * 100))}%`,
                    }}
                  />
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
