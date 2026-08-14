import { useDraggable, useDroppable } from "@dnd-kit/core";
import { SLOT_COUNT, TEAM_COUNT, type Assignment, type Member, type SectionKey } from "@/lib/guild";
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
        "flex items-center gap-1 rounded bg-guild-surface px-2 py-1",
        isAdmin && "cursor-grab",
        isDragging && "opacity-40",
      )}
      {...(isAdmin ? attributes : {})}
      {...(isAdmin ? listeners : {})}
    >
      <div className="min-w-0 flex-1">
        <p className="truncate text-xs font-semibold leading-tight">{member.name}</p>
        <p className="truncate text-[10px] text-muted-foreground leading-tight">{member.job_class}</p>
      </div>
      {isAdmin && (
        <button
          type="button"
          aria-label={`Remove ${member.name} from slot`}
          className="text-muted-foreground hover:text-destructive"
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
        "min-h-[34px] rounded border border-dashed border-guild-slot-border bg-guild-slot p-0.5",
        isOver && "border-solid border-guild-bar bg-guild-bar/10",
      )}
    >
      {member ? (
        <FilledSlot member={member} isAdmin={isAdmin} onUnassign={onUnassign} />
      ) : (
        <p className="px-2 py-1.5 text-[10px] uppercase tracking-wide text-muted-foreground">
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
    <section className="space-y-2">
      <h2 className="rounded bg-guild-bar px-3 py-2 text-sm font-bold uppercase tracking-wide text-guild-bar-foreground">
        {title}
      </h2>
      <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-4">
        {Array.from({ length: TEAM_COUNT }, (_, teamIndex) => {
          const count = Array.from({ length: SLOT_COUNT }).filter((_, s) =>
            bySlot.has(`${teamIndex}:${s}`),
          ).length;
          return (
            <div
              key={teamIndex}
              className="overflow-hidden rounded-md border border-border bg-guild-surface"
            >
              <header className="flex items-center justify-between bg-guild-team px-2 py-1.5 text-guild-team-foreground">
                <span className="text-xs font-bold uppercase">Team {teamIndex + 1}</span>
                <span className="text-xs font-semibold">{count}/5</span>
              </header>
              <div className="space-y-1 p-1.5">
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
