import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import {
  Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger,
} from "@/components/ui/dialog";
import { MessageCircle } from "lucide-react";
import { toast } from "sonner";
import { rupiah } from "@/lib/format";

type Props = {
  namaAnggota: string;
  teleponAnggota: string | null | undefined;
  koperasiWa: string | null | undefined;
  jatuhTempo: number | null | undefined;
  sisa: number;
  hariMenuju: number | null;
  trigger?: React.ReactNode;
};

/** Normalisasi nomor menjadi format internasional tanpa tanda plus (untuk wa.me). */
function normalize(no: string | null | undefined): string {
  if (!no) return "";
  let n = no.replace(/[^\d]/g, "");
  if (n.startsWith("0")) n = "62" + n.slice(1);
  if (n.startsWith("620")) n = "62" + n.slice(3);
  return n;
}

function defaultMessage(p: Props): string {
  const koperasi = "Koperasi SMP Negeri 36 Samarinda";
  const status =
    p.hariMenuju === null ? "" :
    p.hariMenuju < 0 ? `sudah lewat ${Math.abs(p.hariMenuju)} hari` :
    p.hariMenuju === 0 ? "jatuh tempo hari ini" :
    `akan jatuh tempo dalam ${p.hariMenuju} hari`;
  const jt = p.jatuhTempo ? `tanggal ${p.jatuhTempo} setiap bulannya` : "sesuai kesepakatan";

  return [
    `Assalamu'alaikum Bapak/Ibu ${p.namaAnggota},`,
    ``,
    `Kami dari ${koperasi} mengingatkan bahwa pembayaran angsuran pinjaman Bapak/Ibu ${status} (jadwal ${jt}).`,
    `Sisa pinjaman saat ini: ${rupiah(p.sisa)}.`,
    ``,
    `Mohon segera melakukan pembayaran angsuran melalui bendahara koperasi.`,
    `Terima kasih atas perhatian dan kerja samanya.`,
    ``,
    `Hormat kami,`,
    koperasi,
  ].join("\n");
}

export function WhatsAppTagihanButton(props: Props) {
  const [open, setOpen] = useState(false);
  const [phone, setPhone] = useState(props.teleponAnggota ?? "");
  const [msg, setMsg] = useState(() => defaultMessage(props));

  function reset() {
    setPhone(props.teleponAnggota ?? "");
    setMsg(defaultMessage(props));
  }

  function kirim() {
    const to = normalize(phone);
    if (!to) return toast.error("Nomor WhatsApp anggota belum diisi.");
    if (!props.koperasiWa) {
      toast.warning("Nomor WhatsApp koperasi belum diatur. Pesan tetap dikirim dari WhatsApp perangkat Anda.");
    }
    const url = `https://wa.me/${to}?text=${encodeURIComponent(msg)}`;
    window.open(url, "_blank", "noopener");
    setOpen(false);
  }

  const trigger = props.trigger ?? (
    <Button size="icon" variant="ghost" title="Kirim pesan penagihan via WhatsApp">
      <MessageCircle className="w-4 h-4 text-emerald-600" />
    </Button>
  );

  return (
    <Dialog
      open={open}
      onOpenChange={(v) => { setOpen(v); if (v) reset(); }}
    >
      <DialogTrigger asChild>{trigger}</DialogTrigger>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <MessageCircle className="w-4 h-4 text-emerald-600" />
            Kirim Pesan Penagihan
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>Nomor WA Anggota</Label>
              <Input value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="cth. 08123456789" />
            </div>
            <div className="space-y-1.5">
              <Label>Dikirim dari (Koperasi)</Label>
              <Input value={props.koperasiWa ?? ""} readOnly placeholder="belum diatur" className="bg-muted/40" />
            </div>
          </div>
          <div className="space-y-1.5">
            <Label>Isi Pesan</Label>
            <Textarea rows={10} value={msg} onChange={(e) => setMsg(e.target.value)} />
            <p className="text-[11px] text-muted-foreground">
              WhatsApp akan terbuka di tab baru. Pastikan akun WhatsApp koperasi ({props.koperasiWa || "belum diatur"}) telah login di perangkat ini sebelum menekan Kirim.
            </p>
          </div>
        </div>
        <DialogFooter>
          <Button variant="ghost" onClick={() => setOpen(false)}>Batal</Button>
          <Button onClick={kirim} className="bg-emerald-600 hover:bg-emerald-700">
            <MessageCircle className="w-4 h-4" />Kirim via WhatsApp
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
