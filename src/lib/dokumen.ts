import logoAsset from "@/assets/logo-koperasi.png.asset.json";
import { formatTanggal, rupiah } from "./format";

const LOGO_URL = logoAsset.url;

function terbilang(n: number): string {
  const bilangan = ["", "satu", "dua", "tiga", "empat", "lima", "enam", "tujuh", "delapan", "sembilan", "sepuluh", "sebelas"];
  n = Math.floor(Math.abs(n));
  if (n < 12) return bilangan[n] || "nol";
  if (n < 20) return terbilang(n - 10) + " belas";
  if (n < 100) return terbilang(Math.floor(n / 10)) + " puluh" + (n % 10 ? " " + terbilang(n % 10) : "");
  if (n < 200) return "seratus" + (n - 100 ? " " + terbilang(n - 100) : "");
  if (n < 1000) return terbilang(Math.floor(n / 100)) + " ratus" + (n % 100 ? " " + terbilang(n % 100) : "");
  if (n < 2000) return "seribu" + (n - 1000 ? " " + terbilang(n - 1000) : "");
  if (n < 1_000_000) return terbilang(Math.floor(n / 1000)) + " ribu" + (n % 1000 ? " " + terbilang(n % 1000) : "");
  if (n < 1_000_000_000) return terbilang(Math.floor(n / 1_000_000)) + " juta" + (n % 1_000_000 ? " " + terbilang(n % 1_000_000) : "");
  if (n < 1_000_000_000_000) return terbilang(Math.floor(n / 1_000_000_000)) + " miliar" + (n % 1_000_000_000 ? " " + terbilang(n % 1_000_000_000) : "");
  return String(n);
}

function capitalize(s: string) {
  return s.charAt(0).toUpperCase() + s.slice(1);
}

const KOP = `
<style>
  * { box-sizing: border-box; }
  body { font-family: ui-sans-serif, system-ui, sans-serif; margin: 24px; color:#111827; }
  .wrap { max-width: 700px; margin: 0 auto; border: 1px solid #d1d5db; padding: 24px; position:relative; overflow:hidden; }
  .wrap::before { content:""; position:absolute; inset:0; background: url('${LOGO_URL}') center/60% no-repeat; opacity:.06; pointer-events:none; }
  header { display:flex; align-items:center; gap:12px; border-bottom:2px solid #111827; padding-bottom:12px; margin-bottom:16px; }
  header img { width:64px; height:64px; object-fit:contain; }
  h1 { font-size: 16px; margin:0; }
  .sub { font-size: 12px; color:#4b5563; }
  .title { text-align:center; font-weight:700; letter-spacing:.08em; text-transform:uppercase; margin:12px 0; font-size:14px; }
  table.data { width:100%; font-size:13px; border-collapse:collapse; }
  table.data td { padding: 4px 6px; vertical-align: top; }
  table.data td.k { color:#4b5563; width: 38%; }
  .total { border-top:1px dashed #9ca3af; margin-top:10px; padding-top:8px; display:flex; justify-content:space-between; font-weight:700; font-size:15px; }
  .sign { display:flex; justify-content:space-between; margin-top:40px; font-size:12px; }
  .sign div { text-align:center; width:220px; }
  .line { border-top:1px solid #111827; margin-top:56px; padding-top:4px; }
  p, li { font-size: 13px; line-height:1.6; }
  ol { padding-left: 20px; }
  @media print { body { margin: 0 } .wrap { border: none } }
</style>
`;

function kopHeader(subtitle: string) {
  return `
<header>
  <img src="${LOGO_URL}" alt=""/>
  <div>
    <h1>Koperasi Simpan Pinjam SMP Negeri 36 Samarinda</h1>
    <div class="sub">${subtitle}</div>
  </div>
</header>`;
}

export function renderStrukSimpanan(opts: {
  namaAnggota: string;
  nip?: string | null;
  tanggal: string;
  jenis: "pokok" | "wajib" | "sukarela";
  tipe: "setor" | "tarik";
  jumlah: number;
  catatan?: string | null;
  nomor: string;
}) {
  const isSetor = opts.tipe === "setor";
  return `<!doctype html><html><head><meta charset="utf-8"><title>Struk Simpanan</title>${KOP}</head><body>
<div class="wrap">
  ${kopHeader(`Struk ${isSetor ? "Setoran" : "Penarikan"} Simpanan`)}
  <div class="title">Struk ${isSetor ? "Setoran" : "Penarikan"} — ${capitalize(opts.jenis)}</div>
  <table class="data">
    <tr><td class="k">No. Referensi</td><td>: ${String(opts.nomor).slice(0, 8).toUpperCase()}</td></tr>
    <tr><td class="k">Nama Anggota</td><td>: <b>${opts.namaAnggota}</b>${opts.nip ? " (NIP " + opts.nip + ")" : ""}</td></tr>
    <tr><td class="k">Tanggal</td><td>: ${formatTanggal(opts.tanggal)}</td></tr>
    <tr><td class="k">Jenis Simpanan</td><td>: ${capitalize(opts.jenis)}</td></tr>
    <tr><td class="k">Transaksi</td><td>: ${isSetor ? "Setoran" : "Penarikan"}</td></tr>
    ${opts.catatan ? `<tr><td class="k">Catatan</td><td>: ${opts.catatan}</td></tr>` : ""}
  </table>
  <div class="total"><span>${isSetor ? "Jumlah Disetor" : "Jumlah Ditarik"}</span><span>${rupiah(opts.jumlah)}</span></div>
  <p style="font-size:12px;color:#4b5563;margin-top:4px">Terbilang: <i>${capitalize(terbilang(opts.jumlah))} rupiah</i></p>
  <div class="sign">
    <div><div class="line">Anggota</div></div>
    <div><div class="line">Bendahara Koperasi</div></div>
  </div>
</div>
</body></html>`;
}

export function renderSuratPerjanjian(opts: {
  namaAnggota: string;
  nip?: string | null;
  jabatan?: string | null;
  pokok: number;
  bungaPersen: number;
  bungaTipe: "flat" | "menurun" | "tetap" | "tanpa";
  tenor: number;
  tanggalPinjam: string;
  tglJatuhTempo?: number | null;
  angsuranBulanan: number;
  nomor: string;
}) {
  const totalBayar = opts.angsuranBulanan * opts.tenor;
  const bungaText =
    opts.bungaTipe === "tanpa"
      ? "tanpa bunga"
      : opts.bungaTipe === "tetap"
        ? `jasa tetap sebesar ${rupiah(opts.bungaPersen)} per bulan`
        : `bunga ${opts.bungaPersen}% per bulan (${opts.bungaTipe})`;
  return `<!doctype html><html><head><meta charset="utf-8"><title>Surat Perjanjian Pinjaman</title>${KOP}</head><body>
<div class="wrap">
  ${kopHeader("Surat Perjanjian Pinjaman Tanpa Agunan")}
  <div class="title">Surat Perjanjian Pinjaman Tanpa Agunan</div>
  <p>No. ${String(opts.nomor).slice(0, 8).toUpperCase()}</p>
  <p>Pada hari ini, ${formatTanggal(opts.tanggalPinjam)}, telah dibuat perjanjian pinjaman tanpa agunan antara:</p>
  <p><b>PIHAK PERTAMA</b> — Pengurus Koperasi Simpan Pinjam SMP Negeri 36 Samarinda, selanjutnya disebut <b>Koperasi</b>.</p>
  <p><b>PIHAK KEDUA</b> — <b>${opts.namaAnggota}</b>${opts.nip ? `, NIP ${opts.nip}` : ""}${opts.jabatan ? `, ${opts.jabatan}` : ""}, selanjutnya disebut <b>Peminjam</b>.</p>
  <p>Kedua belah pihak sepakat untuk mengikatkan diri dalam perjanjian ini dengan ketentuan sebagai berikut:</p>
  <ol>
    <li>Koperasi memberikan pinjaman kepada Peminjam sebesar <b>${rupiah(opts.pokok)}</b> (${terbilang(opts.pokok)} rupiah) <b>tanpa agunan</b>.</li>
    <li>Pinjaman dikenakan ${bungaText}.</li>
    <li>Jangka waktu pengembalian adalah <b>${opts.tenor} bulan</b> terhitung sejak tanggal perjanjian ini.</li>
    <li>Peminjam wajib membayar angsuran sebesar <b>${rupiah(opts.angsuranBulanan)}</b> setiap bulan${opts.tglJatuhTempo ? `, paling lambat tanggal <b>${opts.tglJatuhTempo}</b> setiap bulannya` : ""}.</li>
    <li>Total kewajiban yang harus dibayarkan Peminjam sampai lunas adalah <b>${rupiah(totalBayar)}</b>.</li>
    <li>Apabila Peminjam terlambat membayar angsuran, dapat dikenakan denda sesuai ketentuan Koperasi.</li>
    <li>Peminjam dengan sadar dan tanpa paksaan menyatakan sanggup memenuhi seluruh kewajiban di atas. Perjanjian ini bersifat tanpa agunan sehingga Peminjam bertanggung jawab penuh atas pelunasan pinjaman.</li>
  </ol>
  <p>Demikian surat perjanjian ini dibuat untuk dipergunakan sebagaimana mestinya.</p>
  <div class="sign">
    <div><div class="line">Peminjam<br/>(${opts.namaAnggota})</div></div>
    <div><div class="line">Ketua Koperasi</div></div>
  </div>
</div>
</body></html>`;
}
