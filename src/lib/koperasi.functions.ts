import { createServerFn } from "@tanstack/react-start";


// All server functions here are gated by requireAdmin() and use the
// service-role admin client (dynamic import; RLS is off for service_role).

async function admin() {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  return supabaseAdmin;
}

// ---------- ANGGOTA ----------
export const listAnggota = createServerFn({ method: "GET" }).handler(async () => {
  await (await import("./gate.server")).requireAdmin();
  const sb = await admin();
  const { data, error } = await sb.from("anggota").select("*").order("nama");
  if (error) throw new Error(error.message);
  return data ?? [];
});

export const upsertAnggota = createServerFn({ method: "POST" })
  .inputValidator((d: {
    id?: string;
    nama: string;
    nip?: string | null;
    jabatan?: string | null;
    telepon?: string | null;
    tanggal_bergabung?: string;
    aktif?: boolean;
    catatan?: string | null;
  }) => d)
  .handler(async ({ data }) => {
    await (await import("./gate.server")).requireAdmin();
    const sb = await admin();
    if (data.id) {
      const { id, ...rest } = data;
      const { error } = await sb.from("anggota").update({ ...rest, updated_at: new Date().toISOString() }).eq("id", id);
      if (error) throw new Error(error.message);
    } else {
      const { error } = await sb.from("anggota").insert(data);
      if (error) throw new Error(error.message);
    }
    return { ok: true };
  });

export const deleteAnggota = createServerFn({ method: "POST" })
  .inputValidator((d: { id: string }) => d)
  .handler(async ({ data }) => {
    await (await import("./gate.server")).requireAdmin();
    const sb = await admin();
    const { error } = await sb.from("anggota").delete().eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

// ---------- SIMPANAN ----------
export const listSimpanan = createServerFn({ method: "GET" }).handler(async () => {
  await (await import("./gate.server")).requireAdmin();
  const sb = await admin();
  const { data, error } = await sb
    .from("simpanan")
    .select("*, anggota:anggota_id(id,nama)")
    .order("tanggal", { ascending: false });
  if (error) throw new Error(error.message);
  return data ?? [];
});

export const createSimpanan = createServerFn({ method: "POST" })
  .inputValidator((d: {
    anggota_id: string;
    jenis: "pokok" | "wajib" | "sukarela";
    tipe: "setor" | "tarik";
    jumlah: number;
    tanggal: string;
    catatan?: string | null;
  }) => d)
  .handler(async ({ data }) => {
    await (await import("./gate.server")).requireAdmin();
    const sb = await admin();
    const { error } = await sb.from("simpanan").insert(data);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const deleteSimpanan = createServerFn({ method: "POST" })
  .inputValidator((d: { id: string }) => d)
  .handler(async ({ data }) => {
    await (await import("./gate.server")).requireAdmin();
    const sb = await admin();
    const { error } = await sb.from("simpanan").delete().eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

// ---------- PINJAMAN ----------
export const listPinjaman = createServerFn({ method: "GET" }).handler(async () => {
  await (await import("./gate.server")).requireAdmin();
  const sb = await admin();
  const { data, error } = await sb
    .from("pinjaman")
    .select("*, anggota:anggota_id(id,nama), angsuran(id,pokok,bunga,denda,tanggal)")
    .order("tanggal_pinjam", { ascending: false });
  if (error) throw new Error(error.message);
  return data ?? [];
});

export const getPinjamanDetail = createServerFn({ method: "GET" })
  .inputValidator((d: { id: string }) => d)
  .handler(async ({ data }) => {
    await (await import("./gate.server")).requireAdmin();
    const sb = await admin();
    const { data: pin, error } = await sb
      .from("pinjaman")
      .select("*, anggota:anggota_id(id,nama,nip)")
      .eq("id", data.id)
      .single();
    if (error) throw new Error(error.message);
    const { data: angs, error: e2 } = await sb
      .from("angsuran")
      .select("*")
      .eq("pinjaman_id", data.id)
      .order("tanggal", { ascending: true });
    if (e2) throw new Error(e2.message);
    return { pinjaman: pin, angsuran: angs ?? [] };
  });

export const createPinjaman = createServerFn({ method: "POST" })
  .inputValidator((d: {
    anggota_id: string;
    pokok: number;
    bunga_persen: number;
    bunga_tipe: "flat" | "menurun" | "tetap" | "tanpa";
    tenor_bulan: number;
    tanggal_pinjam: string;
    catatan?: string | null;
  }) => d)
  .handler(async ({ data }) => {
    await (await import("./gate.server")).requireAdmin();
    const sb = await admin();
    const { error } = await sb.from("pinjaman").insert(data);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const updatePinjamanStatus = createServerFn({ method: "POST" })
  .inputValidator((d: { id: string; status: "aktif" | "lunas" | "macet" }) => d)
  .handler(async ({ data }) => {
    await (await import("./gate.server")).requireAdmin();
    const sb = await admin();
    const { error } = await sb
      .from("pinjaman")
      .update({ status: data.status, updated_at: new Date().toISOString() })
      .eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const deletePinjaman = createServerFn({ method: "POST" })
  .inputValidator((d: { id: string }) => d)
  .handler(async ({ data }) => {
    await (await import("./gate.server")).requireAdmin();
    const sb = await admin();
    const { error } = await sb.from("pinjaman").delete().eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

// ---------- ANGSURAN ----------
export const createAngsuran = createServerFn({ method: "POST" })
  .inputValidator((d: {
    pinjaman_id: string;
    tanggal: string;
    pokok: number;
    bunga: number;
    denda?: number;
    catatan?: string | null;
  }) => d)
  .handler(async ({ data }) => {
    await (await import("./gate.server")).requireAdmin();
    const sb = await admin();
    const { error } = await sb.from("angsuran").insert({ ...data, denda: data.denda ?? 0 });
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const deleteAngsuran = createServerFn({ method: "POST" })
  .inputValidator((d: { id: string }) => d)
  .handler(async ({ data }) => {
    await (await import("./gate.server")).requireAdmin();
    const sb = await admin();
    const { error } = await sb.from("angsuran").delete().eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

// ---------- DASHBOARD ----------
export const dashboardRingkasan = createServerFn({ method: "GET" }).handler(async () => {
  await (await import("./gate.server")).requireAdmin();
  const sb = await admin();
  const [{ data: anggota }, { data: simpanan }, { data: pinjaman }, { data: angsuran }] = await Promise.all([
    sb.from("anggota").select("id,aktif"),
    sb.from("simpanan").select("jenis,tipe,jumlah,tanggal"),
    sb.from("pinjaman").select("id,pokok,bunga_persen,bunga_tipe,tenor_bulan,status,tanggal_pinjam"),
    sb.from("angsuran").select("pokok,bunga,denda,tanggal"),
  ]);

  const totalAnggota = anggota?.length ?? 0;
  const anggotaAktif = anggota?.filter((a) => a.aktif).length ?? 0;

  let totalSimpanan = 0;
  const simpananPerJenis: Record<string, number> = { pokok: 0, wajib: 0, sukarela: 0 };
  simpanan?.forEach((s: any) => {
    const nilai = s.tipe === "setor" ? Number(s.jumlah) : -Number(s.jumlah);
    totalSimpanan += nilai;
    simpananPerJenis[s.jenis] = (simpananPerJenis[s.jenis] || 0) + nilai;
  });

  const totalPinjamanPokok = pinjaman?.reduce((s: number, p: any) => s + Number(p.pokok), 0) ?? 0;
  const pinjamanAktif = pinjaman?.filter((p: any) => p.status === "aktif").length ?? 0;
  const totalAngsuranPokok = angsuran?.reduce((s: number, a: any) => s + Number(a.pokok), 0) ?? 0;
  const totalBunga = angsuran?.reduce((s: number, a: any) => s + Number(a.bunga), 0) ?? 0;
  const sisaPokokPinjaman = totalPinjamanPokok - totalAngsuranPokok;

  // 6-month trend
  const now = new Date();
  const bulanTrend: { label: string; simpanan: number; angsuran: number }[] = [];
  for (let i = 5; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
    const label = d.toLocaleDateString("id-ID", { month: "short", year: "2-digit" });
    const sim = simpanan?.filter((s: any) => s.tanggal?.startsWith(key))
      .reduce((sum: number, s: any) => sum + (s.tipe === "setor" ? Number(s.jumlah) : -Number(s.jumlah)), 0) ?? 0;
    const ang = angsuran?.filter((a: any) => a.tanggal?.startsWith(key))
      .reduce((sum: number, a: any) => sum + Number(a.pokok) + Number(a.bunga), 0) ?? 0;
    bulanTrend.push({ label, simpanan: sim, angsuran: ang });
  }

  return {
    totalAnggota,
    anggotaAktif,
    totalSimpanan,
    simpananPerJenis,
    totalPinjamanPokok,
    pinjamanAktif,
    sisaPokokPinjaman,
    totalBunga,
    bulanTrend,
  };
});
