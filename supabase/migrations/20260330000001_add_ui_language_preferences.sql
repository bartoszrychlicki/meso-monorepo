ALTER TABLE public.users_users
  ADD COLUMN IF NOT EXISTS ui_language TEXT
  CHECK (ui_language IN ('pl', 'en'));

ALTER TABLE public.crm_customers
  ADD COLUMN IF NOT EXISTS ui_language TEXT
  CHECK (ui_language IN ('pl', 'en'));
