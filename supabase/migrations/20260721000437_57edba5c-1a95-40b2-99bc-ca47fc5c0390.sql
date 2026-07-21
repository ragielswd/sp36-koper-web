ALTER TABLE public.simpanan ADD COLUMN IF NOT EXISTS dibuat_oleh TEXT;
ALTER TABLE public.pinjaman ADD COLUMN IF NOT EXISTS dibuat_oleh TEXT;
ALTER TABLE public.angsuran ADD COLUMN IF NOT EXISTS dibuat_oleh TEXT;