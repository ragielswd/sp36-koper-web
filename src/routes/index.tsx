import { createFileRoute, redirect } from "@tanstack/react-router";
import { checkUnlocked } from "@/lib/gate.functions";

export const Route = createFileRoute("/")({
  beforeLoad: async () => {
    const { unlocked } = await checkUnlocked();
    throw redirect({ to: unlocked ? "/dashboard" : "/unlock" });
  },
  component: () => null,
});
