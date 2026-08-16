# Dark theme, smoother dragging, class colors

## Dark, elegant theme

Make dark the app's only theme (no toggle): deep charcoal-green background, layered surfaces, softer borders, subtle shadows and rounded corners, smooth hover/transition on every interactive element. Section bars keep the logo's lime as an accent on a dark base; team headers use a deeper green. Keeps the BAI logo header.

## Easier dragging

Whole tiles become the drag handle:

- Roster rows: dragging anywhere on the row works (not just the grip icon); the grip stays as a visual hint. Checkbox and delete button stay clickable.
- Filled party slots: already draggable; increase the grab area, keep the remove button unaffected.
- Slightly larger slot height, clearer drop highlight on the hovered slot, and a floating drag preview of the member card following the cursor.

## Centered section titles

"Elite Battlefield Raid Party" and "Sub-Battlefield Raid Party" bars get centered text.

## Sorting options

Replace the two-option sort with: Name A–Z, Name Z–A, Class A–Z, Class Z–A.

## First-job color coding

Each member card (roster rows and party slots) gets a colored left border and tinted background plus a small first-job label, mapped from second job:

```text
Swordsman  <- Lord Knight, Paladin
Thief      <- Assassin Cross, Stalker
Merchant   <- Whitesmith, Biochemist
Archer     <- Sniper, Gypsy, Minstrel
Magician   <- High Wizard, Professor
Acolyte    <- High Priest, Champion
Doram      <- Doram
Gunslinger <- Gunslinger
```

Eight distinct hues, tuned for dark backgrounds. The roster class filter also gains first-job grouping so you can filter by, e.g., all Archers.

## Technical notes

- `src/styles.css`: dark values applied at `:root` (dark-only), plus `--job-<firstclass>` tokens registered in `@theme inline`.
- `src/lib/guild.ts`: add `FIRST_JOBS`, `SECOND_TO_FIRST` map, and a helper returning the first job for a class.
- `src/components/guild/RosterSidebar.tsx`: full-row draggable listeners, four sort modes, first-job filter options, class-colored rows.
- `src/components/guild/PartyBoard.tsx`: centered section header, class-colored filled slots, larger drop targets.
- `src/routes/index.tsx`: add `DragOverlay` for the drag preview; no backend or data-model changes.
