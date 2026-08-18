ALTER TYPE public.removal_reason ADD VALUE IF NOT EXISTS 'expelled_left';

ALTER TABLE public.members
  ALTER COLUMN join_date TYPE timestamptz USING join_date::timestamptz;

ALTER TABLE public.members
  ADD COLUMN IF NOT EXISTS cycle_bid_at timestamptz,
  ADD COLUMN IF NOT EXISTS cycle_bid_number integer;

ALTER TABLE public.guild_settings
  ADD COLUMN IF NOT EXISTS current_cycle integer NOT NULL DEFAULT 1;

ALTER TABLE public.auction_participants
  ADD COLUMN IF NOT EXISTS queue_position integer NOT NULL DEFAULT 0;

ALTER TABLE public.auctions
  ADD COLUMN IF NOT EXISTS queue_locked boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS cycle_number integer NOT NULL DEFAULT 1;

ALTER TABLE public.allocations
  ADD COLUMN IF NOT EXISTS superseded_actor text;