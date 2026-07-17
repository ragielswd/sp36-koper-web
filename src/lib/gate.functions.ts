import { createServerFn } from "@tanstack/react-start";
import { createHash, timingSafeEqual } from "node:crypto";

function passwordMatches(input: string, expected: string): boolean {
  const a = createHash("sha256").update(input, "utf8").digest();
  const b = createHash("sha256").update(expected, "utf8").digest();
  return timingSafeEqual(a, b);
}

export const unlockSite = createServerFn({ method: "POST" })
  .inputValidator((data: { password: string }) => data)
  .handler(async ({ data }) => {
    const expected = process.env.SITE_PASSWORD;
    if (!expected) throw new Error("SITE_PASSWORD tidak diatur");
    if (!passwordMatches(data.password, expected)) return { ok: false as const };
    const { getGateSession } = await import("./gate.server");
    const session = await getGateSession();
    await session.update({ unlocked: true });
    return { ok: true as const };
  });

export const lockSite = createServerFn({ method: "POST" }).handler(async () => {
  const { getGateSession } = await import("./gate.server");
  const session = await getGateSession();
  await session.clear();
  return { ok: true as const };
});

export const checkUnlocked = createServerFn({ method: "GET" }).handler(async () => {
  const { getGateSession } = await import("./gate.server");
  const session = await getGateSession();
  return { unlocked: !!session.data.unlocked };
});
