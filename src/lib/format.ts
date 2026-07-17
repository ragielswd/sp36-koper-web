export function rupiah(n: number | string | null | undefined): string {
  const num = Number(n ?? 0);
  return new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", maximumFractionDigits: 0 }).format(num);
}

export function formatTanggal(iso: string | null | undefined): string {
  if (!iso) return "-";
  const d = new Date(iso);
  return d.toLocaleDateString("id-ID", { day: "2-digit", month: "short", year: "numeric" });
}

export function hitungAngsuranBulanan(
  pokok: number,
  bungaPersen: number,
  tenor: number,
  tipe: "flat" | "menurun" | "tetap" | "tanpa",
): { pokok: number; bunga: number; total: number } {
  if (tenor <= 0) return { pokok: 0, bunga: 0, total: 0 };
  const pokokBulan = pokok / tenor;
  if (tipe === "tanpa") return { pokok: pokokBulan, bunga: 0, total: pokokBulan };
  if (tipe === "tetap") return { pokok: pokokBulan, bunga: bungaPersen, total: pokokBulan + bungaPersen };
  const bunga = (pokok * (bungaPersen / 100));
  if (tipe === "flat") return { pokok: pokokBulan, bunga, total: pokokBulan + bunga };
  // menurun (rata sederhana bulan pertama)
  return { pokok: pokokBulan, bunga, total: pokokBulan + bunga };
}
