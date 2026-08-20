import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ArrowDown, ArrowUp, Shuffle, Trash2, UserPlus } from "lucide-react";
import { buildQueue, type Participant } from "@/lib/bidding";
import type { Member } from "@/lib/guild";

export function QueuePanel({
  participants,
  members,
  isAdmin,
  locked,
  onReorder,
  onReshuffle,
  onTickets,
  onDrop,
  onReplace,
  onRemove,
  onAdd,
}: {
  participants: Participant[];
  members: Member[];
  isAdmin: boolean;
  locked: boolean;
  onReorder: (ids: string[]) => void;
  onReshuffle: () => void;
  onTickets: (id: string, tickets: number) => void;
  onDrop: (id: string, dropped: boolean) => void;
  onReplace: (id: string, memberId: string) => void;
  onRemove: (id: string) => void;
  onAdd: (memberId: string) => void;
}) {
  const [replacing, setReplacing] = useState<string | null>(null);
  const [addOpen, setAddOpen] = useState(false);
  const ordered = [...participants].sort((a, b) => a.queue_position - b.queue_position);
  const queue = buildQueue(participants);
  const inAuction = new Set(participants.map((p) => p.member_id).filter(Boolean) as string[]);
  const available = members.filter((m) => m.status === "active" && !inAuction.has(m.id));

  function move(index: number, delta: number) {
    const next = [...ordered];
    const target = index + delta;
    if (target < 0 || target >= next.length) return;
    const a = next[index]!;
    next[index] = next[target]!;
    next[target] = a;
    onReorder(next.map((p) => p.id));
  }

  return (
    <section className="flex min-h-0 flex-col rounded-lg border border-border bg-card">
      <header className="flex flex-wrap items-center justify-between gap-2 border-b border-border px-3 py-2">

        <div>
          <h2 className="text-sm font-semibold">Bidder queue</h2>
          <p className="text-xs text-muted-foreground">
            {ordered.filter((p) => !p.dropped).length} bidder(s) · {queue.length} ticket slot(s)
          </p>
        </div>
        {isAdmin && !locked && (
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={() => setAddOpen((v) => !v)}>
              <UserPlus className="mr-1 h-4 w-4" /> Add bidder
            </Button>
            <Button variant="outline" size="sm" onClick={onReshuffle}>
              <Shuffle className="mr-1 h-4 w-4" /> Re-randomize
            </Button>
          </div>
        )}
      </header>

      {isAdmin && addOpen && !locked && (
        <div className="flex items-center gap-2 border-b border-border bg-muted/40 px-3 py-2">
          <Select
            onValueChange={(v) => {
              onAdd(v);
              setAddOpen(false);
            }}
          >
            <SelectTrigger className="h-8 w-64 text-xs">
              <SelectValue placeholder="Pick a roster member" />
            </SelectTrigger>
            <SelectContent>
              {available.map((m) => (
                <SelectItem key={m.id} value={m.id}>
                  {m.name} — {m.job_class}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      )}

      <ol className="scroll-panel max-h-[46vh] divide-y divide-border/60">
        {ordered.map((p, index) => (
          <li key={p.id} className="flex flex-wrap items-center gap-2 px-3 py-2 text-sm">
            <span className="w-7 shrink-0 text-xs font-semibold tabular-nums text-muted-foreground">
              {index + 1}.
            </span>
            <span className={p.dropped ? "font-medium line-through opacity-60" : "font-medium"}>
              {p.ign}
            </span>
            {p.needs_reconciliation && (
              <Badge variant="outline" className="text-[10px]">
                Unlinked
              </Badge>
            )}
            {p.dropped && (
              <Badge variant="secondary" className="text-[10px]">
                Dropped
              </Badge>
            )}
            {p.tickets > 1 && (
              <Badge className="text-[10px]">{p.tickets} tickets</Badge>
            )}

            {isAdmin && !locked && (
              <span className="ml-auto flex items-center gap-1">
                <Input
                  type="number"
                  min={1}
                  max={20}
                  value={p.tickets}
                  onChange={(e) => onTickets(p.id, Math.max(1, Number(e.target.value) || 1))}
                  className="h-7 w-14 text-xs"
                  aria-label={`Tickets for ${p.ign}`}
                />
                <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => move(index, -1)} aria-label="Move up">
                  <ArrowUp className="h-3.5 w-3.5" />
                </Button>
                <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => move(index, 1)} aria-label="Move down">
                  <ArrowDown className="h-3.5 w-3.5" />
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-7 text-xs"
                  onClick={() => onDrop(p.id, !p.dropped)}
                >
                  {p.dropped ? "Restore" : "Drop"}
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-7 text-xs"
                  onClick={() => setReplacing(replacing === p.id ? null : p.id)}
                >
                  Replace
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7"
                  onClick={() => onRemove(p.id)}
                  aria-label={`Remove ${p.ign}`}
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </Button>
              </span>
            )}

            {isAdmin && replacing === p.id && (
              <div className="w-full pl-7 pt-1">
                <Select
                  onValueChange={(v) => {
                    onReplace(p.id, v);
                    setReplacing(null);
                  }}
                >
                  <SelectTrigger className="h-8 w-64 text-xs">
                    <SelectValue placeholder="Replace with roster member" />
                  </SelectTrigger>
                  <SelectContent>
                    {available.map((m) => (
                      <SelectItem key={m.id} value={m.id}>
                        {m.name} — {m.job_class}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
          </li>
        ))}
        {ordered.length === 0 && (
          <li className="px-3 py-6 text-center text-xs text-muted-foreground">No bidders yet.</li>
        )}
      </ol>
    </section>
  );
}
