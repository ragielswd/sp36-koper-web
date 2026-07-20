import { useSession } from "@tanstack/react-start/server";
import { redirect } from "@tanstack/react-router";
import { scryptSync, randomBytes, timingSafeEqual } from "node:crypto";

const sessionConfig = {
  password: process.env.SESSION_SECRET || "dev-only-fallback-session-secret-please-set-32-chars",
  name: "koperasi-gate",
  maxAge: 60 * 60 * 24 * 7,
  cookie: { httpOnly: true, secure: true, sameSite: "lax" as const, path: "/" },
};

export type AdminRole = "super" | "admin";
export type GateSession = { userId?: string; username?: string; nama?: string; role?: AdminRole };

export function hashPassword(password: string): string {
  const salt = randomBytes(16);
  const hash = scryptSync(password, salt, 64);
  return salt.toString("hex") + ":" + hash.toString("hex");
}

export function verifyPassword(password: string, stored: string): boolean {
  const [saltHex, hashHex] = stored.split(":");
  if (!saltHex || !hashHex) return false;
  const salt = Buffer.from(saltHex, "hex");
  const expected = Buffer.from(hashHex, "hex");
  let actual: Buffer;
  try {
    actual = scryptSync(password, salt, expected.length);
  } catch {
    return false;
  }
  if (actual.length !== expected.length) return false;
  return timingSafeEqual(actual, expected);
}

export async function getGateSession() {
  return useSession<GateSession>(sessionConfig);
}

export async function requireAdmin() {
  const s = await getGateSession();
  if (!s.data.userId) throw redirect({ to: "/unlock" });
  return s;
}

export async function requireSuper() {
  const s = await requireAdmin();
  if (s.data.role !== "super") throw new Error("Akses ditolak: hanya super admin.");
  return s;
}

/**
 * Verify that `password` matches any active super admin's password.
 * Used to require super-admin confirmation for destructive actions
 * performed by regular admins.
 */
export async function verifySuperPassword(password: string): Promise<boolean> {
  if (!password) return false;
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const { data } = await supabaseAdmin
    .from("admin_users")
    .select("password_hash")
    .eq("role", "super")
    .eq("aktif", true);
  if (!data || data.length === 0) return false;
  for (const u of data) {
    if (verifyPassword(password, u.password_hash)) return true;
  }
  return false;
}

/**
 * If caller is not super, require a valid super admin password to proceed.
 * Throws with a Bahasa Indonesia message on failure.
 */
export async function requireSuperOrPassword(password?: string) {
  const s = await requireAdmin();
  if (s.data.role === "super") return s;
  if (!password) throw new Error("Konfirmasi super admin diperlukan: masukkan password akun super admin.");
  const ok = await verifySuperPassword(password);
  if (!ok) throw new Error("Password super admin salah.");
  return s;
}
