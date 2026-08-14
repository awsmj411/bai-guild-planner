import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { createClient } from "@supabase/supabase-js";
import { z } from "zod";
import type { Database } from "@/integrations/supabase/types";
import { ADMIN_EMAIL, JOB_CLASSES, type Assignment, type Member } from "@/lib/guild";

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
  const [members, assignments] = await Promise.all([
    supabase.from("members").select("id, name, job_class").order("name"),
    supabase.from("party_assignments").select("id, section, team_index, slot_index, member_id"),
  ]);
  if (members.error) throw members.error;
  if (assignments.error) throw assignments.error;
  return {
    members: (members.data ?? []) as Member[],
    assignments: (assignments.data ?? []) as Assignment[],
  };
});

const memberInput = z.object({
  name: z.string().trim().min(1).max(60),
  job_class: z.enum(JOB_CLASSES),
});

export const addMembers = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) => z.object({ rows: z.array(memberInput).min(1).max(500) }).parse(data))
  .handler(async ({ data, context }) => {
    await assertAdmin(context.supabase, context.userId);
    const { error } = await context.supabase.from("members").insert(data.rows);
    if (error) throw error;
    return { added: data.rows.length };
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
