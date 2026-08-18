import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { createClient } from "@supabase/supabase-js";
import { z } from "zod";
import type { Database } from "@/integrations/supabase/types";
import {
  ADMIN_EMAIL,
  JOB_CLASSES,
  REMOVAL_REASONS,
  type Assignment,
  type GuildSettings,
  type Member,
} from "@/lib/guild";

const MEMBER_COLUMNS =
  "id, name, job_class, sort_order, join_date, status, removal_reason, removed_at, position_at_removal, restriction_lifted_at, cycle_bid_at, cycle_bid_number";

function publicClient() {
  const key = process.env["SUPABASE_PUBLISHABLE_KEY"]!;
  return createClient<Database>(process.env["SUPABASE_URL"]!, key, {
    auth: { persistSession: false, autoRefreshToken: false },
    global: {
      fetch: (input, init) => {
        const h = new Headers(init?.headers);
        if (key.startsWith("sb_") && h.get("Authorization") === `Bearer ${key}`) {
          h.delete("Authorization");
        }
        h.set("apikey", key);
        return fetch(input, { ...init, headers: h });
      },
    },
  });
}

async function assertAdmin(supabase: {
  rpc: (fn: "has_role", args: { _user_id: string; _role: "admin" }) => PromiseLike<{ data: unknown }>;
}, userId: string) {
  const { data } = await supabase.rpc("has_role", { _user_id: userId, _role: "admin" });
  if (data !== true) throw new Error("Forbidden");
}

export const getGuildData = createServerFn({ method: "GET" }).handler(async () => {
  const supabase = publicClient();
  const [members, assignments, settings] = await Promise.all([
    supabase.from("members").select(MEMBER_COLUMNS).order("sort_order").order("name"),
    supabase.from("party_assignments").select("id, section, team_index, slot_index, member_id"),
    supabase.from("guild_settings").select("new_member_restriction_hours, current_cycle").maybeSingle(),
  ]);
  if (members.error) throw members.error;
  if (assignments.error) throw assignments.error;
  return {
    members: (members.data ?? []) as Member[],
    assignments: (assignments.data ?? []) as Assignment[],
    settings: (settings.data ?? { new_member_restriction_hours: 96, current_cycle: 1 }) as GuildSettings,
  };
});

const memberInput = z.object({
  name: z.string().trim().min(1).max(60),
  job_class: z.enum(JOB_CLASSES),
  join_date: z.string().trim().min(1).nullable().optional(),
});

export const addMembers = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) => z.object({ rows: z.array(memberInput).min(1).max(500) }).parse(data))
  .handler(async ({ data, context }) => {
    await assertAdmin(context.supabase, context.userId);
    const { data: last } = await context.supabase
      .from("members")
      .select("sort_order")
      .order("sort_order", { ascending: false })
      .limit(1)
      .maybeSingle();
    let next = (last?.sort_order ?? 0) + 1;
    const rows = data.rows.map((r) => ({
      name: r.name,
      job_class: r.job_class,
      join_date: r.join_date ?? null,
      sort_order: next++,
    }));
    const { error } = await context.supabase.from("members").insert(rows);
    if (error) throw error;
    return { added: rows.length };
  });

export const updateMember = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) =>
    z
      .object({
        id: z.string().uuid(),
        name: z.string().trim().min(1).max(60),
        job_class: z.enum(JOB_CLASSES),
        join_date: z.string().trim().min(1).nullable(),
      })
      .parse(data),
  )
  .handler(async ({ data, context }) => {
    await assertAdmin(context.supabase, context.userId);
    const { data: current } = await context.supabase
      .from("members")
      .select("join_date, restriction_lifted_at")
      .eq("id", data.id)
      .maybeSingle();
    const joinChanged = (current?.join_date ?? null) !== data.join_date;
    const { error } = await context.supabase
      .from("members")
      .update({
        name: data.name,
        job_class: data.job_class,
        join_date: data.join_date,
        // Changing join date re-arms the new-member restriction.
        ...(joinChanged ? { restriction_lifted_at: null } : {}),
      })
      .eq("id", data.id);
    if (error) throw error;
    return { ok: true };
  });

export const reorderMembers = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) =>
    z.object({ ids: z.array(z.string().uuid()).min(1).max(1000) }).parse(data),
  )
  .handler(async ({ data, context }) => {
    await assertAdmin(context.supabase, context.userId);
    await Promise.all(
      data.ids.map((id, index) =>
        context.supabase.from("members").update({ sort_order: index + 1 }).eq("id", id),
      ),
    );
    return { ok: true };
  });

export const removeMember = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) =>
    z.object({ id: z.string().uuid(), reason: z.enum(REMOVAL_REASONS) }).parse(data),
  )
  .handler(async ({ data, context }) => {
    await assertAdmin(context.supabase, context.userId);
    const { data: current } = await context.supabase
      .from("members")
      .select("sort_order")
      .eq("id", data.id)
      .maybeSingle();
    const { error } = await context.supabase
      .from("members")
      .update({
        status: "removed",
        removal_reason: data.reason,
        removed_at: new Date().toISOString(),
        position_at_removal: current?.sort_order ?? null,
      })
      .eq("id", data.id);
    if (error) throw error;
    await context.supabase.from("party_assignments").delete().eq("member_id", data.id);
    return { ok: true };
  });

export const reactivateMember = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) => z.object({ id: z.string().uuid() }).parse(data))
  .handler(async ({ data, context }) => {
    await assertAdmin(context.supabase, context.userId);
    const { data: current } = await context.supabase
      .from("members")
      .select("removal_reason, position_at_removal")
      .eq("id", data.id)
      .maybeSingle();

    if (current?.removal_reason === "reassign") {
      // Re-prioritized: restore stored position, join date and tenure untouched.
      const { error } = await context.supabase
        .from("members")
        .update({
          status: "active",
          removal_reason: null,
          removed_at: null,
          position_at_removal: null,
          ...(current.position_at_removal != null
            ? { sort_order: current.position_at_removal }
            : {}),
        })
        .eq("id", data.id);
      if (error) throw error;
      return { ok: true, rule: "reassign" as const };
    }

    // Reset: bottom of roster, join date reset, restriction re-armed.
    const { data: last } = await context.supabase
      .from("members")
      .select("sort_order")
      .order("sort_order", { ascending: false })
      .limit(1)
      .maybeSingle();
    const now = new Date().toISOString();
    const { error } = await context.supabase
      .from("members")
      .update({
        status: "active",
        removal_reason: null,
        removed_at: null,
        position_at_removal: null,
        sort_order: (last?.sort_order ?? 0) + 1,
        join_date: now,
        restriction_lifted_at: null,
        cycle_bid_at: null,
        cycle_bid_number: null,
      })
      .eq("id", data.id);
    if (error) throw error;
    return { ok: true, rule: "reset" as const };
  });

export const updateGuildSettings = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) =>
    z.object({ hours: z.number().int().min(0).max(8760) }).parse(data),
  )
  .handler(async ({ data, context }) => {
    await assertAdmin(context.supabase, context.userId);
    const { error } = await context.supabase
      .from("guild_settings")
      .upsert({ id: true, new_member_restriction_hours: data.hours }, { onConflict: "id" });
    if (error) throw error;
    return { ok: true };
  });

/** Permanently marks members whose restriction period has elapsed as lifted. */
export const liftRestrictions = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) => z.object({ ids: z.array(z.string().uuid()) }).parse(data))
  .handler(async ({ data, context }) => {
    await assertAdmin(context.supabase, context.userId);
    if (data.ids.length === 0) return { lifted: 0 };
    const { error } = await context.supabase
      .from("members")
      .update({ restriction_lifted_at: new Date().toISOString() })
      .in("id", data.ids)
      .is("restriction_lifted_at", null);
    if (error) throw error;
    return { lifted: data.ids.length };
  });

export const deleteMembers = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) => z.object({ ids: z.array(z.string().uuid()).min(1) }).parse(data))
  .handler(async ({ data, context }) => {
    await assertAdmin(context.supabase, context.userId);
    const { error } = await context.supabase.from("members").delete().in("id", data.ids);
    if (error) throw error;
    return { deleted: data.ids.length };
  });


export const assignMember = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) =>
    z
      .object({
        memberId: z.string().uuid(),
        section: z.enum(["elite", "sub"]),
        teamIndex: z.number().int().min(0).max(7),
        slotIndex: z.number().int().min(0).max(4),
      })
      .parse(data),
  )
  .handler(async ({ data, context }) => {
    await assertAdmin(context.supabase, context.userId);
    await context.supabase.from("party_assignments").delete().eq("member_id", data.memberId);
    await context.supabase
      .from("party_assignments")
      .delete()
      .eq("section", data.section)
      .eq("team_index", data.teamIndex)
      .eq("slot_index", data.slotIndex);
    const { error } = await context.supabase.from("party_assignments").insert({
      member_id: data.memberId,
      section: data.section,
      team_index: data.teamIndex,
      slot_index: data.slotIndex,
    });
    if (error) throw error;
    return { ok: true };
  });

export const unassignMember = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) => z.object({ memberId: z.string().uuid() }).parse(data))
  .handler(async ({ data, context }) => {
    await assertAdmin(context.supabase, context.userId);
    const { error } = await context.supabase
      .from("party_assignments")
      .delete()
      .eq("member_id", data.memberId);
    if (error) throw error;
    return { ok: true };
  });

/**
 * Idempotently provisions the single fixed guild admin account (confirmed
 * email, admin role row). Credentials are fixed by the guild spec.
 */
export const ensureAdminAccount = createServerFn({ method: "POST" }).handler(async () => {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const { data: list } = await supabaseAdmin.auth.admin.listUsers({ page: 1, perPage: 200 });
  let user = list?.users.find((u) => u.email === ADMIN_EMAIL) ?? null;
  if (!user) {
    const { data, error } = await supabaseAdmin.auth.admin.createUser({
      email: ADMIN_EMAIL,
      password: "bainabai123",
      email_confirm: true,
    });
    if (error) throw error;
    user = data.user;
  }
  if (user) {
    await supabaseAdmin
      .from("user_roles")
      .upsert({ user_id: user.id, role: "admin" }, { onConflict: "user_id,role" });
  }
  return { ok: true };
});
