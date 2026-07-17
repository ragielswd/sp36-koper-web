import { useSession } from "@tanstack/react-start/server";
import { redirect } from "@tanstack/react-router";

const sessionConfig = {
  password: process.env.SESSION_SECRET || "dev-only-fallback-session-secret-please-set-32-chars",
  name: "koperasi-gate",
  maxAge: 60 * 60 * 24 * 7,
  cookie: { httpOnly: true, secure: true, sameSite: "lax" as const, path: "/" },
};

export type GateSession = { unlocked?: boolean };

export function gateSessionConfig() {
  return sessionConfig;
}

export async function getGateSession() {
  return useSession<GateSession>(sessionConfig);
}

export async function requireUnlocked() {
  const session = await useSession<GateSession>(sessionConfig);
  if (!session.data.unlocked) throw redirect({ to: "/unlock" });
  return session;
}
