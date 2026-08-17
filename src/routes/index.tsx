import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import {
  DndContext,
  DragOverlay,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
  type DragStartEvent,
} from "@dnd-kit/core";

import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { SECTIONS, type JobClass, type Member, type RemovalReason } from "@/lib/guild";
import {
  addMembers,
  assignMember,
  deleteMembers,
  getGuildData,
  reactivateMember,
  removeMember,
  reorderMembers,
  unassignMember,
  updateGuildSettings,
  updateMember,
} from "@/lib/guild.functions";

import { RosterSidebar } from "@/components/guild/RosterSidebar";
import { PartyBoard, MemberCard } from "@/components/guild/PartyBoard";
import { AddMembersPanel } from "@/components/guild/AddMembersPanel";
import { SignInDialog } from "@/components/guild/SignInDialog";
import baiLogo from "@/assets/bai-logo.png.asset.json";


export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "BAI Guild — Roster & Raid Party Builder" },
      {
        name: "description",
        content:
          "Manage the BAI Guild roster and build Elite and Sub-Battlefield raid parties across 8 teams of 5 slots.",
      },
      { property: "og:title", content: "BAI Guild — Roster & Raid Party Builder" },
      {
        property: "og:description",
        content:
          "Manage the BAI Guild roster and build Elite and Sub-Battlefield raid parties across 8 teams of 5 slots.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: GuildPage,
});

function GuildPage() {
  const queryClient = useQueryClient();
  const fetchGuild = useServerFn(getGuildData);
  const doAdd = useServerFn(addMembers);
  const doDelete = useServerFn(deleteMembers);
  const doAssign = useServerFn(assignMember);
  const doUnassign = useServerFn(unassignMember);
  const doReorder = useServerFn(reorderMembers);
  const doUpdate = useServerFn(updateMember);
  const doRemove = useServerFn(removeMember);
  const doReactivate = useServerFn(reactivateMember);
  const doSettings = useServerFn(updateGuildSettings);


  const [isAdmin, setIsAdmin] = useState(false);
  const [signInOpen, setSignInOpen] = useState(false);
  const [includeAssigned, setIncludeAssigned] = useState(false);
  const [draggingId, setDraggingId] = useState<string | null>(null);


  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => setIsAdmin(!!data.session));
    const { data: sub } = supabase.auth.onAuthStateChange((_event, session) => {
      setIsAdmin(!!session);
    });
    return () => sub.subscription.unsubscribe();
  }, []);

  const { data } = useQuery({
    queryKey: ["guild"],
    queryFn: () => fetchGuild(),
  });

  const members = data?.members ?? [];
  const assignments = data?.assignments ?? [];

  const membersById = useMemo(() => new Map<string, Member>(members.map((m) => [m.id, m])), [members]);
  const assignedIds = useMemo(() => new Set(assignments.map((a) => a.member_id)), [assignments]);

  const refresh = () => queryClient.invalidateQueries({ queryKey: ["guild"] });

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 4 } }));

  async function handleDragEnd(event: DragEndEvent) {
    setDraggingId(null);
    if (!isAdmin || !event.over) return;

    const memberId = String(event.active.id);
    const overId = String(event.over.id);
    try {
      if (overId === "roster") {
        if (!assignedIds.has(memberId)) return;
        await doUnassign({ data: { memberId } });
      } else if (overId.startsWith("row:")) {
        const targetId = overId.slice(4);
        if (targetId === memberId) return;
        const ordered = [...members]
          .filter((m) => m.status === "active")
          .sort((a, b) => a.sort_order - b.sort_order || a.name.localeCompare(b.name))
          .map((m) => m.id);
        const from = ordered.indexOf(memberId);
        const to = ordered.indexOf(targetId);
        if (from < 0 || to < 0) return;
        ordered.splice(from, 1);
        ordered.splice(to, 0, memberId);
        await doReorder({ data: { ids: ordered } });
      } else if (overId.startsWith("slot:")) {
        const [, section, team, slot] = overId.split(":");
        await doAssign({
          data: {
            memberId,
            section: section as "elite" | "sub",
            teamIndex: Number(team),
            slotIndex: Number(slot),
          },
        });
      }
      await refresh();
    } catch {
      toast.error("Could not update the party.");
    }
  }

  async function handleAdd(rows: { name: string; job_class: JobClass }[]) {
    try {
      await doAdd({ data: { rows } });
      await refresh();
      toast.success(rows.length === 1 ? "Member added." : `${rows.length} members added.`);
    } catch {
      toast.error("Could not add members.");
    }
  }

  async function handleDelete(ids: string[]) {
    try {
      await doDelete({ data: { ids } });
      await refresh();
      toast.success(ids.length === 1 ? "Member deleted." : `${ids.length} members deleted.`);
    } catch {
      toast.error("Could not delete members.");
    }
  }

  async function handleEdit(input: {
    id: string;
    name: string;
    job_class: JobClass;
    join_date: string | null;
  }) {
    try {
      await doUpdate({ data: input });
      await refresh();
      toast.success("Member updated.");
    } catch {
      toast.error("Could not update that member.");
    }
  }

  async function handleRemove(input: { id: string; reason: RemovalReason }) {
    try {
      await doRemove({ data: input });
      await refresh();
      toast.success("Member moved to Removed.");
    } catch {
      toast.error("Could not remove that member.");
    }
  }

  async function handleReactivate(id: string) {
    try {
      const res = await doReactivate({ data: { id } });
      await refresh();
      toast.success(
        res.rule === "reassign"
          ? "Reactivated at their previous roster position."
          : "Reactivated at the bottom of the roster with a new join date.",
      );
    } catch {
      toast.error("Could not reactivate that member.");
    }
  }

  async function handleRestrictionHours(hours: number) {
    try {
      await doSettings({ data: { hours } });
      await refresh();
      toast.success("Restriction period updated.");
    } catch {
      toast.error("Could not update the setting.");
    }
  }


  async function signOut() {
    await queryClient.cancelQueries();
    await supabase.auth.signOut();
    setIsAdmin(false);
    await refresh();
  }

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border bg-guild-team text-guild-team-foreground">
        <div className="mx-auto flex max-w-[1500px] items-center justify-between px-4 py-3">
          <div className="flex items-center gap-3">
            <h1 className="sr-only">BAI Guild Roster &amp; Raid Parties</h1>
            <img
              src={baiLogo.url}
              alt="BAI Guild logo"
              className="h-11 w-auto"
            />
            <p className="text-xs font-semibold uppercase tracking-[0.18em] opacity-85">
              Guild Roster &amp; Raid Parties
            </p>
          </div>

          {isAdmin ? (
            <Button size="sm" variant="secondary" onClick={signOut}>
              Sign out
            </Button>
          ) : (
            <Button size="sm" variant="secondary" onClick={() => setSignInOpen(true)}>
              Sign in
            </Button>
          )}
        </div>
      </header>

      <DndContext
        sensors={sensors}
        onDragStart={(e: DragStartEvent) => setDraggingId(String(e.active.id))}
        onDragCancel={() => setDraggingId(null)}
        onDragEnd={handleDragEnd}
      >

        <main className="mx-auto flex max-w-[1500px] flex-col gap-4 px-4 py-4 lg:flex-row">
          <RosterSidebar
            members={members}
            assignedIds={assignedIds}
            isAdmin={isAdmin}
            includeAssigned={includeAssigned}
            onIncludeAssignedChange={setIncludeAssigned}
            onDelete={handleDelete}
          >
            <AddMembersPanel existingNames={members.map((m) => m.name)} onSubmit={handleAdd} />
          </RosterSidebar>

          <div className="flex min-w-0 flex-1 flex-col gap-5">
            {SECTIONS.map((s) => (
              <PartyBoard
                key={s.key}
                title={s.label}
                section={s.key}
                assignments={assignments}
                membersById={membersById}
                isAdmin={isAdmin}
                onUnassign={async (memberId) => {
                  try {
                    await doUnassign({ data: { memberId } });
                    await refresh();
                  } catch {
                    toast.error("Could not remove that member.");
                  }
                }}
              />
            ))}
          </div>
        </main>
        <DragOverlay dropAnimation={{ duration: 180, easing: "cubic-bezier(0.2,0,0,1)" }}>
          {draggingId && membersById.get(draggingId) ? (
            <div className="w-56 rounded-md border border-border bg-guild-surface shadow-lift">
              <MemberCard member={membersById.get(draggingId)!} compact />
            </div>
          ) : null}
        </DragOverlay>
      </DndContext>


      <SignInDialog open={signInOpen} onOpenChange={setSignInOpen} />
    </div>
  );
}
