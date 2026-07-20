import * as React from "react";
import { useState } from "react";
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ShieldAlert } from "lucide-react";

/**
 * Delete-confirmation dialog. Super admin sees a plain confirm.
 * Regular admin must enter an active super admin password before deleting.
 */
export function DeleteConfirm({
  trigger,
  title = "Hapus data?",
  description,
  isSuper,
  onConfirm,
  confirmLabel = "Hapus",
}: {
  trigger: React.ReactNode;
  title?: string;
  description?: React.ReactNode;
  isSuper: boolean;
  onConfirm: (superPassword?: string) => Promise<unknown> | unknown;
  confirmLabel?: string;
}) {
  const [open, setOpen] = useState(false);
  const [pw, setPw] = useState("");
  const [busy, setBusy] = useState(false);

  async function handle() {
    setBusy(true);
    try {
      await onConfirm(isSuper ? undefined : pw);
      setOpen(false);
      setPw("");
    } finally {
      setBusy(false);
    }
  }

  return (
    <AlertDialog open={open} onOpenChange={(v) => { setOpen(v); if (!v) setPw(""); }}>
      <AlertDialogTrigger asChild>{trigger}</AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{title}</AlertDialogTitle>
          {description && <AlertDialogDescription asChild><div>{description}</div></AlertDialogDescription>}
        </AlertDialogHeader>

        {!isSuper && (
          <div className="rounded-md border bg-amber-50 border-amber-200 p-3 text-sm space-y-2">
            <div className="flex items-center gap-2 text-amber-800 font-medium">
              <ShieldAlert className="w-4 h-4" />
              Konfirmasi Super Admin
            </div>
            <p className="text-amber-900 text-xs">
              Tindakan hapus memerlukan verifikasi. Masukkan password salah satu akun super admin untuk melanjutkan.
            </p>
            <div className="space-y-1.5">
              <Label htmlFor="super-pw">Password Super Admin</Label>
              <Input
                id="super-pw"
                type="password"
                value={pw}
                autoFocus
                onChange={(e) => setPw(e.target.value)}
                placeholder="••••••••"
              />
            </div>
          </div>
        )}

        <AlertDialogFooter>
          <Button variant="ghost" onClick={() => setOpen(false)} disabled={busy}>Batal</Button>
          <Button
            variant="destructive"
            onClick={handle}
            disabled={busy || (!isSuper && pw.length < 1)}
          >
            {confirmLabel}
          </Button>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
