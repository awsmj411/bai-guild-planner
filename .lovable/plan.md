# Match the theme to the BAI logo

Retune the app's greens to the logo's exact palette and put the logo itself in the header.

## Palette from the logo

- Lime green (logo face): `#8FBF23`-family — becomes the bright section-bar green and primary accent.
- Dark forest green (logo shadow/outline): `#1B5E20`-family — becomes the dark team-header green, app header, and hover states.
- Cream (logo highlight): `#F7FBE0`-family — used for text on dark green bars and as a soft page background tint.

All values written as `oklch` tokens in `src/styles.css`, replacing the current
approximate greens (`--guild-bar`, `--guild-team`, `--guild-slot*`,
`--guild-surface`, `--primary`, plus a cream-tinted `--background`, `--muted`,
and `--border` so the whole page reads as one palette rather than green bars on
plain grey).

## Logo in the UI

- Upload the logo to CDN asset storage and render it in the header at ~32px height, replacing the plain "BAI Guild" text mark with logo + "Guild Roster & Raid Parties" subtitle.
- Generate a matching square favicon from the logo (the wordmark is wide, so it gets padded, not stretched) and point the root route at it.

## Scope

Styling only — roster, party boards, sign-in, and all server logic stay exactly as they are.

## Technical notes

- Tokens edited in `src/styles.css` (`:root` and the guild token block); dark-mode block gets matching values so contrast holds.
- Header markup change in `src/routes/index.tsx`; favicon link in `src/routes/__root.tsx`.
- Logo stored as a `.asset.json` pointer under `src/assets/`; favicon as a real file in `public/`.
