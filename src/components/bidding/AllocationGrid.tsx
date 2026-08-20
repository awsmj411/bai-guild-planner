import { useMemo, useState } from "react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { Allocation, AuctionItem } from "@/lib/bidding";

const ROWS_PER_PAGE = 4;
const PAGES_PER_BLOCK = 10;
const ITEM_HUES = 8;

type Cell = {
  allocation: Allocation;
  item: AuctionItem;
  hue: string;
};

/** Colour token for an item, cycled across the fixed grid palette. */
export function itemHue(index: number) {
  return `var(--item-${(index % ITEM_HUES) + 1})`;
}

/**
 * Flattens every allocation into one continuous slot list (items in setup
 * order), then lays it out 4 rows per page column, like the in-game sheet.
 */
function buildCells(items: AuctionItem[], allocations: Allocation[]): Cell[] {
  const ordered = [...items].sort((a, b) => a.position - b.position);
  return ordered.flatMap((item, itemIndex) =>
    allocations
      .filter((a) => a.item_id === item.id && a.status !== "superseded")
      .sort((a, b) => a.queue_index - b.queue_index)
      .map((allocation) => ({ allocation, item, hue: itemHue(itemIndex) })),
  );
}

export function AllocationGrid({
  items,
  allocations,
  isAdmin,
  memberNames,
  onReplace,
}: {
  items: AuctionItem[];
  allocations: Allocation[];
  isAdmin: boolean;
  memberNames: string[];
  onReplace: (allocationId: string, ign: string) => void;
}) {
  const cells = useMemo(() => buildCells(items, allocations), [items, allocations]);
  const ordered = useMemo(() => [...items].sort((a, b) => a.position - b.position), [items]);

  if (cells.length === 0) {
    return (
      <p className="px-3 py-6 text-center text-xs text-muted-foreground">
        No allocations yet — run the distribution to build the grid.
      </p>
    );
  }

  const pageCount = Math.ceil(cells.length / ROWS_PER_PAGE);
  const blockCount = Math.ceil(pageCount / PAGES_PER_BLOCK);

  return (
    <div className="space-y-4 px-3 py-3">
      <ul className="flex flex-wrap gap-x-4 gap-y-1.5">
        {ordered.map((item, index) => (
          <li key={item.id} className="flex items-center gap-1.5 text-xs">
            <span
              aria-hidden
              className="size-3 rounded-sm border border-border"
              style={{
                background: `color-mix(in oklab, ${itemHue(index)} 30%, var(--card))`,
              }}
            />
            <span className="font-medium">{item.item_name}</span>
            <span className="text-muted-foreground">
              ({item.added_items} · max {item.max_per_bidder})
            </span>
          </li>
        ))}
      </ul>

      {Array.from({ length: blockCount }, (_, block) => {
        const firstPage = block * PAGES_PER_BLOCK;
        const pagesInBlock = Math.min(PAGES_PER_BLOCK, pageCount - firstPage);
        return (
          <div
            key={block}
            className="overflow-x-auto rounded-lg border border-border shadow-elegant"
          >
            <table className="w-full min-w-max border-collapse text-center text-xs">
              <thead>
                <tr>
                  <th className="sticky left-0 z-10 w-24 border border-border bg-guild-team px-2 py-1.5 font-bold text-guild-team-foreground">
                    Bidders
                  </th>
                  {Array.from({ length: pagesInBlock }, (_, p) => (
                    <th
                      key={p}
                      className="min-w-[104px] border border-border bg-guild-team px-2 py-1.5 font-semibold text-guild-team-foreground"
                    >
                      Page {firstPage + p + 1}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {Array.from({ length: ROWS_PER_PAGE }, (_, row) => (
                  <tr key={row}>
                    <th className="sticky left-0 z-10 border border-border bg-guild-team/90 px-2 py-1 text-right font-medium text-guild-team-foreground">
                      Row {row + 1}
                    </th>
                    {Array.from({ length: pagesInBlock }, (_, p) => {
                      const cell = cells[(firstPage + p) * ROWS_PER_PAGE + row];
                      return (
                        <GridCell
                          key={p}
                          cell={cell}
                          isAdmin={isAdmin}
                          memberNames={memberNames}
                          onReplace={onReplace}
                        />
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        );
      })}
    </div>
  );
}

function GridCell({
  cell,
  isAdmin,
  memberNames,
  onReplace,
}: {
  cell: Cell | undefined;
  isAdmin: boolean;
  memberNames: string[];
  onReplace: (allocationId: string, ign: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const [value, setValue] = useState("");

  if (!cell) {
    return <td className="border border-border bg-muted/30 px-2 py-1" />;
  }

  const { allocation, item, hue } = cell;
  const style = {
    background: `color-mix(in oklab, ${hue} 22%, var(--card))`,
    color: "var(--card-foreground)",
  };
  const label = (
    <span className="block truncate">
      {allocation.ign}
      {allocation.quantity > 1 ? ` ×${allocation.quantity}` : ""}
    </span>
  );

  if (!isAdmin) {
    return (
      <td
        className="border border-border px-2 py-1 font-medium"
        style={style}
        title={`${item.item_name} · ${allocation.ign}`}
      >
        {label}
      </td>
    );
  }

  return (
    <td className="border border-border p-0" style={style}>
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <button
            type="button"
            className={cn(
              "w-full px-2 py-1 font-medium transition-colors hover:brightness-105",
              allocation.status === "error" && "underline decoration-destructive decoration-2",
            )}
            title={`${item.item_name} · ${allocation.ign}`}
          >
            {label}
          </button>
        </PopoverTrigger>
        <PopoverContent className="w-64 space-y-2 p-3" align="center">
          <p className="text-xs text-muted-foreground">
            {item.item_name} — swap <span className="font-medium text-foreground">{allocation.ign}</span>
          </p>
          <Input
            list="bid-grid-names"
            value={value}
            onChange={(e) => setValue(e.target.value)}
            placeholder="Replace with…"
            className="h-8 text-xs"
          />
          <datalist id="bid-grid-names">
            {memberNames.map((n) => (
              <option key={n} value={n} />
            ))}
          </datalist>
          <Button
            size="sm"
            className="w-full"
            disabled={!value.trim()}
            onClick={() => {
              onReplace(allocation.id, value.trim());
              setValue("");
              setOpen(false);
            }}
          >
            Apply swap
          </Button>
        </PopoverContent>
      </Popover>
    </td>
  );
}
