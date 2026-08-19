# Share-ready bid grid, light/dark toggle, contained scrolling

## Bidder assignment grid (new share view)

The results section gains a spreadsheet-style grid that mirrors the game UI you shared:

```text
| Bidders | Page 1 | Page 2 | Page 3 | ... |
| Row 1   | Vyrr   | Meck   | kaite  |     |
| Row 2   | Sudeki | Hidden | kaite  |     |
| Row 3   | Macky  | Meck   | kaite  |     |
| Row 4   | Meaty  | Meck   | Yvonx  |     |
```

- Every allocated slot for an item is laid out in order, filled top-to-bottom, 4 rows per page column, wrapping into Page 1, 2, 3 ... as needed.
- The table is chunked into blocks of 10 pages stacked vertically, exactly like the screenshot, each block with its own dark header row.
- Alternating soft tint bands per page block for readability (no class colors here — purely grouping).
- One grid per item, with the item name, slot count and quantity checks above it.
- Admins can click any cell to swap the bidder in that slot from a roster picker; guests see it read-only. Swaps go through the existing audited allocation update path.
- Horizontal scroll inside each block so long auctions never stretch the page.

## Navigation and theme

- Tab label "Roster & Parties" becomes "Guild Roster".
- Smoother tab switching: animated sliding pill indicator on the active nav item plus a short fade/slide transition on route content, and the previously selected auction/tab state is preserved so switching feels instant.
- New light/dark toggle in the header. Light is the default; the choice persists per browser and applies without a flash on load. Full light palette built from the BAI lime/forest identity so both modes look intentional.

## Contained scrolling (no more long page)

Each panel scrolls inside itself instead of growing the page:

- The app shell fills the viewport height; only panels scroll.
- Roster sidebar, party board sections, auction list, bidder queue, results and audit log each get their own capped-height scroll area with sticky headers.
- Drag and drop stays comfortable: auto-scroll while dragging near a panel edge, drop targets stay visible, and the drag preview follows the cursor as it does today.

## Technical notes

- `src/styles.css`: add a light `:root` palette and move current dark values into `.dark`; keep `@custom-variant dark` and job tokens available to both.
- New `src/components/ThemeToggle.tsx` + a small theme provider writing `localStorage` and toggling the `dark` class, with an inline script in `src/routes/__root.tsx` to avoid a flash.
- New `src/components/bidding/AllocationGrid.tsx` renders the page/row matrix from existing `allocations` (ordered by `queue_index`), expanding each allocation into `quantity`-aware slot cells; cell edits call the existing `supersedeAllocation` / `updateAllocation` server functions. No schema change.
- `src/routes/bidding.tsx` and `src/routes/index.tsx`: switch to a viewport-height flex shell with `min-h-0` + `overflow-y-auto` panels; `GuildHeader.tsx` gets the renamed nav item, animated indicator and the theme toggle.
