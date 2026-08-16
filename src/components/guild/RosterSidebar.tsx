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
import {
  FIRST_JOBS,
  JOB_CLASSES,
  firstJobOf,
  jobToken,
  type FirstJob,
  type JobClass,
  type Member,
} from "@/lib/guild";
import { GripVertical, Trash2 } from "lucide-react";
import { cn } from "@/lib/utils";

type SortMode = "name-asc" | "name-desc" | "class-asc" | "class-desc";

type Props = {
  members: Member[];
  assignedIds: Set<string>;
  isAdmin: boolean;
  includeAssigned: boolean;
  onIncludeAssignedChange: (v: boolean) => void;
  onDelete: (ids: string[]) => void;
  children?: React.ReactNode;
};

function MemberRow({
  member,
  isAdmin,
  assigned,
  selected,
  onToggle,
  onDelete,
}: {
  member: Member;
  isAdmin: boolean;
  assigned: boolean;
  selected: boolean;
  onToggle: (id: string) => void;
  onDelete: (id: string) => void;
}) {
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({
    id: member.id,
    disabled: !isAdmin,
    data: { memberId: member.id },
  });
  const accent = `var(--job-${jobToken(member.job_class)})`;

  return (
    <li
      ref={setNodeRef}
      style={{
        borderLeftColor: accent,
        background: `linear-gradient(90deg, color-mix(in oklab, ${accent} 14%, transparent), transparent 55%)`,
      }}
      className={cn(
        "group flex touch-none items-center gap-2 rounded-md border border-guild-slot-border border-l-[3px] bg-guild-surface px-2 py-2 shadow-elegant transition-all duration-200",
        isAdmin && "cursor-grab hover:-translate-y-px hover:brightness-110 active:cursor-grabbing",
        isDragging && "opacity-40",
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
      </div>
      {assigned && (
        <span className="rounded bg-guild-team px-1.5 py-0.5 text-[10px] font-semibold uppercase text-guild-team-foreground">
          in party
        </span>
      )}
      {isAdmin && (
        <button
          type="button"
          aria-label={`Delete ${member.name}`}
          className="text-muted-foreground opacity-70 hover:text-destructive hover:opacity-100"
          onPointerDown={(e) => e.stopPropagation()}
          onClick={() => onDelete(member.id)}
        >
          <Trash2 className="size-3.5" />
        </button>
      )}
    </li>
  );
}

export function RosterSidebar({
  members,
  assignedIds,
  isAdmin,
  includeAssigned,
  onIncludeAssignedChange,
  onDelete,
  children,
}: Props) {
  const [search, setSearch] = useState("");
  const [classFilter, setClassFilter] = useState<string>("all");
  const [sort, setSort] = useState<SortMode>("name-asc");
  const [selected, setSelected] = useState<string[]>([]);
  const { setNodeRef, isOver } = useDroppable({ id: "roster", disabled: !isAdmin });

  const visible = useMemo(() => {
    const q = search.trim().toLowerCase();
    return members
      .filter((m) => (includeAssigned ? true : !assignedIds.has(m.id)))
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
      )
      .sort((a, b) => {
        const byName = a.name.localeCompare(b.name);
        const byClass = a.job_class.localeCompare(b.job_class) || byName;
        switch (sort) {
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
  }, [members, assignedIds, includeAssigned, classFilter, search, sort]);

  const unassignedCount = members.filter((m) => !assignedIds.has(m.id)).length;

  return (
    <aside
      ref={setNodeRef}
      className={cn(
        "flex w-full flex-col gap-2 rounded-xl border border-border bg-sidebar/80 p-3 shadow-elegant backdrop-blur-sm transition-shadow lg:w-80 lg:shrink-0",
        isOver && "ring-2 ring-ring",
      )}
    >
      <div className="rounded-lg bg-guild-bar px-3 py-2 text-guild-bar-foreground">
        <h2 className="text-sm font-bold uppercase tracking-wide">Guild Roster</h2>
        <p className="text-xs opacity-90">
          {members.length} members · {unassignedCount} unassigned
        </p>
      </div>

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
            <SelectItem value="name-asc">Name A–Z</SelectItem>
            <SelectItem value="name-desc">Name Z–A</SelectItem>
            <SelectItem value="class-asc">Class A–Z</SelectItem>
            <SelectItem value="class-desc">Class Z–A</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <label className="flex items-center gap-2 text-xs text-muted-foreground">
        <Checkbox
          checked={includeAssigned}
          onCheckedChange={(v) => onIncludeAssignedChange(v === true)}
        />
        Include members already in a party
      </label>

      {isAdmin && children}

      {isAdmin && selected.length > 0 && (
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

      <ul className="flex max-h-[60vh] flex-col gap-1.5 overflow-y-auto pr-1 lg:max-h-none">
        {visible.length === 0 ? (
          <li className="py-6 text-center text-sm text-muted-foreground">No members match.</li>
        ) : (
          visible.map((m) => (
            <MemberRow
              key={m.id}
              member={m}
              isAdmin={isAdmin}
              assigned={assignedIds.has(m.id)}
              selected={selected.includes(m.id)}
              onToggle={(id) =>
                setSelected((prev) =>
                  prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id],
                )
              }
              onDelete={(id) => onDelete([id])}
            />
          ))
        )}
      </ul>
    </aside>
  );
}
