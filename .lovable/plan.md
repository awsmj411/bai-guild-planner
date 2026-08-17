# Guild Bidding + Roster & Raid Builder upgrade

Fitting the uploaded spec onto the existing app, with two adjustments you confirmed:

- **Access stays as it is today**: anyone can view roster, parties, bidding and results read-only; only the `adminbai` login can edit. No sign-in wall, no member accounts. The spec's "Member (read-only logged in)" role maps to plain visitors, and the "Admin" badge is unnecessary since there is one admin.
- **Delivery in two phases.** Phase 1 lands roster/removal/raid fixes; Phase 2 lands the bidding engine.

Roster order becomes the default ordering everywhere (bidding turn order comes from it); the sort dropdown becomes a temporary view that does not change stored order.

---

## Phase 1 — Roster, removal workflow, raid builder fixes

### Roster editing
- Each member gains: **Join Date** (optional), **Status** (Active / Removed), **Removal Reason**, **Removal Date**, **stored position at removal**, and **restriction-lifted** flag.
- Admin-only Edit dialog on every row: IGN, class, Join Date, Status.
- Header note: "Member order determines bidding turn order."

### Manual ordering
- Admin drag-and-drop reordering of the roster list itself, persisted. Custom order is the default view; Name/Class A–Z / Z–A remain as non-destructive sort views (drag disabled while a sort view is active, to avoid ambiguous drops).

### Removal & re-entry
- Setting Status to Removed opens a confirmation requiring one of exactly four reasons: **Rejoin, Reassign, Rejected, MIA** (no free text). Removal date and current position are saved.
- Removed members are never deleted — they move to a **Removed** tab, greyed out, history intact.
- Reactivation applies the rule automatically:
  - Rejoin / Rejected / MIA → bottom of roster, Join Date reset to reactivation date, new-member restriction re-arms.
  - Reassign → restored to the exact stored position, Join Date untouched, restriction stays lifted if already lifted.

### New-member restriction
- Guild-wide setting **New Member Restriction Period**, default **96 hours**, admin-editable.
- Applied only to Guild League and Emperium Overrun auctions. Once `auction date − Join Date >= period`, the member is permanently marked lifted and never re-checked. Blank Join Date = always eligible.

### Raid Party Builder fixes
- Remove the fixed-height/inner-scroll team boxes; teams stack in one naturally scrolling page (responsive grid, no nested scroll areas).
- Auto-scroll while dragging near the viewport top/bottom edge.
- Roster panel stays sticky while scrolling the teams.
- Drag remains admin-only.

---

## Phase 2 — Guild Bidding

New **Bidding** nav item alongside Guild Roster and Raid Parties.

### Auction setup
- Auction Type: Guild League, Emperium Overrun, Standard (extensible). Only the first two apply the tenure gate.
- Item table, admin-editable rows, seeded with: Purple Fragment 4/1, Gold Fragment 2/1, L&D 51/3, T&S 85/5. **Total Bidders = ceil(Added Items / Max Per Bidder)**, recalculated live.

### Bidder list (roster-driven)
- Admins tick participating roster members; the queue is always built by walking the roster top-to-bottom and expanding each participant by their **Tickets** count (default 1). No manual bidder reordering.
- Under Guild League / Emperium Overrun, members still restricted are shown, labelled "Not yet eligible (new member)" with their eligible-as-of date, and cannot be selected.
- Fallback: paste IGNs not in the roster → unlinked bidder flagged for reconciliation, appended after all roster tickets; adopts a roster position once linked.
- Derived counters: total records, unique bidders, repeated bidders.

### Distribution engine
- **One rotating pointer** advancing continuously across items — it does not reset per item; wraps around when the queue is shorter than remaining slots.
- Per record: IGN, item, allocation `min(Max Per Bidder, remaining)`, status, and that bidder's total record count in the auction.
- Validation flags VALID / WARNING (unknown bidder, zero allocation) / ERROR (exceeds max), plus item-level checks (slots filled, allocated total vs added items). Flagged records are never auto-deleted.

### Final bidders, summary, history, dashboard
- Final Bidders: editable review table seeded from the engine; finalizing locks records and snapshots to history.
- Summary View: read-only, grouped by item, presentation-friendly, visible to everyone.
- Auction History: finalized auctions with date and counts; admins can view, delete, amend; visitors view only.
- Dashboard strip: auction date, initial bidders, unique bidders, total slots, slots per item, completed vs pending, bidders with >1 allocation.

### Auto-replace when a member is removed
- **Pre-finalization**: drop their remaining tickets, auto-pull the next eligible members in roster/queue order (skipping restricted and removed), re-run assignment, and show an auto-replacement notice for admin review.
- **Post-finalization**: never edit or delete the finalized record — mark it **Superseded** (original IGN, item, allocation, removal reason, timestamp, acting admin), continue that item's queue from after its last used ticket, and insert the replacement as a new record linked to the superseded one as a before/after pair. Auction is marked **Amended** with a changelog; Summary shows "amended on `<date>`". Everyone sees the pair; only admins can trigger it.

### Live updates
- Results, allocations and amendments sync live to all open viewers via database realtime, so members watching see changes as admins make them.

---

## Technical notes

- **Migration (Phase 1)**: `members` gains `sort_order int`, `join_date date null`, `status` enum (`active`/`removed`), `removal_reason` enum (`rejoin`/`reassign`/`rejected`/`mia`), `removed_at`, `position_at_removal`, `restriction_lifted_at`. New `guild_settings` single-row table for the restriction period. Public SELECT preserved; writes admin-only via `has_role`; GRANTs included.
- **Migration (Phase 2)**: `auctions` (type, date, status finalized/amended), `auction_items`, `auction_participants` (member ref or unlinked IGN + tickets), `allocations` (item, bidder, quantity, status, superseded_by / supersedes, flags), `auction_events` changelog. Same RLS shape. Realtime enabled on allocations/auctions.
- **Server functions** in `src/lib/guild.functions.ts` and a new `src/lib/bidding.functions.ts`, all writes behind `requireSupabaseAuth` + `assertAdmin`. Distribution logic lives in a pure, unit-testable module so the pointer/wrap behaviour can be verified.
- **Routes**: split the current single page into `/` (roster + raid parties, as today) and `/bidding`, with a shared header nav; each route gets its own head metadata.
- **DnD**: reuse `@dnd-kit` with `autoScroll` enabled and a sortable list for roster ordering; existing dark theme, job colors and card styling reused throughout so bidding looks native.
