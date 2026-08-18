# Guild Bidding — Phase 2 (with fair rotation)

Phase 1 (roster editing, join date, drag-reorder, removal/re-entry, tenure setting, raid builder fixes) is already live, and the bidding tables exist. This plan builds the Bidding feature itself and applies four decisions that differ from the spec:

- **Access stays public read-only.** Anyone can view roster, parties, bidding and results; only the `adminbai` login can edit. No sign-in wall, no member accounts, no Admin badge.
- **Queue order is randomized once, then editable.** The participant queue is shuffled when the auction is created, stored, and shown as a numbered list. It never re-shuffles on its own, but admins can drag/swap or replace an entry for unforeseen events (absence, replacement).
- **Fair-rotation cycle counts only participants.** A member enters cycle tracking once they've actually been selected in a finalized auction. A member who was superseded/replaced does **not** get counted as having bid.
- **Join Date becomes date + time** so the 96-hour gate is hour-accurate.

---

## Roster additions (small)

- Join Date field gains a time input; existing dates read as 00:00 that day.
- Fifth removal reason added: **Expelled/Left** (RESET rule — bottom of roster, join date reset, tenure restarts), alongside Rejoin, Reassign, Rejected, MIA.

## Bidding page

New **Bidding** nav item next to Guild Roster / Raid Parties, same dark theme, job colors and card styling.

### Auction setup
- Auction Type: Guild League, Emperium Overrun, Standard. Only the first two apply the new-member tenure gate.
- Item table, admin-editable, seeded with Purple Fragment 4/1, Gold Fragment 2/1, L&D 51/3, T&S 85/5. **Total Bidders = ceil(Added Items / Max Per Bidder)**, live-recalculated.

### Participant selection
Admin ticks active roster members. Each row shows why someone can't be picked:
- "Not yet eligible (new member)" + eligible-as-of timestamp — only for Guild League / Emperium Overrun, only when Join Date is set. Blank Join Date = always eligible.
- "Already bid this cycle — waiting for full rotation" — any auction type.
- Both reasons can apply at once; either blocks selection.

Tickets per participant (default 1) give extra turns. Fallback: paste IGNs not in the roster as unlinked bidders flagged for reconciliation, appended at the end of the queue.

### Randomized queue
- On create, the selected participants (expanded by tickets) are shuffled into a stored queue with fixed positions, displayed as a numbered turn order with a "Reshuffle" action available before distribution runs.
- Admin edits allowed at any time before finalizing: swap two positions, drag a row, or replace an entry with another eligible member. Every edit is logged to the auction changelog.

### Distribution engine
- **One rotating pointer** advancing continuously across items — it does not reset per item and wraps when the queue is shorter than the remaining slots.
- Per record: IGN, item, allocation `min(Max Per Bidder, remaining)`, status, and that bidder's total record count for the auction.
- Flags VALID / WARNING (unknown bidder, zero allocation) / ERROR (exceeds max), plus item-level checks (slots filled, allocated vs added). Flagged records are never auto-deleted.

### Final bidders, summary, history, dashboard
- **Final Bidders**: editable review table seeded from the engine; finalizing locks records, snapshots history, and marks each participating member as having bid this cycle.
- **Summary View**: read-only, grouped by item, presentation-friendly, visible to everyone.
- **Auction History**: finalized auctions with date and counts; admins view/delete/amend, visitors view only.
- **Dashboard strip**: auction date, initial bidders, unique bidders, total slots, slots per item, completed vs pending, bidders with >1 allocation, and cycle progress ("14 / 22 participants have bid this cycle").

### Cycle completion
Once every cycle-tracked member has bid, all flags clear and a new cycle starts. Members returning from Removed with Rejoin / Rejected / MIA / Expelled-Left are exempt and immediately selectable; Reassign keeps its previous flag.

## Auto-replace when a member is removed

- **Pre-finalization**: drop their remaining queue positions, auto-pull the next eligible member (skipping restricted and removed), re-run assignment, and show an auto-replacement notice for admin review.
- **Post-finalization**: the original record is never edited or deleted — it's marked **Superseded** (original IGN, item, allocation, removal reason, timestamp, acting admin), the item's queue continues from after its last used ticket, and the replacement is inserted as a linked record shown as a before/after pair. The auction becomes **Amended** with a changelog, Summary shows "amended on `<date>`", and the superseded member keeps their cycle flag cleared so the swap doesn't consume their turn.

## Live updates

Allocations, amendments and results sync live to all open viewers, so members watching see changes as admins make them.

---

## Technical notes

- **Migration**: `members.join_date` → `timestamptz`; `removal_reason` enum gains `expelled_left`; `members` gains `has_bid_cycle boolean` and `cycle_bid_at timestamptz`. `auction_participants` gains `queue_position int` for the stored shuffled order; `auctions` gains `cycle_id`/`queue_locked`. Public SELECT preserved, writes admin-only via `has_role`, GRANTs included.
- **New files**: `src/lib/bidding.ts` (pure distribution + queue + cycle logic, unit-testable), `src/lib/bidding.functions.ts` (all writes behind `requireSupabaseAuth` + admin check), `src/routes/bidding.tsx`, and components under `src/components/bidding/`.
- **Routes**: `/` keeps roster + raid parties; `/bidding` is new. Shared header nav with per-route head metadata.
- **Randomization** happens server-side and is persisted, so every viewer sees the same order and the shuffle can't be re-rolled by a page refresh.
