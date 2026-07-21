import { useEffect, useState } from "react";
import { Clock } from "lucide-react";

/**
 * Live clock for app header. Renders the current full date + time,
 * refreshing every second. SSR-safe: renders empty until mounted to avoid
 * hydration mismatches.
 */
export function HeaderClock() {
  const [now, setNow] = useState<Date | null>(null);

  useEffect(() => {
    setNow(new Date());
    const t = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(t);
  }, []);

  if (!now) {
    return <div className="ml-auto h-5 w-48" aria-hidden />;
  }

  const tanggal = now.toLocaleDateString("id-ID", {
    weekday: "long",
    day: "2-digit",
    month: "long",
    year: "numeric",
  });
  const jam =
    String(now.getHours()).padStart(2, "0") +
    ":" +
    String(now.getMinutes()).padStart(2, "0") +
    ":" +
    String(now.getSeconds()).padStart(2, "0");

  return (
    <div
      className="ml-auto flex items-center gap-2 text-xs md:text-sm text-muted-foreground tabular-nums"
      aria-label="Waktu saat ini"
    >
      <Clock className="w-4 h-4" />
      <span className="hidden sm:inline">{tanggal}</span>
      <span className="sm:hidden">
        {now.toLocaleDateString("id-ID", { day: "2-digit", month: "short", year: "2-digit" })}
      </span>
      <span aria-hidden>·</span>
      <span className="font-medium text-foreground">{jam} WITA</span>
    </div>
  );
}
