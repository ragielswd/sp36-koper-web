import { createServerFn } from "@tanstack/react-start";

async function admin() {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  return supabaseAdmin;
}

export const login = createServerFn({ method: "POST" })
  .inputValidator((d: { username: string; password: string }) => d)
  .handler(async ({ data }) => {
    const username = (data.username || "").trim().toLowerCase();
    if (!username || !data.password) return { ok: false as const };
    const sb = await admin();
    const { data: user, error } = await sb
      .from("admin_users")
      .select("*")
      .eq("username", username)
      .eq("aktif", true)
      .maybeSingle();
    if (error || !user) return { ok: false as const };
    const { verifyPassword, getGateSession } = await import("./gate.server");
    if (!verifyPassword(data.password, user.password_hash)) return { ok: false as const };
    const s = await getGateSession();
    await s.update({ userId: user.id, username: user.username, nama: user.nama, role: user.role });
    return { ok: true as const };
  });

export const logout = createServerFn({ method: "POST" }).handler(async () => {
  const { getGateSession } = await import("./gate.server");
  const s = await getGateSession();
  await s.clear();
  return { ok: true as const };
});

export const me = createServerFn({ method: "GET" }).handler(async () => {
  const { getGateSession } = await import("./gate.server");
  const s = await getGateSession();
  if (!s.data.userId) return null;
  return { userId: s.data.userId, username: s.data.username, nama: s.data.nama, role: s.data.role };
});

export const changeOwnPassword = createServerFn({ method: "POST" })
  .inputValidator((d: { currentPassword: string; newPassword: string }) => d)
  .handler(async ({ data }) => {
    const { getGateSession, verifyPassword, hashPassword } = await import("./gate.server");
    const s = await getGateSession();
    if (!s.data.userId) throw new Error("Belum login");
    if (!data.newPassword || data.newPassword.length < 6) throw new Error("Password baru minimal 6 karakter");
    const sb = await admin();
    const { data: user } = await sb.from("admin_users").select("password_hash").eq("id", s.data.userId).maybeSingle();
    if (!user) throw new Error("Akun tidak ditemukan");
    if (!verifyPassword(data.currentPassword, user.password_hash)) throw new Error("Password saat ini salah");
    const { error } = await sb
      .from("admin_users")
      .update({ password_hash: hashPassword(data.newPassword), updated_at: new Date().toISOString() })
      .eq("id", s.data.userId);
    if (error) throw new Error(error.message);
    return { ok: true };
  });
