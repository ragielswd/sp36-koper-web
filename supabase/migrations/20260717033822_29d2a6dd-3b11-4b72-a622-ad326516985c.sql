
CREATE TABLE public.admin_users (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  username text NOT NULL UNIQUE,
  password_hash text NOT NULL,
  nama text NOT NULL,
  role text NOT NULL DEFAULT 'admin' CHECK (role IN ('super','admin')),
  aktif boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT ALL ON public.admin_users TO service_role;

ALTER TABLE public.admin_users ENABLE ROW LEVEL SECURITY;

-- No policies: only service_role (server-side) can access. RLS blocks anon/authenticated.

INSERT INTO public.admin_users (username, password_hash, nama, role)
VALUES ('superadmin', '45c6eb85d278814f267197c64a90e4f0:be250f658fb303c3a9620c9fa5104afce451d49ecb52994b177c4c947b8ae151a66feda869f30cfb6465099564b674ab3a3866c2c731e48ae383bf4e8c28ad69', 'Super Admin', 'super');
