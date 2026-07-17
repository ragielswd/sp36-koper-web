import { createFileRoute, redirect } from "@tanstack/react-router";
import { me } from "@/lib/gate.functions";

export const Route = createFileRoute("/")({
  beforeLoad: async () => {
    const user = await me();
    throw redirect({ to: user ? "/dashboard" : "/unlock" });
  },
  component: () => null,
});
