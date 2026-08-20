import { useDraggable, useDroppable } from "@dnd-kit/core";
import {
  SLOT_COUNT,
  TEAM_COUNT,
  firstJobOf,
  jobToken,
  type Assignment,
  type Member,
  type SectionKey,
} from "@/lib/guild";
import { cn } from "@/lib/utils";
import { X } from "lucide-react";

type Props = {
  title: string;
  section: SectionKey;
  assignments: Assignment[];
  membersById: Map<string, Member>;
  isAdmin: boolean;
  onUnassign: (memberId: string) => void;
};

export function MemberCard({ member, compact }: { member: Member; compact?: boolean }) {
  const accent = `var(--job-${jobToken(member.job_class)})`;
  return (
    <div
      style={{
        borderLeftColor: accent,
        background: `linear-gradient(90deg, color-mix(in oklab, ${accent} 16%, transparent), transparent 60%)`,
      }}
      className={cn(
        "min-w-0 flex-1 rounded border-l-[3px] px-2 py-1",
        compact && "bg-guild-surface shadow-lift",
      )}
    >
      <p className="truncate text-xs font-semibold leading-tight">{member.name}</p>
      <p className="truncate text-[10px] leading-tight text-muted-foreground">
        <span style={{ color: accent }} className="font-semibold">
          {firstJobOf(member.job_class)}
        </span>
        {" · "}
        {member.job_class}
      </p>
    </div>
  );
}

function FilledSlot({
  member,
  isAdmin,
  onUnassign,
}: {
  member: Member;
  isAdmin: boolean;
  onUnassign: (memberId: string) => void;
}) {
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({
    id: member.id,
    disabled: !isAdmin,
    data: { memberId: member.id },
  });

  return (
    <div
      ref={setNodeRef}
      className={cn(
        "flex h-full touch-none items-center gap-1 rounded bg-guild-surface transition-all duration-200",
        isAdmin && "cursor-grab hover:brightness-110 active:cursor-grabbing",
        isDragging && "opacity-40",
      )}
      {...(isAdmin ? attributes : {})}
      {...(isAdmin ? listeners : {})}
    >
      <MemberCard member={member} />
      {isAdmin && (
        <button
          type="button"
          aria-label={`Remove ${member.name} from slot`}
          className="mr-1 shrink-0 rounded p-1 text-muted-foreground hover:text-destructive"
          onPointerDown={(e) => e.stopPropagation()}
          onClick={() => onUnassign(member.id)}
        >
          <X className="size-3" />
        </button>
      )}
    </div>
  );
}

function Slot({
  section,
  teamIndex,
  slotIndex,
  member,
  isAdmin,
  onUnassign,
}: {
  section: SectionKey;
  teamIndex: number;
  slotIndex: number;
  member: Member | undefined;
  isAdmin: boolean;
  onUnassign: (memberId: string) => void;
}) {
  const { setNodeRef, isOver } = useDroppable({
    id: `slot:${section}:${teamIndex}:${slotIndex}`,
    disabled: !isAdmin,
  });

  return (
    <div
      ref={setNodeRef}
      className={cn(
        "min-h-[42px] rounded-md border border-dashed border-guild-slot-border bg-guild-slot p-0.5 transition-all duration-200",
        isOver && "scale-[1.02] border-solid border-ring bg-accent shadow-lift",
      )}
    >
      {member ? (
        <FilledSlot member={member} isAdmin={isAdmin} onUnassign={onUnassign} />
      ) : (
        <p className="flex h-full items-center px-2 text-[10px] uppercase tracking-wide text-muted-foreground">
          Slot {slotIndex + 1}
        </p>
      )}
    </div>
  );
}

export function PartyBoard({ title, section, assignments, membersById, isAdmin, onUnassign }: Props) {
  const bySlot = new Map<string, string>();
  assignments
    .filter((a) => a.section === section)
    .forEach((a) => bySlot.set(`${a.team_index}:${a.slot_index}`, a.member_id));

  return (
    <section className="space-y-2.5">
      <h2 className="sticky top-0 z-20 rounded-lg bg-guild-bar px-3 py-2 text-center text-sm font-bold uppercase tracking-[0.18em] text-guild-bar-foreground shadow-elegant">
        {title}
      </h2>

      <div className="grid gap-2.5 sm:grid-cols-2 xl:grid-cols-4">
        {Array.from({ length: TEAM_COUNT }, (_, teamIndex) => {
          const count = Array.from({ length: SLOT_COUNT }).filter((_, s) =>
            bySlot.has(`${teamIndex}:${s}`),
          ).length;
          return (
            <div
              key={teamIndex}
              className="overflow-hidden rounded-xl border border-border bg-card shadow-elegant transition-shadow duration-200 hover:shadow-lift"
            >
              <header className="flex items-center justify-between bg-guild-team px-2.5 py-2 text-guild-team-foreground">
                <span className="text-xs font-bold uppercase tracking-wide">
                  Team {teamIndex + 1}
                </span>
                <span className="text-xs font-semibold opacity-90">{count}/5</span>
              </header>
              <div className="space-y-1.5 p-2">
                {Array.from({ length: SLOT_COUNT }, (_, slotIndex) => {
                  const memberId = bySlot.get(`${teamIndex}:${slotIndex}`);
                  return (
                    <Slot
                      key={slotIndex}
                      section={section}
                      teamIndex={teamIndex}
                      slotIndex={slotIndex}
                      member={memberId ? membersById.get(memberId) : undefined}
                      isAdmin={isAdmin}
                      onUnassign={onUnassign}
                    />
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}
