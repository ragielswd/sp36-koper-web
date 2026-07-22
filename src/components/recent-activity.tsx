import { useSuspenseQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { recentActivity } from "@/lib/koperasi.functions";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Activity, PiggyBank, Landmark, Users, Receipt } from "lucide-react";
import { formatTanggal } from "@/lib/format";

type Scope = "all" | "anggota" | "simpanan" | "pinjaman";

const ICONS: Record<string, any> = {
  anggota: Users,
  simpanan: PiggyBank,
  pinjaman: Landmark,
  angsuran: Receipt,
};

const TINTS: Record<string, string> = {
  anggota: "bg-blue-500/10 text-blue-600",
  simpanan: "bg-emerald-500/10 text-emerald-600",
  pinjaman: "bg-amber-500/10 text-amber-600",
  angsuran: "bg-primary/10 text-primary",
};

function timeAgo(iso: string): string {
  if (!iso) return "-";
  const then = new Date(iso).getTime();
  const diff = Math.max(0, Date.now() - then);
  const m = Math.floor(diff / 60000);
  if (m < 1) return "baru saja";
  if (m < 60) return `${m} menit lalu`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h} jam lalu`;
  const d = Math.floor(h / 24);
  if (d < 7) return `${d} hari lalu`;
  return formatTanggal(iso.slice(0, 10));
}

export function RecentActivity({ scope = "all", limit = 8, title = "Aktivitas Terkini" }: { scope?: Scope; limit?: number; title?: string }) {
  const fn = useServerFn(recentActivity);
  const { data } = useSuspenseQuery({
    queryKey: ["recent-activity", scope, limit],
    queryFn: () => fn({ data: { scope, limit } }),
  });

  const items = data as any[];

  return (
    <Card>
      <CardHeader className="py-3">
        <CardTitle className="text-base flex items-center gap-2">
          <Activity className="w-4 h-4" />{title}
        </CardTitle>
      </CardHeader>
      <CardContent className="p-0">
        {items.length === 0 ? (
          <div className="text-center text-sm text-muted-foreground py-8">Belum ada aktivitas.</div>
        ) : (
          <ul className="divide-y">
            {items.map((it, i) => {
              const Icon = ICONS[it.kind] ?? Activity;
              return (
                <li key={i} className="flex items-start gap-3 px-4 py-3">
                  <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${TINTS[it.kind] ?? ""}`}>
                    <Icon className="w-4 h-4" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="text-sm font-medium truncate">{it.title}</div>
                    <div className="text-xs text-muted-foreground truncate">{it.subtitle}</div>
                    <div className="text-[11px] text-muted-foreground/80 mt-0.5">
                      {timeAgo(it.at)}{it.by ? ` · oleh ${it.by}` : ""}
                    </div>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}
