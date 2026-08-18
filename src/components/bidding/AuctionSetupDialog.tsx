import { useEffect, useMemo, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Trash2, Plus } from "lucide-react";
import {
  AUCTION_TYPES,
  AUCTION_TYPE_LABELS,
  DEFAULT_ITEMS,
  totalBiddersFor,
  type AuctionType,
} from "@/lib/bidding";
import {
  hasBidThisCycle,
  isTenureEligible,
  restrictionLiftsAt,
  TENURE_GATED_AUCTIONS,
  type Member,
} from "@/lib/guild";

type ItemDraft = { item_name: string; added_items: number; max_per_bidder: number };

export type CreateAuctionInput = {
  name: string;
  auction_type: AuctionType;
  auction_date: string;
  items: ItemDraft[];
  memberIds: string[];
};

export function AuctionSetupDialog({
  open,
  onOpenChange,
  members,
  restrictionHours,
  currentCycle,
  onCreate,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  members: Member[];
  restrictionHours: number;
  currentCycle: number;
  onCreate: (input: CreateAuctionInput) => void;
}) {
  const today = new Date().toISOString().slice(0, 10);
  const [name, setName] = useState("");
  const [type, setType] = useState<AuctionType>("guild_league");
  const [date, setDate] = useState(today);
  const [items, setItems] = useState<ItemDraft[]>(DEFAULT_ITEMS.map((i) => ({ ...i })));
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [showIneligible, setShowIneligible] = useState(false);

  useEffect(() => {
    if (!open) return;
    setName("");
    setType("guild_league");
    setDate(today);
    setItems(DEFAULT_ITEMS.map((i) => ({ ...i })));
    setSelected(new Set());
    setShowIneligible(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  const gated = (TENURE_GATED_AUCTIONS as readonly string[]).includes(type);

  const rows = useMemo(() => {
    return members
      .filter((m) => m.status === "active")
      .sort((a, b) => a.sort_order - b.sort_order)
      .map((m) => {
        const waiting = hasBidThisCycle(m, currentCycle);
        const tenureBlocked = gated && !isTenureEligible(m, restrictionHours);
        const lifts = restrictionLiftsAt(m, restrictionHours);
        return { member: m, waiting, tenureBlocked, lifts, eligible: !waiting && !tenureBlocked };
      });
  }, [members, currentCycle, gated, restrictionHours]);

  const eligibleRows = rows.filter((r) => r.eligible);
  const visibleRows = showIneligible ? rows : eligibleRows;
  const totalSlots = items.reduce((sum, i) => sum + totalBiddersFor(i), 0);

  function toggle(id: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  const valid =
    name.trim().length > 0 &&
    selected.size > 0 &&
    items.length > 0 &&
    items.every((i) => i.item_name.trim() && i.max_per_bidder > 0);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-3xl">
        <DialogHeader>
          <DialogTitle>New auction</DialogTitle>
          <DialogDescription>
            Bidders come from the Guild Roster. The queue order is randomized once when the auction
            is created, then stays editable until you finalize.
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-3 sm:grid-cols-3">
          <div className="space-y-1.5 sm:col-span-1">
            <Label htmlFor="auction-name">Auction name</Label>
            <Input
              id="auction-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="GL Week 12"
            />
          </div>
          <div className="space-y-1.5">
            <Label>Type</Label>
            <Select value={type} onValueChange={(v) => setType(v as AuctionType)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {AUCTION_TYPES.map((t) => (
                  <SelectItem key={t} value={t}>
                    {AUCTION_TYPE_LABELS[t]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="auction-date">Date</Label>
            <Input
              id="auction-date"
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
            />
          </div>
        </div>

        <section className="space-y-2">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold">Items</h3>
            <p className="text-xs text-muted-foreground">{totalSlots} queue slot(s) needed</p>
          </div>
          <div className="space-y-2">
            {items.map((item, index) => (
              <div key={index} className="grid grid-cols-[1fr_5rem_5rem_2.25rem] items-end gap-2">
                <div className="space-y-1">
                  {index === 0 && <Label className="text-xs">Item</Label>}
                  <Input
                    value={item.item_name}
                    onChange={(e) =>
                      setItems((prev) =>
                        prev.map((it, i) => (i === index ? { ...it, item_name: e.target.value } : it)),
                      )
                    }
                  />
                </div>
                <div className="space-y-1">
                  {index === 0 && <Label className="text-xs">Added</Label>}
                  <Input
                    type="number"
                    min={0}
                    value={item.added_items}
                    onChange={(e) =>
                      setItems((prev) =>
                        prev.map((it, i) =>
                          i === index ? { ...it, added_items: Number(e.target.value) || 0 } : it,
                        ),
                      )
                    }
                  />
                </div>
                <div className="space-y-1">
                  {index === 0 && <Label className="text-xs">Max / bidder</Label>}
                  <Input
                    type="number"
                    min={1}
                    value={item.max_per_bidder}
                    onChange={(e) =>
                      setItems((prev) =>
                        prev.map((it, i) =>
                          i === index ? { ...it, max_per_bidder: Number(e.target.value) || 1 } : it,
                        ),
                      )
                    }
                  />
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => setItems((prev) => prev.filter((_, i) => i !== index))}
                  aria-label={`Remove ${item.item_name}`}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            ))}
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={() =>
              setItems((prev) => [...prev, { item_name: "", added_items: 1, max_per_bidder: 1 }])
            }
          >
            <Plus className="mr-1 h-4 w-4" /> Add item
          </Button>
        </section>

        <section className="space-y-2">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h3 className="text-sm font-semibold">
              Bidders — {selected.size} selected of {eligibleRows.length} eligible
            </h3>
            <div className="flex items-center gap-3">
              <label className="flex items-center gap-2 text-xs text-muted-foreground">
                <Checkbox
                  checked={showIneligible}
                  onCheckedChange={(v) => setShowIneligible(v === true)}
                />
                Show members on cooldown
              </label>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setSelected(new Set(eligibleRows.map((r) => r.member.id)))}
              >
                Select all eligible
              </Button>
            </div>
          </div>

          <div className="max-h-64 overflow-y-auto rounded-md border border-border">
            {visibleRows.length === 0 && (
              <p className="p-4 text-center text-xs text-muted-foreground">
                No eligible members — every active member has already bid in cycle {currentCycle}.
              </p>
            )}
            {visibleRows.map(({ member, waiting, tenureBlocked, lifts, eligible }) => (
              <label
                key={member.id}
                className="flex items-center justify-between gap-2 border-b border-border/60 px-3 py-2 text-sm last:border-0"
              >
                <span className="flex items-center gap-2">
                  <Checkbox
                    checked={selected.has(member.id)}
                    disabled={!eligible}
                    onCheckedChange={() => toggle(member.id)}
                  />
                  <span className="font-medium">{member.name}</span>
                  <span className="text-xs text-muted-foreground">{member.job_class}</span>
                </span>
                <span className="flex items-center gap-2">
                  {waiting && (
                    <Badge variant="secondary" className="text-[10px]">
                      Already bid — cycle {currentCycle}
                    </Badge>
                  )}
                  {tenureBlocked && lifts && (
                    <Badge variant="outline" className="text-[10px]">
                      New member until {lifts.toLocaleString()}
                    </Badge>
                  )}
                </span>
              </label>
            ))}
          </div>
        </section>

        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button
            disabled={!valid}
            onClick={() => {
              onCreate({
                name: name.trim(),
                auction_type: type,
                auction_date: date,
                items: items.map((i) => ({ ...i, item_name: i.item_name.trim() })),
                memberIds: [...selected],
              });
              onOpenChange(false);
            }}
          >
            Create &amp; randomize queue
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
