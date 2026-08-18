import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { z } from "zod";
import type { Database } from "@/integrations/supabase/types";
import {
  AUCTION_TYPES,
  buildQueue,
  distribute,
  shuffled,
  type Allocation,
  type Auction,
  type AuctionEvent,
  type AuctionItem,
  type Participant,
} from "@/lib/bidding";
import { publicClient, assertAdmin, type Db } from "@/lib/supabase-helpers.server";

const AUCTION_COLUMNS =
  "id, name, auction_type, auction_date, status, pointer, queue_locked, cycle_number, created_at";
const ITEM_COLUMNS = "id, auction_id, item_name, added_items, max_per_bidder, position";
const PARTICIPANT_COLUMNS =
  "id, auction_id, member_id, ign, tickets, needs_reconciliation, dropped, queue_position";
const ALLOCATION_COLUMNS =
  "id, auction_id, item_id, participant_id, ign, quantity, status, flag_note, queue_index, supersedes_id, superseded_reason, superseded_at, superseded_actor";

export const listAuctions = createServerFn({ method: "GET" }).handler(async () => {
  const supabase = publicClient();
  const [auctions, settings] = await Promise.all([
    supabase.from("auctions").select(AUCTION_COLUMNS).order("auction_date", { ascending: false }).order("created_at", { ascending: false }),
    supabase.from("guild_settings").select("current_cycle, new_member_restriction_hours").maybeSingle(),
  ]);
  if (auctions.error) throw auctions.error;
  return {
    auctions: (auctions.data ?? []) as Auction[],
    currentCycle: settings.data?.current_cycle ?? 1,
    restrictionHours: settings.data?.new_member_restriction_hours ?? 96,
  };
});

export const getAuction = createServerFn({ method: "GET" })
  .inputValidator((data: unknown) => z.object({ id: z.string().uuid() }).parse(data))
  .handler(async ({ data }) => {
    const supabase = publicClient();
    const [auction, items, participants, allocations, events] = await Promise.all([
      supabase.from("auctions").select(AUCTION_COLUMNS).eq("id", data.id).maybeSingle(),
      supabase.from("auction_items").select(ITEM_COLUMNS).eq("auction_id", data.id).order("position"),
      supabase
        .from("auction_participants")
        .select(PARTICIPANT_COLUMNS)
        .eq("auction_id", data.id)
        .order("queue_position"),
      supabase.from("allocations").select(ALLOCATION_COLUMNS).eq("auction_id", data.id).order("created_at"),
      supabase
        .from("auction_events")
        .select("id, auction_id, kind, detail, actor, created_at")
        .eq("auction_id", data.id)
        .order("created_at", { ascending: false }),
    ]);
    if (auction.error) throw auction.error;
    return {
      auction: (auction.data ?? null) as Auction | null,
      items: (items.data ?? []) as AuctionItem[],
      participants: (participants.data ?? []) as Participant[],
      allocations: (allocations.data ?? []) as Allocation[],
      events: (events.data ?? []) as AuctionEvent[],
    };
  });

const itemInput = z.object({
  item_name: z.string().trim().min(1).max(80),
  added_items: z.number().int().min(0).max(100000),
  max_per_bidder: z.number().int().min(1).max(1000),
});

async function logEvent(
  supabase: Db,
  auctionId: string,
  kind: string,
  detail: string,
) {
  await supabase.from("auction_events").insert({
    auction_id: auctionId,
    kind,
    detail,
    actor: "adminbai",
  });
}

export const createAuction = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) =>
    z
      .object({
        name: z.string().trim().min(1).max(80),
        auction_type: z.enum(AUCTION_TYPES),
        auction_date: z.string().trim().min(1),
        items: z.array(itemInput).min(1).max(50),
        memberIds: z.array(z.string().uuid()).min(1).max(500),
      })
      .parse(data),
  )
  .handler(async ({ data, context }) => {
    await assertAdmin(context.supabase, context.userId);
    const supabase = context.supabase;

    const { data: settings } = await supabase
      .from("guild_settings")
      .select("current_cycle")
      .maybeSingle();

    const { data: auction, error } = await supabase
      .from("auctions")
      .insert({
        name: data.name,
        auction_type: data.auction_type,
        auction_date: data.auction_date,
        cycle_number: settings?.current_cycle ?? 1,
      })
      .select("id")
      .single();
    if (error) throw error;

    const itemsError = (
      await supabase.from("auction_items").insert(
        data.items.map((item, index) => ({ ...item, auction_id: auction.id, position: index })),
      )
    ).error;
    if (itemsError) throw itemsError;

    const { data: members } = await supabase
      .from("members")
      .select("id, name")
      .in("id", data.memberIds);

    // Randomized once at creation; positions are then editable by the admin.
    const order = shuffled(members ?? []);
    const participantsError = (
      await supabase.from("auction_participants").insert(
        order.map((m, index) => ({
          auction_id: auction.id,
          member_id: m.id,
          ign: m.name,
          tickets: 1,
          queue_position: index,
        })),
      )
    ).error;
    if (participantsError) throw participantsError;

    await logEvent(
      supabase,
      auction.id,
      "created",
      `Auction created with ${order.length} randomized bidders and ${data.items.length} items.`,
    );
    return { id: auction.id as string };
  });

export const saveItems = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) =>
    z
      .object({ auctionId: z.string().uuid(), items: z.array(itemInput).min(1).max(50) })
      .parse(data),
  )
  .handler(async ({ data, context }) => {
    await assertAdmin(context.supabase, context.userId);
    const supabase = context.supabase;
    await supabase.from("allocations").delete().eq("auction_id", data.auctionId).neq("status", "superseded");
    await supabase.from("auction_items").delete().eq("auction_id", data.auctionId);
    const { error } = await supabase.from("auction_items").insert(
      data.items.map((item, index) => ({ ...item, auction_id: data.auctionId, position: index })),
    );
    if (error) throw error;
    await logEvent(supabase, data.auctionId, "items", "Item list updated; distribution cleared.");
    return { ok: true };
  });

export const addParticipants = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) =>
    z
      .object({
        auctionId: z.string().uuid(),
        memberIds: z.array(z.string().uuid()).max(500).optional(),
        igns: z.array(z.string().trim().min(1).max(60)).max(100).optional(),
      })
      .parse(data),
  )
  .handler(async ({ data, context }) => {
    await assertAdmin(context.supabase, context.userId);
    const supabase = context.supabase;
    const { data: existing } = await supabase
      .from("auction_participants")
      .select("queue_position")
      .eq("auction_id", data.auctionId)
      .order("queue_position", { ascending: false })
      .limit(1)
      .maybeSingle();
    let next = (existing?.queue_position ?? -1) + 1;

    const rows: {
      auction_id: string;
      member_id: string | null;
      ign: string;
      queue_position: number;
      needs_reconciliation: boolean;
    }[] = [];

    if (data.memberIds?.length) {
      const { data: members } = await supabase.from("members").select("id, name").in("id", data.memberIds);
      for (const m of shuffled(members ?? [])) {
        rows.push({
          auction_id: data.auctionId,
          member_id: m.id,
          ign: m.name,
          queue_position: next++,
          needs_reconciliation: false,
        });
      }
    }
    for (const ign of data.igns ?? []) {
      rows.push({
        auction_id: data.auctionId,
        member_id: null,
        ign,
        queue_position: next++,
        needs_reconciliation: true,
      });
    }
    if (rows.length === 0) return { added: 0 };
    const { error } = await supabase.from("auction_participants").insert(rows);
    if (error) throw error;
    await logEvent(supabase, data.auctionId, "bidders", `${rows.length} bidder(s) added to the queue.`);
    return { added: rows.length };
  });

export const updateParticipant = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) =>
    z
      .object({
        id: z.string().uuid(),
        auctionId: z.string().uuid(),
        tickets: z.number().int().min(1).max(20).optional(),
        dropped: z.boolean().optional(),
        replacementMemberId: z.string().uuid().nullable().optional(),
      })
      .parse(data),
  )
  .handler(async ({ data, context }) => {
    await assertAdmin(context.supabase, context.userId);
    const supabase = context.supabase;
    const patch: Database["public"]["Tables"]["auction_participants"]["Update"] = {};
    if (data.tickets != null) patch["tickets"] = data.tickets;
    if (data.dropped != null) patch["dropped"] = data.dropped;

    if (data.replacementMemberId) {
      const { data: member } = await supabase
        .from("members")
        .select("id, name")
        .eq("id", data.replacementMemberId)
        .maybeSingle();
      if (!member) throw new Error("Replacement member not found");
      patch["member_id"] = member.id;
      patch["ign"] = member.name;
      patch["needs_reconciliation"] = false;
      await logEvent(
        supabase,
        data.auctionId,
        "replacement",
        `Queue slot reassigned to ${member.name} before finalization.`,
      );
    }
    const { error } = await supabase.from("auction_participants").update(patch).eq("id", data.id);
    if (error) throw error;
    return { ok: true };
  });

export const removeParticipant = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) => z.object({ id: z.string().uuid() }).parse(data))
  .handler(async ({ data, context }) => {
    await assertAdmin(context.supabase, context.userId);
    await context.supabase.from("allocations").delete().eq("participant_id", data.id);
    const { error } = await context.supabase.from("auction_participants").delete().eq("id", data.id);
    if (error) throw error;
    return { ok: true };
  });

export const reorderQueue = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) =>
    z.object({ auctionId: z.string().uuid(), ids: z.array(z.string().uuid()).min(1).max(500) }).parse(data),
  )
  .handler(async ({ data, context }) => {
    await assertAdmin(context.supabase, context.userId);
    await Promise.all(
      data.ids.map((id, index) =>
        context.supabase.from("auction_participants").update({ queue_position: index }).eq("id", id),
      ),
    );
    return { ok: true };
  });

export const reshuffleQueue = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) => z.object({ auctionId: z.string().uuid() }).parse(data))
  .handler(async ({ data, context }) => {
    await assertAdmin(context.supabase, context.userId);
    const supabase = context.supabase;
    const { data: participants } = await supabase
      .from("auction_participants")
      .select("id")
      .eq("auction_id", data.auctionId);
    const order = shuffled(participants ?? []);
    await Promise.all(
      order.map((p, index) =>
        supabase.from("auction_participants").update({ queue_position: index }).eq("id", p.id),
      ),
    );
    await logEvent(supabase, data.auctionId, "queue", "Bidder queue re-randomized.");
    return { ok: true };
  });

export const runDistribution = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) => z.object({ auctionId: z.string().uuid() }).parse(data))
  .handler(async ({ data, context }) => {
    await assertAdmin(context.supabase, context.userId);
    const supabase = context.supabase;
    const { data: auction } = await supabase
      .from("auctions")
      .select("status")
      .eq("id", data.auctionId)
      .maybeSingle();
    if (auction?.status !== "open") throw new Error("Only open auctions can be distributed");

    const [items, participants] = await Promise.all([
      supabase.from("auction_items").select(ITEM_COLUMNS).eq("auction_id", data.auctionId).order("position"),
      supabase
        .from("auction_participants")
        .select(PARTICIPANT_COLUMNS)
        .eq("auction_id", data.auctionId)
        .order("queue_position"),
    ]);

    const queue = buildQueue((participants.data ?? []) as Participant[]);
    const { allocations, pointer } = distribute((items.data ?? []) as AuctionItem[], queue, 0);

    await supabase.from("allocations").delete().eq("auction_id", data.auctionId);
    if (allocations.length > 0) {
      const { error } = await supabase
        .from("allocations")
        .insert(allocations.map((a) => ({ ...a, auction_id: data.auctionId })));
      if (error) throw error;
    }
    await supabase.from("auctions").update({ pointer, queue_locked: true }).eq("id", data.auctionId);
    await logEvent(
      supabase,
      data.auctionId,
      "distribution",
      `Distribution run — ${allocations.length} allocation record(s) generated.`,
    );
    return { records: allocations.length };
  });

export const updateAllocation = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) =>
    z
      .object({
        id: z.string().uuid(),
        quantity: z.number().int().min(0).max(10000).optional(),
        ign: z.string().trim().min(1).max(60).optional(),
        flag_note: z.string().trim().max(200).nullable().optional(),
      })
      .parse(data),
  )
  .handler(async ({ data, context }) => {
    await assertAdmin(context.supabase, context.userId);
    const patch: Database["public"]["Tables"]["allocations"]["Update"] = {};
    if (data.quantity != null) patch["quantity"] = data.quantity;
    if (data.ign != null) patch["ign"] = data.ign;
    if (data.flag_note !== undefined) patch["flag_note"] = data.flag_note;
    const { error } = await context.supabase.from("allocations").update(patch).eq("id", data.id);
    if (error) throw error;
    return { ok: true };
  });

export const finalizeAuction = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) => z.object({ auctionId: z.string().uuid() }).parse(data))
  .handler(async ({ data, context }) => {
    await assertAdmin(context.supabase, context.userId);
    const supabase = context.supabase;

    const [auctionRes, participantsRes, settingsRes] = await Promise.all([
      supabase.from("auctions").select("cycle_number, status").eq("id", data.auctionId).maybeSingle(),
      supabase
        .from("auction_participants")
        .select("member_id, dropped")
        .eq("auction_id", data.auctionId),
      supabase.from("guild_settings").select("current_cycle").maybeSingle(),
    ]);
    if (auctionRes.data?.status === "finalized") throw new Error("Auction already finalized");

    const cycle = settingsRes.data?.current_cycle ?? 1;
    const memberIds = (participantsRes.data ?? [])
      .filter((p) => !p.dropped && p.member_id)
      .map((p) => p.member_id as string);

    if (memberIds.length > 0) {
      // Fair rotation: everyone who actually bid is marked for this cycle.
      await supabase
        .from("members")
        .update({ cycle_bid_at: new Date().toISOString(), cycle_bid_number: cycle })
        .in("id", memberIds);
    }

    await supabase
      .from("auctions")
      .update({ status: "finalized", queue_locked: true })
      .eq("id", data.auctionId);

    // Cycle rolls over once every active member has bid in it.
    const { data: activeMembers } = await supabase
      .from("members")
      .select("id, cycle_bid_number")
      .eq("status", "active");
    const pending = (activeMembers ?? []).filter((m) => m.cycle_bid_number !== cycle);
    let cycleAdvanced = false;
    if ((activeMembers ?? []).length > 0 && pending.length === 0) {
      await supabase
        .from("guild_settings")
        .upsert({ id: true, current_cycle: cycle + 1 }, { onConflict: "id" });
      cycleAdvanced = true;
    }

    await logEvent(
      supabase,
      data.auctionId,
      "finalized",
      cycleAdvanced
        ? `Auction finalized. Every member has now bid — rotation cycle ${cycle} closed, cycle ${cycle + 1} open.`
        : `Auction finalized. ${pending.length} member(s) still awaiting their turn in cycle ${cycle}.`,
    );
    return { cycleAdvanced, pending: pending.length };
  });

export const supersedeAllocation = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) =>
    z
      .object({
        allocationId: z.string().uuid(),
        reason: z.enum(["rejoin", "reassign", "rejected", "mia", "expelled_left"]),
        replacementIgn: z.string().trim().min(1).max(60),
        replacementMemberId: z.string().uuid().nullable().optional(),
      })
      .parse(data),
  )
  .handler(async ({ data, context }) => {
    await assertAdmin(context.supabase, context.userId);
    const supabase = context.supabase;
    const { data: original, error: readError } = await supabase
      .from("allocations")
      .select(ALLOCATION_COLUMNS)
      .eq("id", data.allocationId)
      .single();
    if (readError) throw readError;

    const now = new Date().toISOString();
    const { error: markError } = await supabase
      .from("allocations")
      .update({
        status: "superseded",
        superseded_reason: data.reason,
        superseded_at: now,
        superseded_actor: "adminbai",
      })
      .eq("id", data.allocationId);
    if (markError) throw markError;

    const { error: insertError } = await supabase.from("allocations").insert({
      auction_id: original.auction_id,
      item_id: original.item_id,
      participant_id: data.replacementMemberId ? null : original.participant_id,
      ign: data.replacementIgn,
      quantity: original.quantity,
      status: "valid",
      flag_note: `Replaces ${original.ign} (${data.reason.replace("_", " / ")}).`,
      queue_index: original.queue_index,
      supersedes_id: original.id,
    });
    if (insertError) throw insertError;

    await supabase.from("auctions").update({ status: "amended" }).eq("id", original.auction_id);
    await logEvent(
      supabase,
      original.auction_id,
      "amendment",
      `${original.ign} replaced by ${data.replacementIgn} — original record kept for audit.`,
    );
    return { ok: true };
  });

export const deleteAuction = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) => z.object({ id: z.string().uuid() }).parse(data))
  .handler(async ({ data, context }) => {
    await assertAdmin(context.supabase, context.userId);
    const supabase = context.supabase;
    await supabase.from("allocations").delete().eq("auction_id", data.id);
    await supabase.from("auction_events").delete().eq("auction_id", data.id);
    await supabase.from("auction_participants").delete().eq("auction_id", data.id);
    await supabase.from("auction_items").delete().eq("auction_id", data.id);
    const { error } = await supabase.from("auctions").delete().eq("id", data.id);
    if (error) throw error;
    return { ok: true };
  });
