import { createServerFn } from "@tanstack/react-start";


// All server functions here are gated by requireAdmin() and use the
// service-role admin client (dynamic import; RLS is off for service_role).

async function admin() {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  return supabaseAdmin;
}

async function computeSaldoAnggota(sb: any, anggotaId: string): Promise<number> {
  const { data } = await sb.from("simpanan").select("tipe,jumlah").eq("anggota_id", anggotaId);
  return (data ?? []).reduce(
    (n: number, r: any) => n + (r.tipe === "setor" ? Number(r.jumlah) : -Number(r.jumlah)),
    0,
  );
}

async function syncPinjamanStatus(sb: any, pinjamanId: string) {
  const { data: pin } = await sb.from("pinjaman").select("pokok,status").eq("id", pinjamanId).maybeSingle();
  if (!pin) return;
  const { data: angs } = await sb.from("angsuran").select("pokok").eq("pinjaman_id", pinjamanId);
  const totalPokok = (angs ?? []).reduce((n: number, a: any) => n + Number(a.pokok), 0);
  const sisa = Number(pin.pokok) - totalPokok;
  if (sisa <= 0 && pin.status !== "lunas") {
    await sb.from("pinjaman").update({ status: "lunas", updated_at: new Date().toISOString() }).eq("id", pinjamanId);
  } else if (sisa > 0 && pin.status === "lunas") {
    // if angsuran deleted and no longer paid off, revert
    await sb.from("pinjaman").update({ status: "aktif", updated_at: new Date().toISOString() }).eq("id", pinjamanId);
  }
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

export const getSaldoAnggota = createServerFn({ method: "GET" })
  .inputValidator((d: { id: string }) => d)
  .handler(async ({ data }) => {
    await (await import("./gate.server")).requireAdmin();
    const sb = await admin();
    return { saldo: await computeSaldoAnggota(sb, data.id) };
  });

export const deleteAnggota = createServerFn({ method: "POST" })
  .inputValidator((d: { id: string; superPassword?: string }) => d)
  .handler(async ({ data }) => {
    await (await import("./gate.server")).requireSuperOrPassword(data.superPassword);
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
    const s = await (await import("./gate.server")).requireAdmin();
    const sb = await admin();
    const { data: inserted, error } = await sb
      .from("simpanan")
      .insert({ ...data, dibuat_oleh: s.data.nama ?? s.data.username ?? null })
      .select("*, anggota:anggota_id(id,nama,nip)")
      .single();
    if (error) throw new Error(error.message);
    const saldo = await computeSaldoAnggota(sb, data.anggota_id);
    return { ok: true, row: inserted, saldo };
  });

export const updateSimpanan = createServerFn({ method: "POST" })
  .inputValidator((d: {
    id: string;
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
    const { id, ...rest } = data;
    const { error } = await sb.from("simpanan").update(rest).eq("id", id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const deleteSimpanan = createServerFn({ method: "POST" })
  .inputValidator((d: { id: string; superPassword?: string }) => d)
  .handler(async ({ data }) => {
    await (await import("./gate.server")).requireSuperOrPassword(data.superPassword);
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
      .select("*, anggota:anggota_id(id,nama,nip,jabatan)")
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
    tgl_jatuh_tempo?: number | null;
    catatan?: string | null;
  }) => d)
  .handler(async ({ data }) => {
    const s = await (await import("./gate.server")).requireAdmin();
    const sb = await admin();
    const { data: inserted, error } = await (sb.from("pinjaman") as any)
      .insert({ ...data, dibuat_oleh: s.data.nama ?? s.data.username ?? null })
      .select("*, anggota:anggota_id(id,nama,nip,jabatan)")
      .single();
    if (error) throw new Error(error.message);
    return { ok: true, row: inserted };
  });

export const updatePinjaman = createServerFn({ method: "POST" })
  .inputValidator((d: {
    id: string;
    anggota_id: string;
    pokok: number;
    bunga_persen: number;
    bunga_tipe: "flat" | "menurun" | "tetap" | "tanpa";
    tenor_bulan: number;
    tanggal_pinjam: string;
    tgl_jatuh_tempo?: number | null;
    catatan?: string | null;
  }) => d)
  .handler(async ({ data }) => {
    await (await import("./gate.server")).requireAdmin();
    const sb = await admin();
    const { id, ...rest } = data;
    const { error } = await (sb.from("pinjaman") as any)
      .update({ ...rest, updated_at: new Date().toISOString() })
      .eq("id", id);
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
  .inputValidator((d: { id: string; superPassword?: string }) => d)
  .handler(async ({ data }) => {
    await (await import("./gate.server")).requireSuperOrPassword(data.superPassword);
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
    const s = await (await import("./gate.server")).requireAdmin();
    const sb = await admin();
    const { error } = await sb.from("angsuran").insert({ ...data, denda: data.denda ?? 0, dibuat_oleh: s.data.nama ?? s.data.username ?? null });
    if (error) throw new Error(error.message);
    await syncPinjamanStatus(sb, data.pinjaman_id);
    return { ok: true };
  });

export const deleteAngsuran = createServerFn({ method: "POST" })
  .inputValidator((d: { id: string; superPassword?: string }) => d)
  .handler(async ({ data }) => {
    await (await import("./gate.server")).requireSuperOrPassword(data.superPassword);
    const sb = await admin();
    const { data: row } = await sb.from("angsuran").select("pinjaman_id").eq("id", data.id).maybeSingle();
    const { error } = await sb.from("angsuran").delete().eq("id", data.id);
    if (error) throw new Error(error.message);
    if (row?.pinjaman_id) await syncPinjamanStatus(sb, row.pinjaman_id);
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

// ---------- DATABASE MANAGEMENT (super only) ----------
export const databaseStats = createServerFn({ method: "GET" }).handler(async () => {
  await (await import("./gate.server")).requireSuper();
  const sb = await admin();
  const tables = ["anggota", "simpanan", "pinjaman", "angsuran", "admin_users"] as const;
  const results: Array<{ table: string; count: number }> = [];
  for (const t of tables) {
    const { count } = await sb.from(t).select("id", { count: "exact", head: true });
    results.push({ table: t, count: count ?? 0 });
  }
  return results;
});

export const backupDatabase = createServerFn({ method: "GET" }).handler(async () => {
  await (await import("./gate.server")).requireSuper();
  const sb = await admin();
  const tables = ["anggota", "simpanan", "pinjaman", "angsuran", "admin_users"] as const;
  const dump: Record<string, any[]> = {};
  for (const t of tables) {
    const { data, error } = await sb.from(t).select("*");
    if (error) throw new Error(`${t}: ${error.message}`);
    let rows = data ?? [];
    if (t === "admin_users") {
      // Never export password hashes
      rows = rows.map(({ password_hash, ...rest }: any) => rest);
    }
    dump[t] = rows;
  }
  return {
    generated_at: new Date().toISOString(),
    app: "Koperasi SMP Negeri 36 Samarinda",
    version: 1,
    tables: dump,
  };
});

export const truncateTable = createServerFn({ method: "POST" })
  .inputValidator((d: { table: "anggota" | "simpanan" | "pinjaman" | "angsuran"; superPassword: string }) => d)
  .handler(async ({ data }) => {
    const { requireSuper, verifySuperPassword } = await import("./gate.server");
    await requireSuper();
    const ok = await verifySuperPassword(data.superPassword);
    if (!ok) throw new Error("Password super admin salah.");
    const allowed = new Set(["anggota", "simpanan", "pinjaman", "angsuran"]);
    if (!allowed.has(data.table)) throw new Error("Tabel tidak diizinkan");
    const sb = await admin();
    // Delete all rows (id is not null)
    const { error } = await sb.from(data.table).delete().not("id", "is", null);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const resetAllData = createServerFn({ method: "POST" })
  .inputValidator((d: { superPassword: string }) => d)
  .handler(async ({ data }) => {
    const { requireSuper, verifySuperPassword } = await import("./gate.server");
    await requireSuper();
    const ok = await verifySuperPassword(data.superPassword);
    if (!ok) throw new Error("Password super admin salah.");
    const sb = await admin();
    // order matters (children first)
    for (const t of ["angsuran", "pinjaman", "simpanan", "anggota"] as const) {
      const { error } = await sb.from(t).delete().not("id", "is", null);
      if (error) throw new Error(`${t}: ${error.message}`);
    }
    return { ok: true };
  });
