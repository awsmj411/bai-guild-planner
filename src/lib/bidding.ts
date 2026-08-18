export const AUCTION_TYPES = ["guild_league", "emperium_overrun", "standard"] as const;
export type AuctionType = (typeof AUCTION_TYPES)[number];

export const AUCTION_TYPE_LABELS: Record<AuctionType, string> = {
  guild_league: "Guild League",
  emperium_overrun: "Emperium Overrun",
  standard: "Standard",
};

export type AuctionStatus = "open" | "finalized" | "amended";
export type AllocationStatus = "valid" | "warning" | "error" | "superseded";

export const DEFAULT_ITEMS = [
  { item_name: "Purple Fragment", added_items: 4, max_per_bidder: 1 },
  { item_name: "Gold Fragment", added_items: 2, max_per_bidder: 1 },
  { item_name: "L&D", added_items: 51, max_per_bidder: 3 },
  { item_name: "T&S", added_items: 85, max_per_bidder: 5 },
] as const;

export type Auction = {
  id: string;
  name: string;
  auction_type: AuctionType;
  auction_date: string;
  status: AuctionStatus;
  pointer: number;
  queue_locked: boolean;
  cycle_number: number;
  created_at: string;
};

export type AuctionItem = {
  id: string;
  auction_id: string;
  item_name: string;
  added_items: number;
  max_per_bidder: number;
  position: number;
};

export type Participant = {
  id: string;
  auction_id: string;
  member_id: string | null;
  ign: string;
  tickets: number;
  needs_reconciliation: boolean;
  dropped: boolean;
  queue_position: number;
};

export type Allocation = {
  id: string;
  auction_id: string;
  item_id: string;
  participant_id: string | null;
  ign: string;
  quantity: number;
  status: AllocationStatus;
  flag_note: string | null;
  queue_index: number;
  supersedes_id: string | null;
  superseded_reason: string | null;
  superseded_at: string | null;
  superseded_actor: string | null;
};

export type AuctionEvent = {
  id: string;
  auction_id: string;
  kind: string;
  detail: string;
  actor: string | null;
  created_at: string;
};

/** Slots an item needs: ROUNDUP(added items / max per bidder). */
export function totalBiddersFor(item: { added_items: number; max_per_bidder: number }): number {
  if (item.max_per_bidder <= 0) return 0;
  return Math.ceil(item.added_items / item.max_per_bidder);
}

/** Deterministic shuffle (Fisher-Yates) over a copy of the list. */
export function shuffled<T>(list: T[], random: () => number = Math.random): T[] {
  const out = [...list];
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1));
    const a = out[i]!;
    out[i] = out[j]!;
    out[j] = a;
  }
  return out;
}

export type QueueTicket = { participant: Participant; ticket: number };

/**
 * The rotation queue: participants in their stored (randomized) order, each
 * expanded by their ticket count. Dropped participants are excluded.
 */
export function buildQueue(participants: Participant[]): QueueTicket[] {
  return [...participants]
    .filter((p) => !p.dropped)
    .sort((a, b) => a.queue_position - b.queue_position || a.ign.localeCompare(b.ign))
    .flatMap((p) =>
      Array.from({ length: Math.max(1, p.tickets) }, (_, ticket) => ({ participant: p, ticket })),
    );
}

export type PlannedAllocation = {
  item_id: string;
  participant_id: string | null;
  ign: string;
  quantity: number;
  status: AllocationStatus;
  flag_note: string | null;
  queue_index: number;
};

/**
 * One rotating pointer walks the queue continuously across every item — it never
 * resets per item, and wraps when the queue is shorter than the slots still needed.
 */
export function distribute(
  items: AuctionItem[],
  queue: QueueTicket[],
  startPointer = 0,
): { allocations: PlannedAllocation[]; pointer: number } {
  const allocations: PlannedAllocation[] = [];
  if (queue.length === 0) return { allocations, pointer: startPointer };

  let pointer = startPointer;
  const ordered = [...items].sort((a, b) => a.position - b.position);

  for (const item of ordered) {
    const slots = totalBiddersFor(item);
    let remaining = item.added_items;

    for (let s = 0; s < slots; s++) {
      const index = ((pointer % queue.length) + queue.length) % queue.length;
      const ticket = queue[index]!;
      pointer++;

      const quantity = Math.max(0, Math.min(item.max_per_bidder, remaining));
      remaining -= quantity;

      let status: AllocationStatus = "valid";
      let note: string | null = null;
      if (quantity > item.max_per_bidder) {
        status = "error";
        note = `Allocation exceeds max per bidder (${item.max_per_bidder}).`;
      } else if (quantity === 0) {
        status = "warning";
        note = "Zero allocation — no items left for this slot.";
      } else if (ticket.participant.needs_reconciliation) {
        status = "warning";
        note = "Bidder is not linked to a roster member.";
      }

      allocations.push({
        item_id: item.id,
        participant_id: ticket.participant.id,
        ign: ticket.participant.ign,
        quantity,
        status,
        flag_note: note,
        queue_index: index,
      });
    }
  }

  return { allocations, pointer };
}

export type ItemCheck = {
  item: AuctionItem;
  slots: number;
  filled: number;
  allocated: number;
  slotsOk: boolean;
  quantityOk: boolean;
};

export function itemChecks(items: AuctionItem[], allocations: Allocation[]): ItemCheck[] {
  return [...items]
    .sort((a, b) => a.position - b.position)
    .map((item) => {
      const rows = allocations.filter((a) => a.item_id === item.id && a.status !== "superseded");
      const allocated = rows.reduce((sum, r) => sum + r.quantity, 0);
      const slots = totalBiddersFor(item);
      return {
        item,
        slots,
        filled: rows.length,
        allocated,
        slotsOk: rows.length === slots,
        quantityOk: allocated === item.added_items,
      };
    });
}

/** Allocation-record count per IGN, ignoring superseded rows. */
export function recordCounts(allocations: Allocation[]): Map<string, number> {
  const counts = new Map<string, number>();
  for (const a of allocations) {
    if (a.status === "superseded") continue;
    counts.set(a.ign, (counts.get(a.ign) ?? 0) + 1);
  }
  return counts;
}

export type DashboardStats = {
  totalTickets: number;
  uniqueBidders: number;
  repeatedBidders: number;
  totalSlots: number;
  completed: number;
  pending: number;
  multiAllocation: number;
};

export function dashboardStats(
  items: AuctionItem[],
  participants: Participant[],
  allocations: Allocation[],
): DashboardStats {
  const live = participants.filter((p) => !p.dropped);
  const totalTickets = live.reduce((sum, p) => sum + Math.max(1, p.tickets), 0);
  const totalSlots = items.reduce((sum, i) => sum + totalBiddersFor(i), 0);
  const active = allocations.filter((a) => a.status !== "superseded");
  const counts = recordCounts(allocations);
  return {
    totalTickets,
    uniqueBidders: live.length,
    repeatedBidders: live.filter((p) => Math.max(1, p.tickets) > 1).length,
    totalSlots,
    completed: active.length,
    pending: Math.max(0, totalSlots - active.length),
    multiAllocation: [...counts.values()].filter((n) => n > 1).length,
  };
}
