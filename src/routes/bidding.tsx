import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { supabase } from "@/integrations/supabase/client";
import { GuildHeader, useIsAdmin } from "@/components/guild/GuildHeader";
import { AuctionSetupDialog } from "@/components/bidding/AuctionSetupDialog";
import { QueuePanel } from "@/components/bidding/QueuePanel";
import { getGuildData } from "@/lib/guild.functions";
import {
  AUCTION_TYPE_LABELS,
  dashboardStats,
  itemChecks,
  totalBiddersFor,
  type Allocation,
} from "@/lib/bidding";
import {
  addParticipants,
  createAuction,
  deleteAuction,
  finalizeAuction,
  getAuction,
  listAuctions,
  removeParticipant,
  reorderQueue,
  reshuffleQueue,
  runDistribution,
  supersedeAllocation,
  updateAllocation,
  updateParticipant,
} from "@/lib/bidding.functions";

export const Route = createFileRoute("/bidding")({
  head: () => ({
    meta: [
      { title: "BAI Guild Bidding — Fair Rotation Auctions" },
      {
        name: "description",
        content:
          "Run BAI Guild item auctions with a randomized bidder queue, fair-rotation cycles and audited allocation results.",
      },
      { property: "og:title", content: "BAI Guild Bidding — Fair Rotation Auctions" },
      {
        property: "og:description",
        content:
          "Randomized bidder queues, rotating allocation pointer and audited results for BAI Guild auctions.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: BiddingPage,
});

function BiddingPage() {
  const isAdmin = useIsAdmin();
  const queryClient = useQueryClient();

  const fetchGuild = useServerFn(getGuildData);
  const fetchAuctions = useServerFn(listAuctions);
  const fetchAuction = useServerFn(getAuction);
  const doCreate = useServerFn(createAuction);
  const doDelete = useServerFn(deleteAuction);
  const doAddParticipants = useServerFn(addParticipants);
  const doUpdateParticipant = useServerFn(updateParticipant);
  const doRemoveParticipant = useServerFn(removeParticipant);
  const doReorder = useServerFn(reorderQueue);
  const doReshuffle = useServerFn(reshuffleQueue);
  const doDistribute = useServerFn(runDistribution);
  const doUpdateAllocation = useServerFn(updateAllocation);
  const doFinalize = useServerFn(finalizeAuction);
  const doSupersede = useServerFn(supersedeAllocation);

  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [setupOpen, setSetupOpen] = useState(false);

  const guild = useQuery({ queryKey: ["guild"], queryFn: () => fetchGuild() });
  const auctions = useQuery({ queryKey: ["auctions"], queryFn: () => fetchAuctions() });
  const detail = useQuery({
    queryKey: ["auction", selectedId],
    queryFn: () => fetchAuction({ data: { id: selectedId! } }),
    enabled: !!selectedId,
  });

  useEffect(() => {
    if (!selectedId && auctions.data?.auctions.length) {
      setSelectedId(auctions.data.auctions[0]!.id);
    }
  }, [auctions.data, selectedId]);

  // Live sync so every viewer sees results as they are published.
  useEffect(() => {
    const channel = supabase
      .channel("bidding-live")
      .on("postgres_changes", { event: "*", schema: "public", table: "allocations" }, () => refresh())
      .on("postgres_changes", { event: "*", schema: "public", table: "auctions" }, () => refresh())
      .on("postgres_changes", { event: "*", schema: "public", table: "auction_participants" }, () =>
        refresh(),
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedId]);

  function refresh() {
    queryClient.invalidateQueries({ queryKey: ["auctions"] });
    queryClient.invalidateQueries({ queryKey: ["auction"] });
    queryClient.invalidateQueries({ queryKey: ["guild"] });
  }

  async function guard(action: () => Promise<unknown>, message: string) {
    try {
      await action();
      await Promise.resolve(refresh());
      toast.success(message);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Something went wrong");
    }
  }

  const members = guild.data?.members ?? [];
  const auction = detail.data?.auction ?? null;
  const items = detail.data?.items ?? [];
  const participants = detail.data?.participants ?? [];
  const allocations = detail.data?.allocations ?? [];
  const events = detail.data?.events ?? [];
  const locked = !!auction && auction.status !== "open";

  const stats = useMemo(
    () => dashboardStats(items, participants, allocations),
    [items, participants, allocations],
  );
  const checks = useMemo(() => itemChecks(items, allocations), [items, allocations]);

  return (
    <div className="flex h-screen flex-col overflow-hidden bg-background">
      <GuildHeader isAdmin={isAdmin} tagline="Bidding & Fair Rotation" />

      <main className="route-fade mx-auto flex w-full min-h-0 max-w-[1500px] flex-1 flex-col gap-4 px-4 py-4 lg:flex-row lg:overflow-hidden">
        <aside className="flex w-full shrink-0 flex-col lg:w-64 lg:min-h-0">
          <div className="flex min-h-0 flex-col rounded-lg border border-border bg-card">
            <header className="flex items-center justify-between border-b border-border px-3 py-2">
              <h2 className="text-sm font-semibold">Auctions</h2>
              <Badge variant="secondary" className="text-[10px]">
                Cycle {auctions.data?.currentCycle ?? 1}
              </Badge>
            </header>
            <ul className="scroll-panel max-h-[40vh] divide-y divide-border/60 lg:max-h-none lg:flex-1">

              {(auctions.data?.auctions ?? []).map((a) => (
                <li key={a.id}>
                  <button
                    onClick={() => setSelectedId(a.id)}
                    className={`w-full px-3 py-2 text-left text-sm transition-colors hover:bg-muted/60 ${
                      a.id === selectedId ? "bg-muted" : ""
                    }`}
                  >
                    <span className="block font-medium">{a.name}</span>
                    <span className="block text-[11px] text-muted-foreground">
                      {AUCTION_TYPE_LABELS[a.auction_type]} · {a.auction_date} · {a.status}
                    </span>
                  </button>
                </li>
              ))}
              {(auctions.data?.auctions ?? []).length === 0 && (
                <li className="px-3 py-6 text-center text-xs text-muted-foreground">
                  No auctions yet.
                </li>
              )}
            </ul>
            {isAdmin && (
              <div className="border-t border-border p-2">
                <Button size="sm" className="w-full" onClick={() => setSetupOpen(true)}>
                  New auction
                </Button>
              </div>
            )}
          </div>
        </aside>

        <div className="scroll-panel flex-1 space-y-4 lg:pr-1">
          {!auction && (
            <p className="rounded-lg border border-border bg-card p-6 text-center text-sm text-muted-foreground">
              Select an auction to see its queue and results.
            </p>
          )}

          {auction && (
            <>
              <section className="rounded-lg border border-border bg-card px-3 py-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <h2 className="text-base font-semibold">{auction.name}</h2>
                    <p className="text-xs text-muted-foreground">
                      {AUCTION_TYPE_LABELS[auction.auction_type]} · {auction.auction_date} · rotation
                      cycle {auction.cycle_number} · status {auction.status}
                    </p>
                  </div>
                  {isAdmin && (
                    <div className="flex flex-wrap gap-2">
                      {auction.status === "open" && (
                        <>
                          <Button
                            size="sm"
                            onClick={() =>
                              guard(
                                () => doDistribute({ data: { auctionId: auction.id } }),
                                "Distribution complete",
                              )
                            }
                          >
                            Run distribution
                          </Button>
                          <Button
                            size="sm"
                            variant="secondary"
                            disabled={allocations.length === 0}
                            onClick={() =>
                              guard(
                                () => doFinalize({ data: { auctionId: auction.id } }),
                                "Auction finalized",
                              )
                            }
                          >
                            Finalize
                          </Button>
                        </>
                      )}
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() =>
                          guard(async () => {
                            await doDelete({ data: { id: auction.id } });
                            setSelectedId(null);
                          }, "Auction deleted")
                        }
                      >
                        Delete
                      </Button>
                    </div>
                  )}
                </div>

                <dl className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-4 lg:grid-cols-7">
                  {[
                    ["Tickets", stats.totalTickets],
                    ["Bidders", stats.uniqueBidders],
                    ["Repeat bidders", stats.repeatedBidders],
                    ["Queue slots", stats.totalSlots],
                    ["Allocated", stats.completed],
                    ["Pending", stats.pending],
                    ["Multi-award", stats.multiAllocation],
                  ].map(([label, value]) => (
                    <div key={String(label)} className="rounded-md bg-muted/50 px-2 py-1.5">
                      <dt className="text-[10px] uppercase tracking-wide text-muted-foreground">
                        {label}
                      </dt>
                      <dd className="text-sm font-semibold tabular-nums">{value}</dd>
                    </div>
                  ))}
                </dl>
              </section>

              <QueuePanel
                participants={participants}
                members={members}
                isAdmin={isAdmin}
                locked={locked}
                onReorder={(ids) =>
                  guard(() => doReorder({ data: { auctionId: auction.id, ids } }), "Queue reordered")
                }
                onReshuffle={() =>
                  guard(
                    () => doReshuffle({ data: { auctionId: auction.id } }),
                    "Queue re-randomized",
                  )
                }
                onTickets={(id, tickets) =>
                  guard(
                    () => doUpdateParticipant({ data: { id, auctionId: auction.id, tickets } }),
                    "Tickets updated",
                  )
                }
                onDrop={(id, dropped) =>
                  guard(
                    () => doUpdateParticipant({ data: { id, auctionId: auction.id, dropped } }),
                    dropped ? "Bidder dropped" : "Bidder restored",
                  )
                }
                onReplace={(id, memberId) =>
                  guard(
                    () =>
                      doUpdateParticipant({
                        data: { id, auctionId: auction.id, replacementMemberId: memberId },
                      }),
                    "Bidder replaced",
                  )
                }
                onRemove={(id) => guard(() => doRemoveParticipant({ data: { id } }), "Bidder removed")}
                onAdd={(memberId) =>
                  guard(
                    () =>
                      doAddParticipants({ data: { auctionId: auction.id, memberIds: [memberId] } }),
                    "Bidder added",
                  )
                }
              />

              <section className="rounded-lg border border-border bg-card">
                <header className="border-b border-border px-3 py-2">
                  <h2 className="text-sm font-semibold">Results</h2>
                  <p className="text-xs text-muted-foreground">
                    One rotating pointer walks the queue across every item and wraps when needed.
                  </p>
                </header>

                <div className="divide-y divide-border/60">
                  {checks.map(({ item, slots, filled, allocated, slotsOk, quantityOk }) => (
                    <div key={item.id} className="px-3 py-3">
                      <div className="flex flex-wrap items-center gap-2">
                        <h3 className="text-sm font-semibold">{item.item_name}</h3>
                        <span className="text-xs text-muted-foreground">
                          {item.added_items} added · max {item.max_per_bidder}/bidder ·{" "}
                          {totalBiddersFor(item)} slot(s)
                        </span>
                        <Badge variant={slotsOk ? "secondary" : "destructive"} className="text-[10px]">
                          {filled}/{slots} slots
                        </Badge>
                        <Badge
                          variant={quantityOk ? "secondary" : "destructive"}
                          className="text-[10px]"
                        >
                          {allocated}/{item.added_items} allocated
                        </Badge>
                      </div>

                      <ul className="mt-2 space-y-1">
                        {allocations
                          .filter((a) => a.item_id === item.id)
                          .map((a) => (
                            <AllocationRow
                              key={a.id}
                              allocation={a}
                              isAdmin={isAdmin}
                              finalized={locked}
                              memberNames={members
                                .filter((m) => m.status === "active")
                                .map((m) => m.name)}
                              onQuantity={(quantity) =>
                                guard(
                                  () => doUpdateAllocation({ data: { id: a.id, quantity } }),
                                  "Allocation updated",
                                )
                              }
                              onReplace={(ign) =>
                                guard(
                                  () =>
                                    doSupersede({
                                      data: {
                                        allocationId: a.id,
                                        reason: "reassign",
                                        replacementIgn: ign,
                                      },
                                    }),
                                  "Record superseded — original kept for audit",
                                )
                              }
                            />
                          ))}
                        {allocations.filter((a) => a.item_id === item.id).length === 0 && (
                          <li className="text-xs text-muted-foreground">
                            No allocation yet — run the distribution.
                          </li>
                        )}
                      </ul>
                    </div>
                  ))}
                  {checks.length === 0 && (
                    <p className="px-3 py-6 text-center text-xs text-muted-foreground">
                      No items configured.
                    </p>
                  )}
                </div>
              </section>

              <section className="rounded-lg border border-border bg-card">
                <header className="border-b border-border px-3 py-2">
                  <h2 className="text-sm font-semibold">Audit log</h2>
                </header>
                <ul className="max-h-56 divide-y divide-border/60 overflow-y-auto">
                  {events.map((e) => (
                    <li key={e.id} className="px-3 py-2 text-xs">
                      <span className="font-medium">{e.kind}</span> — {e.detail}
                      <span className="block text-[10px] text-muted-foreground">
                        {new Date(e.created_at).toLocaleString()}
                        {e.actor ? ` · ${e.actor}` : ""}
                      </span>
                    </li>
                  ))}
                  {events.length === 0 && (
                    <li className="px-3 py-4 text-center text-xs text-muted-foreground">
                      Nothing logged yet.
                    </li>
                  )}
                </ul>
              </section>
            </>
          )}
        </div>
      </main>

      <AuctionSetupDialog
        open={setupOpen}
        onOpenChange={setSetupOpen}
        members={members}
        restrictionHours={auctions.data?.restrictionHours ?? 96}
        currentCycle={auctions.data?.currentCycle ?? 1}
        onCreate={(input) =>
          guard(async () => {
            const res = await doCreate({ data: input });
            setSelectedId(res.id);
          }, "Auction created with a randomized queue")
        }
      />
    </div>
  );
}

function AllocationRow({
  allocation,
  isAdmin,
  finalized,
  memberNames,
  onQuantity,
  onReplace,
}: {
  allocation: Allocation;
  isAdmin: boolean;
  finalized: boolean;
  memberNames: string[];
  onQuantity: (quantity: number) => void;
  onReplace: (ign: string) => void;
}) {
  const [replaceWith, setReplaceWith] = useState("");
  const superseded = allocation.status === "superseded";

  return (
    <li className="flex flex-wrap items-center gap-2 rounded-md bg-muted/40 px-2 py-1.5 text-sm">
      <span className={superseded ? "font-medium line-through opacity-60" : "font-medium"}>
        {allocation.ign}
      </span>
      <span className="text-xs text-muted-foreground">x{allocation.quantity}</span>
      {allocation.status === "warning" && (
        <Badge variant="outline" className="text-[10px]">
          Warning
        </Badge>
      )}
      {allocation.status === "error" && (
        <Badge variant="destructive" className="text-[10px]">
          Error
        </Badge>
      )}
      {superseded && (
        <Badge variant="secondary" className="text-[10px]">
          Superseded{allocation.superseded_reason ? ` · ${allocation.superseded_reason}` : ""}
        </Badge>
      )}
      {allocation.flag_note && (
        <span className="text-[11px] text-muted-foreground">{allocation.flag_note}</span>
      )}

      {isAdmin && !superseded && (
        <span className="ml-auto flex items-center gap-1">
          {!finalized && (
            <Input
              type="number"
              min={0}
              value={allocation.quantity}
              onChange={(e) => onQuantity(Math.max(0, Number(e.target.value) || 0))}
              className="h-7 w-16 text-xs"
              aria-label={`Quantity for ${allocation.ign}`}
            />
          )}
          <Input
            list="roster-names"
            value={replaceWith}
            onChange={(e) => setReplaceWith(e.target.value)}
            placeholder="Replace with…"
            className="h-7 w-40 text-xs"
          />
          <datalist id="roster-names">
            {memberNames.map((n) => (
              <option key={n} value={n} />
            ))}
          </datalist>
          <Button
            size="sm"
            variant="ghost"
            className="h-7 text-xs"
            disabled={!replaceWith.trim()}
            onClick={() => {
              onReplace(replaceWith.trim());
              setReplaceWith("");
            }}
          >
            Apply
          </Button>
        </span>
      )}
    </li>
  );
}
