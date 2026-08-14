CREATE TYPE public.job_class AS ENUM ('Lord Knight','Paladin','Sniper','Minstrel','Gypsy','High Priest','Champion','Whitesmith','Biochemist','High Wizard','Professor','Doram','Gunslinger','Stalker','Assassin Cross');
CREATE TYPE public.app_role AS ENUM ('admin');
CREATE TYPE public.raid_section AS ENUM ('elite','sub');

CREATE TABLE public.members (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  job_class public.job_class NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.members TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.members TO authenticated;
GRANT ALL ON public.members TO service_role;
ALTER TABLE public.members ENABLE ROW LEVEL SECURITY;

CREATE TABLE public.party_assignments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  section public.raid_section NOT NULL,
  team_index int NOT NULL CHECK (team_index BETWEEN 0 AND 7),
  slot_index int NOT NULL CHECK (slot_index BETWEEN 0 AND 4),
  member_id uuid NOT NULL REFERENCES public.members(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (section, team_index, slot_index),
  UNIQUE (member_id)
);
GRANT SELECT ON public.party_assignments TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.party_assignments TO authenticated;
GRANT ALL ON public.party_assignments TO service_role;
ALTER TABLE public.party_assignments ENABLE ROW LEVEL SECURITY;

CREATE TABLE public.user_roles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  role public.app_role NOT NULL,
  UNIQUE (user_id, role)
);
GRANT SELECT ON public.user_roles TO authenticated;
GRANT ALL ON public.user_roles TO service_role;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role public.app_role)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = _role)
$$;

CREATE POLICY "Anyone can view members" ON public.members FOR SELECT USING (true);
CREATE POLICY "Admins can insert members" ON public.members FOR INSERT TO authenticated WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins can update members" ON public.members FOR UPDATE TO authenticated USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins can delete members" ON public.members FOR DELETE TO authenticated USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Anyone can view assignments" ON public.party_assignments FOR SELECT USING (true);
CREATE POLICY "Admins can insert assignments" ON public.party_assignments FOR INSERT TO authenticated WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins can update assignments" ON public.party_assignments FOR UPDATE TO authenticated USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins can delete assignments" ON public.party_assignments FOR DELETE TO authenticated USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Users can view their own roles" ON public.user_roles FOR SELECT TO authenticated USING (auth.uid() = user_id);