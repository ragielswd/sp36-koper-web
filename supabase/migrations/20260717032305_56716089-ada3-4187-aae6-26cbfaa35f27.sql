
-- Anggota
CREATE TABLE public.anggota (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nama TEXT NOT NULL,
  nip TEXT,
  jabatan TEXT,
  telepon TEXT,
  tanggal_bergabung DATE NOT NULL DEFAULT CURRENT_DATE,
  aktif BOOLEAN NOT NULL DEFAULT true,
  catatan TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT ALL ON public.anggota TO service_role;
ALTER TABLE public.anggota ENABLE ROW LEVEL SECURITY;

-- Simpanan
CREATE TABLE public.simpanan (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  anggota_id UUID NOT NULL REFERENCES public.anggota(id) ON DELETE CASCADE,
  jenis TEXT NOT NULL CHECK (jenis IN ('pokok','wajib','sukarela')),
  tipe TEXT NOT NULL DEFAULT 'setor' CHECK (tipe IN ('setor','tarik')),
  jumlah NUMERIC(14,2) NOT NULL CHECK (jumlah >= 0),
  tanggal DATE NOT NULL DEFAULT CURRENT_DATE,
  catatan TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_simpanan_anggota ON public.simpanan(anggota_id);
GRANT ALL ON public.simpanan TO service_role;
ALTER TABLE public.simpanan ENABLE ROW LEVEL SECURITY;

-- Pinjaman
CREATE TABLE public.pinjaman (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  anggota_id UUID NOT NULL REFERENCES public.anggota(id) ON DELETE CASCADE,
  pokok NUMERIC(14,2) NOT NULL CHECK (pokok > 0),
  bunga_persen NUMERIC(6,3) NOT NULL DEFAULT 0,
  bunga_tipe TEXT NOT NULL DEFAULT 'flat' CHECK (bunga_tipe IN ('flat','menurun','tetap','tanpa')),
  tenor_bulan INT NOT NULL CHECK (tenor_bulan > 0),
  tanggal_pinjam DATE NOT NULL DEFAULT CURRENT_DATE,
  status TEXT NOT NULL DEFAULT 'aktif' CHECK (status IN ('aktif','lunas','macet')),
  catatan TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_pinjaman_anggota ON public.pinjaman(anggota_id);
GRANT ALL ON public.pinjaman TO service_role;
ALTER TABLE public.pinjaman ENABLE ROW LEVEL SECURITY;

-- Angsuran
CREATE TABLE public.angsuran (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  pinjaman_id UUID NOT NULL REFERENCES public.pinjaman(id) ON DELETE CASCADE,
  tanggal DATE NOT NULL DEFAULT CURRENT_DATE,
  pokok NUMERIC(14,2) NOT NULL DEFAULT 0 CHECK (pokok >= 0),
  bunga NUMERIC(14,2) NOT NULL DEFAULT 0 CHECK (bunga >= 0),
  denda NUMERIC(14,2) NOT NULL DEFAULT 0 CHECK (denda >= 0),
  catatan TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_angsuran_pinjaman ON public.angsuran(pinjaman_id);
GRANT ALL ON public.angsuran TO service_role;
ALTER TABLE public.angsuran ENABLE ROW LEVEL SECURITY;
