import { useMemo, useState } from "react";
import { useDraggable, useDroppable } from "@dnd-kit/core";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  FIRST_JOBS,
  JOB_CLASSES,
  REMOVAL_REASON_LABELS,
  firstJobOf,
  jobToken,
  restrictionLiftsAt,
  type FirstJob,
  type JobClass,
  type Member,
  type RemovalReason,
} from "@/lib/guild";
import { GripVertical, Pencil, RotateCcw, Settings2, UserMinus } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  EditMemberDialog,
  RemoveMemberDialog,
  RestrictionSettingsDialog,
} from "@/components/guild/MemberDialogs";

type SortMode = "custom" | "name-asc" | "name-desc" | "class-asc" | "class-desc";

type Props = {
  members: Member[];
  assignedIds: Set<string>;
  isAdmin: boolean;
  includeAssigned: boolean;
  restrictionHours: number;
  onIncludeAssignedChange: (v: boolean) => void;
  onDelete: (ids: string[]) => void;
  onEdit: (input: { id: string; name: string; job_class: JobClass; join_date: string | null }) => void;
  onRemove: (input: { id: string; reason: RemovalReason }) => void;
  onReactivate: (id: string) => void;
  onRestrictionHoursChange: (hours: number) => void;
  children?: React.ReactNode;
};

function MemberRow({
  member,
  isAdmin,
  assigned,
  selected,
  reorderable,
  restrictionHours,
  onToggle,
  onEdit,
  onRemove,
}: {
  member: Member;
  isAdmin: boolean;
  assigned: boolean;
  selected: boolean;
  reorderable: boolean;
  restrictionHours: number;
  onToggle: (id: string) => void;
  onEdit: (member: Member) => void;
  onRemove: (member: Member) => void;
}) {
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({
    id: member.id,
    disabled: !isAdmin,
    data: { memberId: member.id },
  });
  const { setNodeRef: setDropRef, isOver } = useDroppable({
    id: `row:${member.id}`,
    disabled: !isAdmin || !reorderable,
  });
  const accent = `var(--job-${jobToken(member.job_class)})`;
  const lifts = restrictionLiftsAt(member, restrictionHours);
  const restricted = !!lifts && Date.now() < lifts.getTime();

  return (
    <li
      ref={(node) => {
        setNodeRef(node);
        setDropRef(node);
      }}
      style={{
        borderLeftColor: accent,
        background: `linear-gradient(90deg, color-mix(in oklab, ${accent} 14%, transparent), transparent 55%)`,
      }}
      className={cn(
        "group flex touch-none items-center gap-2 rounded-md border border-guild-slot-border border-l-[3px] bg-guild-surface px-2 py-2 shadow-elegant transition-all duration-200",
        isAdmin && "cursor-grab hover:-translate-y-px hover:brightness-110 active:cursor-grabbing",
        isDragging && "opacity-40",
        isOver && "ring-2 ring-ring",
      )}
      {...(isAdmin ? attributes : {})}
      {...(isAdmin ? listeners : {})}
    >
      {isAdmin && (
        <>
          <span onPointerDown={(e) => e.stopPropagation()} className="flex items-center">
            <Checkbox
              checked={selected}
              onCheckedChange={() => onToggle(member.id)}
              aria-label={`Select ${member.name}`}
            />
          </span>
          <GripVertical className="size-3.5 shrink-0 text-muted-foreground" aria-hidden />
        </>
      )}
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium leading-tight">{member.name}</p>
        <p className="truncate text-xs leading-tight text-muted-foreground">
          <span style={{ color: accent }} className="font-semibold">
            {firstJobOf(member.job_class)}
          </span>
          {" · "}
          {member.job_class}
        </p>
        {restricted && (
          <p className="truncate text-[10px] leading-tight text-muted-foreground">
            New member · eligible {lifts!.toLocaleDateString()}
          </p>
        )}
      </div>
      {assigned && (
        <span className="rounded bg-guild-team px-1.5 py-0.5 text-[10px] font-semibold uppercase text-guild-team-foreground">
          in party
        </span>
      )}
      {isAdmin && (
        <span className="flex shrink-0 items-center gap-1" onPointerDown={(e) => e.stopPropagation()}>
          <button
            type="button"
            aria-label={`Edit ${member.name}`}
            className="text-muted-foreground opacity-70 hover:text-primary hover:opacity-100"
            onClick={() => onEdit(member)}
          >
            <Pencil className="size-3.5" />
          </button>
          <button
            type="button"
            aria-label={`Remove ${member.name}`}
            className="text-muted-foreground opacity-70 hover:text-destructive hover:opacity-100"
            onClick={() => onRemove(member)}
          >
            <UserMinus className="size-3.5" />
          </button>
        </span>
      )}
    </li>
  );
}

function RemovedRow({
  member,
  isAdmin,
  onReactivate,
  onDelete,
}: {
  member: Member;
  isAdmin: boolean;
  onReactivate: (id: string) => void;
  onDelete: (id: string) => void;
}) {
  return (
    <li className="flex items-center gap-2 rounded-md border border-guild-slot-border bg-guild-surface/60 px-2 py-2 opacity-70">
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium leading-tight line-through">{member.name}</p>
        <p className="truncate text-xs leading-tight text-muted-foreground">
          {member.job_class}
          {member.removal_reason
            ? ` · ${REMOVAL_REASON_LABELS[member.removal_reason]}`
            : ""}
          {member.removed_at ? ` · ${new Date(member.removed_at).toLocaleDateString()}` : ""}
        </p>
      </div>
      {isAdmin && (
        <span className="flex shrink-0 items-center gap-1">
          <button
            type="button"
            aria-label={`Reactivate ${member.name}`}
            className="text-muted-foreground hover:text-primary"
            onClick={() => onReactivate(member.id)}
          >
            <RotateCcw className="size-3.5" />
          </button>
          <button
            type="button"
            aria-label={`Delete ${member.name} permanently`}
            className="text-[10px] uppercase text-muted-foreground hover:text-destructive"
            onClick={() => onDelete(member.id)}
          >
            Delete
          </button>
        </span>
      )}
    </li>
  );
}

export function RosterSidebar({
  members,
  assignedIds,
  isAdmin,
  includeAssigned,
  restrictionHours,
  onIncludeAssignedChange,
  onDelete,
  onEdit,
  onRemove,
  onReactivate,
  onRestrictionHoursChange,
  children,
}: Props) {
  const [search, setSearch] = useState("");
  const [classFilter, setClassFilter] = useState<string>("all");
  const [sort, setSort] = useState<SortMode>("custom");
  const [tab, setTab] = useState<"active" | "removed">("active");
  const [selected, setSelected] = useState<string[]>([]);
  const [editing, setEditing] = useState<Member | null>(null);
  const [removing, setRemoving] = useState<Member | null>(null);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const { setNodeRef, isOver } = useDroppable({ id: "roster", disabled: !isAdmin });

  const active = useMemo(() => members.filter((m) => m.status === "active"), [members]);
  const removed = useMemo(() => members.filter((m) => m.status === "removed"), [members]);

  const visible = useMemo(() => {
    const q = search.trim().toLowerCase();
    const list = (tab === "active" ? active : removed)
      .filter((m) => (tab === "removed" || includeAssigned ? true : !assignedIds.has(m.id)))
      .filter((m) => {
        if (classFilter === "all") return true;
        if (classFilter.startsWith("first:")) {
          return firstJobOf(m.job_class) === (classFilter.slice(6) as FirstJob);
        }
        return m.job_class === (classFilter as JobClass);
      })
      .filter(
        (m) =>
          !q ||
          m.name.toLowerCase().includes(q) ||
          m.job_class.toLowerCase().includes(q) ||
          firstJobOf(m.job_class).toLowerCase().includes(q),
      );

    return [...list].sort((a, b) => {
      const byName = a.name.localeCompare(b.name);
      const byClass = a.job_class.localeCompare(b.job_class) || byName;
      switch (sort) {
        case "custom":
          return a.sort_order - b.sort_order || byName;
        case "name-asc":
          return byName;
        case "name-desc":
          return -byName;
        case "class-asc":
          return byClass;
        case "class-desc":
          return -byClass;
      }
    });
  }, [active, removed, tab, assignedIds, includeAssigned, classFilter, search, sort]);

  const unassignedCount = active.filter((m) => !assignedIds.has(m.id)).length;
  const reorderable = sort === "custom" && tab === "active";

  return (
    <aside
      ref={setNodeRef}
      className={cn(
        "scroll-panel flex w-full flex-col gap-2 self-stretch rounded-xl border border-border bg-sidebar/80 p-3 shadow-elegant backdrop-blur-sm transition-shadow lg:max-h-none lg:w-80 lg:shrink-0",
        isOver && "ring-2 ring-ring",
      )}

    >
      <div className="rounded-lg bg-guild-bar px-3 py-2 text-guild-bar-foreground">
        <div className="flex items-start justify-between gap-2">
          <div>
            <h2 className="text-sm font-bold uppercase tracking-wide">Guild Roster</h2>
            <p className="text-xs opacity-90">
              {active.length} members · {unassignedCount} unassigned
            </p>
          </div>
          {isAdmin && (
            <button
              type="button"
              aria-label="Roster settings"
              className="opacity-80 hover:opacity-100"
              onClick={() => setSettingsOpen(true)}
            >
              <Settings2 className="size-4" />
            </button>
          )}
        </div>
        <p className="mt-1 text-[10px] uppercase tracking-wide opacity-75">
          Member order determines bidding turn order
        </p>
      </div>

      <Tabs value={tab} onValueChange={(v) => setTab(v as "active" | "removed")}>
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="active" className="text-xs">
            Active ({active.length})
          </TabsTrigger>
          <TabsTrigger value="removed" className="text-xs">
            Removed ({removed.length})
          </TabsTrigger>
        </TabsList>
      </Tabs>

      <Input
        placeholder="Search name or class"
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        className="h-8"
      />
      <div className="flex gap-2">
        <Select value={classFilter} onValueChange={setClassFilter}>
          <SelectTrigger className="h-8 flex-1 text-xs">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All classes</SelectItem>
            <SelectGroup>
              <SelectLabel>First job</SelectLabel>
              {FIRST_JOBS.map((f) => (
                <SelectItem key={f} value={`first:${f}`}>
                  {f}
                </SelectItem>
              ))}
            </SelectGroup>
            <SelectGroup>
              <SelectLabel>Class</SelectLabel>
              {JOB_CLASSES.map((c) => (
                <SelectItem key={c} value={c}>
                  {c}
                </SelectItem>
              ))}
            </SelectGroup>
          </SelectContent>
        </Select>
        <Select value={sort} onValueChange={(v) => setSort(v as SortMode)}>
          <SelectTrigger className="h-8 w-32 text-xs">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="custom">Roster order</SelectItem>
            <SelectItem value="name-asc">Name A–Z</SelectItem>
            <SelectItem value="name-desc">Name Z–A</SelectItem>
            <SelectItem value="class-asc">Class A–Z</SelectItem>
            <SelectItem value="class-desc">Class Z–A</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {tab === "active" && (
        <label className="flex items-center gap-2 text-xs text-muted-foreground">
          <Checkbox
            checked={includeAssigned}
            onCheckedChange={(v) => onIncludeAssignedChange(v === true)}
          />
          Include members already in a party
        </label>
      )}

      {isAdmin && tab === "active" && !reorderable && (
        <p className="text-[10px] text-muted-foreground">
          Switch to “Roster order” to drag-reorder members.
        </p>
      )}

      {isAdmin && tab === "active" && children}

      {isAdmin && tab === "active" && selected.length > 0 && (
        <Button
          size="sm"
          variant="destructive"
          onClick={() => {
            onDelete(selected);
            setSelected([]);
          }}
        >
          Delete selected ({selected.length})
        </Button>
      )}

      <ul className="flex flex-col gap-1.5 pr-1">
        {visible.length === 0 ? (
          <li className="py-6 text-center text-sm text-muted-foreground">No members match.</li>
        ) : tab === "removed" ? (
          visible.map((m) => (
            <RemovedRow
              key={m.id}
              member={m}
              isAdmin={isAdmin}
              onReactivate={onReactivate}
              onDelete={(id) => onDelete([id])}
            />
          ))
        ) : (
          visible.map((m) => (
            <MemberRow
              key={m.id}
              member={m}
              isAdmin={isAdmin}
              assigned={assignedIds.has(m.id)}
              selected={selected.includes(m.id)}
              reorderable={reorderable}
              restrictionHours={restrictionHours}
              onToggle={(id) =>
                setSelected((prev) =>
                  prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id],
                )
              }
              onEdit={setEditing}
              onRemove={setRemoving}
            />
          ))
        )}
      </ul>

      <EditMemberDialog
        member={editing}
        onOpenChange={(open) => !open && setEditing(null)}
        onSave={onEdit}
      />
      <RemoveMemberDialog
        member={removing}
        onOpenChange={(open) => !open && setRemoving(null)}
        onConfirm={onRemove}
      />
      <RestrictionSettingsDialog
        open={settingsOpen}
        onOpenChange={setSettingsOpen}
        hours={restrictionHours}
        onSave={onRestrictionHoursChange}
      />
    </aside>
  );
}
