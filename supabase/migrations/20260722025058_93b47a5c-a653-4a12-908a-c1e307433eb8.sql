CREATE TABLE public.koperasi_settings (
  id INTEGER PRIMARY KEY DEFAULT 1,
  whatsapp_number TEXT,
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  CONSTRAINT koperasi_settings_singleton CHECK (id = 1)
);

GRANT ALL ON public.koperasi_settings TO service_role;

ALTER TABLE public.koperasi_settings ENABLE ROW LEVEL SECURITY;

-- No policies: table only reachable via service_role (server-side gated fns).

INSERT INTO public.koperasi_settings (id, whatsapp_number) VALUES (1, NULL)
ON CONFLICT (id) DO NOTHING;