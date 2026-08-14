import { useMemo, useState } from "react";
import { useDraggable, useDroppable } from "@dnd-kit/core";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { JOB_CLASSES, type JobClass, type Member } from "@/lib/guild";
import { GripVertical, Trash2 } from "lucide-react";
import { cn } from "@/lib/utils";

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

  return (
    <li
      ref={setNodeRef}
      className={cn(
        "flex items-center gap-2 rounded border border-guild-slot-border bg-guild-surface px-2 py-1.5",
        isDragging && "opacity-40",
      )}
    >
      {isAdmin && (
        <>
          <Checkbox
            checked={selected}
            onCheckedChange={() => onToggle(member.id)}
            aria-label={`Select ${member.name}`}
          />
          <button
            type="button"
            className="cursor-grab text-muted-foreground"
            aria-label={`Drag ${member.name}`}
            {...attributes}
            {...listeners}
          >
            <GripVertical className="size-3.5" />
          </button>
        </>
      )}
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium leading-tight">{member.name}</p>
        <p className="truncate text-xs text-muted-foreground leading-tight">{member.job_class}</p>
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
          className="text-muted-foreground hover:text-destructive"
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
  const [classFilter, setClassFilter] = useState<"all" | JobClass>("all");
  const [sort, setSort] = useState<"name" | "class">("name");
  const [selected, setSelected] = useState<string[]>([]);
  const { setNodeRef, isOver } = useDroppable({ id: "roster", disabled: !isAdmin });

  const visible = useMemo(() => {
    const q = search.trim().toLowerCase();
    return members
      .filter((m) => (includeAssigned ? true : !assignedIds.has(m.id)))
      .filter((m) => (classFilter === "all" ? true : m.job_class === classFilter))
      .filter(
        (m) => !q || m.name.toLowerCase().includes(q) || m.job_class.toLowerCase().includes(q),
      )
      .sort((a, b) =>
        sort === "name"
          ? a.name.localeCompare(b.name)
          : a.job_class.localeCompare(b.job_class) || a.name.localeCompare(b.name),
      );
  }, [members, assignedIds, includeAssigned, classFilter, search, sort]);

  const unassignedCount = members.filter((m) => !assignedIds.has(m.id)).length;

  return (
    <aside
      ref={setNodeRef}
      className={cn(
        "flex w-full flex-col gap-2 rounded-md border border-border bg-guild-surface/60 p-3 lg:w-80 lg:shrink-0",
        isOver && "ring-2 ring-guild-bar",
      )}
    >
      <div className="rounded bg-guild-bar px-3 py-2 text-guild-bar-foreground">
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
        <Select value={classFilter} onValueChange={(v) => setClassFilter(v as "all" | JobClass)}>
          <SelectTrigger className="h-8 flex-1 text-xs">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All classes</SelectItem>
            {JOB_CLASSES.map((c) => (
              <SelectItem key={c} value={c}>
                {c}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={sort} onValueChange={(v) => setSort(v as "name" | "class")}>
          <SelectTrigger className="h-8 w-28 text-xs">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="name">Sort: Name</SelectItem>
            <SelectItem value="class">Sort: Class</SelectItem>
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

      <ul className="flex max-h-[60vh] flex-col gap-1 overflow-y-auto pr-1 lg:max-h-none">
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
                setSelected((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]))
              }
              onDelete={(id) => onDelete([id])}
            />
          ))
        )}
      </ul>
    </aside>
  );
}
