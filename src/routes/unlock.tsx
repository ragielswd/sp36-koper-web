import { createFileRoute, useRouter } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";
import { login } from "@/lib/gate.functions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { KeyRound, Loader2 } from "lucide-react";

export const Route = createFileRoute("/unlock")({
  head: () => ({ meta: [{ title: "Masuk — Koperasi SMPN 36" }] }),
  component: LoginPage,
});

function LoginPage() {
  const router = useRouter();
  const loginFn = useServerFn(login);
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState(false);
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    setError(false);
    try {
      const { ok } = await loginFn({ data: { username, password } });
      if (ok) await router.navigate({ to: "/dashboard" });
      else setError(true);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-muted/30 px-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center space-y-3">
          <div className="mx-auto w-12 h-12 rounded-xl bg-primary/10 text-primary flex items-center justify-center">
            <KeyRound className="w-6 h-6" />
          </div>
          <div>
            <CardTitle className="text-xl">Koperasi SMPN 36</CardTitle>
            <CardDescription>Simpan Pinjam — Panel Admin</CardDescription>
          </div>
        </CardHeader>
        <CardContent>
          <form onSubmit={onSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="username">Username</Label>
              <Input
                id="username"
                name="username"
                autoComplete="username"
                autoFocus
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <Input
                id="password"
                name="password"
                type="password"
                autoComplete="current-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
              {error && <p className="text-sm text-destructive">Username atau password salah.</p>}
            </div>
            <Button type="submit" className="w-full" disabled={loading || !username || !password}>
              {loading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              Masuk
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
