CREATE TYPE public.auction_type AS ENUM ('guild_league', 'emperium_overrun', 'standard');
CREATE TYPE public.auction_status AS ENUM ('open', 'finalized', 'amended');
CREATE TYPE public.allocation_status AS ENUM ('valid', 'warning', 'error', 'superseded');

CREATE TABLE public.auctions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  auction_type public.auction_type NOT NULL DEFAULT 'standard',
  auction_date date NOT NULL DEFAULT current_date,
  status public.auction_status NOT NULL DEFAULT 'open',
  pointer integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.auctions TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.auctions TO authenticated;
GRANT ALL ON public.auctions TO service_role;
ALTER TABLE public.auctions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can view auctions" ON public.auctions FOR SELECT USING (true);
CREATE POLICY "Admins insert auctions" ON public.auctions FOR INSERT TO authenticated WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins update auctions" ON public.auctions FOR UPDATE TO authenticated USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins delete auctions" ON public.auctions FOR DELETE TO authenticated USING (public.has_role(auth.uid(), 'admin'));
CREATE TRIGGER auctions_updated_at BEFORE UPDATE ON public.auctions FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TABLE public.auction_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  auction_id uuid NOT NULL REFERENCES public.auctions(id) ON DELETE CASCADE,
  item_name text NOT NULL,
  added_items integer NOT NULL DEFAULT 1 CHECK (added_items >= 0),
  max_per_bidder integer NOT NULL DEFAULT 1 CHECK (max_per_bidder >= 1),
  position integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX auction_items_auction_idx ON public.auction_items (auction_id, position);
GRANT SELECT ON public.auction_items TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.auction_items TO authenticated;
GRANT ALL ON public.auction_items TO service_role;
ALTER TABLE public.auction_items ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can view auction items" ON public.auction_items FOR SELECT USING (true);
CREATE POLICY "Admins insert auction items" ON public.auction_items FOR INSERT TO authenticated WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins update auction items" ON public.auction_items FOR UPDATE TO authenticated USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins delete auction items" ON public.auction_items FOR DELETE TO authenticated USING (public.has_role(auth.uid(), 'admin'));

CREATE TABLE public.auction_participants (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  auction_id uuid NOT NULL REFERENCES public.auctions(id) ON DELETE CASCADE,
  member_id uuid REFERENCES public.members(id) ON DELETE SET NULL,
  ign text NOT NULL,
  tickets integer NOT NULL DEFAULT 1 CHECK (tickets >= 1),
  needs_reconciliation boolean NOT NULL DEFAULT false,
  dropped boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX auction_participants_auction_idx ON public.auction_participants (auction_id);
GRANT SELECT ON public.auction_participants TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.auction_participants TO authenticated;
GRANT ALL ON public.auction_participants TO service_role;
ALTER TABLE public.auction_participants ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can view auction participants" ON public.auction_participants FOR SELECT USING (true);
CREATE POLICY "Admins insert auction participants" ON public.auction_participants FOR INSERT TO authenticated WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins update auction participants" ON public.auction_participants FOR UPDATE TO authenticated USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins delete auction participants" ON public.auction_participants FOR DELETE TO authenticated USING (public.has_role(auth.uid(), 'admin'));

CREATE TABLE public.allocations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  auction_id uuid NOT NULL REFERENCES public.auctions(id) ON DELETE CASCADE,
  item_id uuid NOT NULL REFERENCES public.auction_items(id) ON DELETE CASCADE,
  participant_id uuid REFERENCES public.auction_participants(id) ON DELETE SET NULL,
  ign text NOT NULL,
  quantity integer NOT NULL DEFAULT 0 CHECK (quantity >= 0),
  status public.allocation_status NOT NULL DEFAULT 'valid',
  flag_note text,
  queue_index integer NOT NULL DEFAULT 0,
  supersedes_id uuid REFERENCES public.allocations(id) ON DELETE SET NULL,
  superseded_reason public.removal_reason,
  superseded_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX allocations_auction_idx ON public.allocations (auction_id, item_id, queue_index);
GRANT SELECT ON public.allocations TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.allocations TO authenticated;
GRANT ALL ON public.allocations TO service_role;
ALTER TABLE public.allocations ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can view allocations" ON public.allocations FOR SELECT USING (true);
CREATE POLICY "Admins insert allocations" ON public.allocations FOR INSERT TO authenticated WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins update allocations" ON public.allocations FOR UPDATE TO authenticated USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins delete allocations" ON public.allocations FOR DELETE TO authenticated USING (public.has_role(auth.uid(), 'admin'));
CREATE TRIGGER allocations_updated_at BEFORE UPDATE ON public.allocations FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TABLE public.auction_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  auction_id uuid NOT NULL REFERENCES public.auctions(id) ON DELETE CASCADE,
  kind text NOT NULL,
  detail text NOT NULL,
  actor text,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX auction_events_auction_idx ON public.auction_events (auction_id, created_at);
GRANT SELECT ON public.auction_events TO anon;
GRANT SELECT, INSERT, DELETE ON public.auction_events TO authenticated;
GRANT ALL ON public.auction_events TO service_role;
ALTER TABLE public.auction_events ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can view auction events" ON public.auction_events FOR SELECT USING (true);
CREATE POLICY "Admins insert auction events" ON public.auction_events FOR INSERT TO authenticated WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins delete auction events" ON public.auction_events FOR DELETE TO authenticated USING (public.has_role(auth.uid(), 'admin'));

ALTER TABLE public.auctions REPLICA IDENTITY FULL;
ALTER TABLE public.auction_items REPLICA IDENTITY FULL;
ALTER TABLE public.auction_participants REPLICA IDENTITY FULL;
ALTER TABLE public.allocations REPLICA IDENTITY FULL;
ALTER TABLE public.auction_events REPLICA IDENTITY FULL;
ALTER PUBLICATION supabase_realtime ADD TABLE public.auctions, public.auction_items, public.auction_participants, public.allocations, public.auction_events;

UPDATE public.members SET join_date = NULL, restriction_lifted_at = NULL WHERE name = 'AdilMF';