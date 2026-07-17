import { createServerFn } from "@tanstack/react-start";

async function admin() {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  return supabaseAdmin;
}

export const listAdmins = createServerFn({ method: "GET" }).handler(async () => {
  await (await import("./gate.server")).requireSuper();
  const sb = await admin();
  const { data, error } = await sb
    .from("admin_users")
    .select("id, username, nama, role, aktif, created_at, updated_at")
    .order("created_at", { ascending: true });
  if (error) throw new Error(error.message);
  return data ?? [];
});

export const createAdmin = createServerFn({ method: "POST" })
  .inputValidator((d: { username: string; nama: string; password: string; role: "super" | "admin" }) => d)
  .handler(async ({ data }) => {
    await (await import("./gate.server")).requireSuper();
    const username = data.username.trim().toLowerCase();
    if (!/^[a-z0-9_.]{3,32}$/.test(username)) throw new Error("Username 3-32 karakter (huruf kecil, angka, . atau _)");
    if (!data.nama.trim()) throw new Error("Nama wajib diisi");
    if (!data.password || data.password.length < 6) throw new Error("Password minimal 6 karakter");
    if (data.role !== "super" && data.role !== "admin") throw new Error("Role tidak valid");
    const { hashPassword } = await import("./gate.server");
    const sb = await admin();
    const { error } = await sb.from("admin_users").insert({
      username,
      nama: data.nama.trim(),
      password_hash: hashPassword(data.password),
      role: data.role,
    });
    if (error) {
      if (error.code === "23505") throw new Error("Username sudah dipakai");
      throw new Error(error.message);
    }
    return { ok: true };
  });

export const updateAdmin = createServerFn({ method: "POST" })
  .inputValidator((d: { id: string; nama?: string; role?: "super" | "admin"; aktif?: boolean }) => d)
  .handler(async ({ data }) => {
    const s = await (await import("./gate.server")).requireSuper();
    const sb = await admin();
    // Prevent self-lockout: cannot demote or deactivate yourself
    if (data.id === s.data.userId && (data.role === "admin" || data.aktif === false)) {
      throw new Error("Tidak dapat menurunkan role atau menonaktifkan akun Anda sendiri");
    }
    const patch: {
      nama?: string;
      role?: "super" | "admin";
      aktif?: boolean;
      updated_at: string;
    } = { updated_at: new Date().toISOString() };
    if (data.nama !== undefined) patch.nama = data.nama.trim();
    if (data.role !== undefined) patch.role = data.role;
    if (data.aktif !== undefined) patch.aktif = data.aktif;
    const { error } = await sb.from("admin_users").update(patch).eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const resetAdminPassword = createServerFn({ method: "POST" })
  .inputValidator((d: { id: string; newPassword: string }) => d)
  .handler(async ({ data }) => {
    await (await import("./gate.server")).requireSuper();
    if (!data.newPassword || data.newPassword.length < 6) throw new Error("Password minimal 6 karakter");
    const { hashPassword } = await import("./gate.server");
    const sb = await admin();
    const { error } = await sb
      .from("admin_users")
      .update({ password_hash: hashPassword(data.newPassword), updated_at: new Date().toISOString() })
      .eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const deleteAdmin = createServerFn({ method: "POST" })
  .inputValidator((d: { id: string }) => d)
  .handler(async ({ data }) => {
    const s = await (await import("./gate.server")).requireSuper();
    if (data.id === s.data.userId) throw new Error("Tidak dapat menghapus akun Anda sendiri");
    const sb = await admin();
    // Ensure at least one super remains
    const { data: target } = await sb.from("admin_users").select("role").eq("id", data.id).maybeSingle();
    if (target?.role === "super") {
      const { count } = await sb.from("admin_users").select("id", { count: "exact", head: true }).eq("role", "super").eq("aktif", true);
      if ((count ?? 0) <= 1) throw new Error("Harus ada minimal satu super admin aktif");
    }
    const { error } = await sb.from("admin_users").delete().eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });
