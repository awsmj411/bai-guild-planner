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

- One continuous grid for the whole auction: every allocated slot, item by item in setup order, fills top-to-bottom 4 rows per page column, wrapping into Page 1, 2, 3 ... as needed. A page can therefore hold rows from two different items (e.g. Rows 1-2 Puppet Fragment, Rows 3-4 Light & Dark Feathers), exactly like your sheet.
- Each cell is tinted by the item being bid on, and every item keeps that one color everywhere it appears in the grid (Puppet Fragment purple, Light & Dark Feathers light yellow, etc.). Colors are assigned per item from a fixed distinct palette; a legend above the grid maps color to item name so members reading the share view know what each block is for.
- The table is chunked into blocks of 10 pages stacked vertically, exactly like the screenshot, each block with its own dark header row.
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
