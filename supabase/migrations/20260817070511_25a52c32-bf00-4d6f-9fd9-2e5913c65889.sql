CREATE TYPE public.member_status AS ENUM ('active', 'removed');
CREATE TYPE public.removal_reason AS ENUM ('rejoin', 'reassign', 'rejected', 'mia');

ALTER TABLE public.members
  ADD COLUMN sort_order integer,
  ADD COLUMN join_date date,
  ADD COLUMN status public.member_status NOT NULL DEFAULT 'active',
  ADD COLUMN removal_reason public.removal_reason,
  ADD COLUMN removed_at timestamptz,
  ADD COLUMN position_at_removal integer,
  ADD COLUMN restriction_lifted_at timestamptz;

WITH ordered AS (
  SELECT id, row_number() OVER (ORDER BY name) AS rn FROM public.members
)
UPDATE public.members m SET sort_order = ordered.rn FROM ordered WHERE ordered.id = m.id;

ALTER TABLE public.members ALTER COLUMN sort_order SET DEFAULT 0;
UPDATE public.members SET sort_order = 0 WHERE sort_order IS NULL;
ALTER TABLE public.members ALTER COLUMN sort_order SET NOT NULL;

CREATE INDEX members_sort_order_idx ON public.members (sort_order);

CREATE TABLE public.guild_settings (
  id boolean PRIMARY KEY DEFAULT true,
  new_member_restriction_hours integer NOT NULL DEFAULT 96,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT guild_settings_singleton CHECK (id),
  CONSTRAINT guild_settings_hours_nonneg CHECK (new_member_restriction_hours >= 0)
);

GRANT SELECT ON public.guild_settings TO anon;
GRANT SELECT, INSERT, UPDATE ON public.guild_settings TO authenticated;
GRANT ALL ON public.guild_settings TO service_role;

ALTER TABLE public.guild_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view guild settings" ON public.guild_settings
  FOR SELECT USING (true);
CREATE POLICY "Admins can insert guild settings" ON public.guild_settings
  FOR INSERT TO authenticated WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins can update guild settings" ON public.guild_settings
  FOR UPDATE TO authenticated USING (public.has_role(auth.uid(), 'admin'));

CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$ BEGIN NEW.updated_at = now(); RETURN NEW; END; $$
LANGUAGE plpgsql SET search_path = public;

CREATE TRIGGER guild_settings_updated_at BEFORE UPDATE ON public.guild_settings
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

INSERT INTO public.guild_settings (id) VALUES (true) ON CONFLICT (id) DO NOTHING;