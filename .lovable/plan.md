# BAI Guild — Roster & Party Builder

A single-page guild tool: roster sidebar on the left, two raid party boards on the right (8 teams x 5 slots each). One admin account can edit; everyone else can view.

## Screens

Single page at `/`:

```text
+---------------------------+---------------------------------------------+
| Guild Roster              |  ELITE BATTLEFIELD RAID PARTY  (green bar)  |
| N members · M unassigned  |  [Team 1 3/5][Team 2 0/5] ... [Team 8]      |
| search | class | sort     |                                             |
| [ ] include in-party      |  SUB-BATTLEFIELD RAID PARTY    (green bar)  |
| + add / bulk / upload     |  [Team 1 5/5][Team 2 ...] ... [Team 8]      |
| member rows (draggable)   |                                             |
+---------------------------+---------------------------------------------+
```

Header: guild title + `Sign in` / `Sign out`. Sign-in is a small dialog taking username + password.

## Access model

- Fixed admin: username `adminbai`, password `bainabai123`. The username maps to an internal email; no signup screen.
- Guests see roster + boards read-only. All add/delete/drag affordances hidden, and the backend rejects non-admin writes.

## Roster sidebar

- Live count, search by name or class, "All classes" filter, sort by name or class.
- "Include members already in a party" checkbox; assigned members are marked and hidden by default.
- Admin: per-row delete, multi-select "Delete selected", rows draggable. Empty state "No members match."

## Adding members (admin)

- Single add: name + class dropdown.
- Bulk paste: `Name, Class` per line or names only; preview list, case-insensitive class matching, inline class dropdown for missing/unknown classes, duplicates flagged.
- Excel/CSV upload (`.xlsx`, `.xls`, `.csv`): first two columns as name/class, header row auto-detected, same preview + fix step.

## Party boards

- Two sections, 8 teams, 5 slots, `n/5` counters.
- Drag roster → empty slot, slot → slot to move, slot → roster or slot remove control to unassign.
- One slot per member enforced in the database. Assignments persist and are visible to guests (drag disabled).

## Job classes

Lord Knight, Paladin, Sniper, Minstrel, Gypsy, High Priest, Champion, Whitesmith, Biochemist, High Wizard, Professor, Doram, Gunslinger, Stalker, Assassin Cross.

## Technical notes

- Enable Lovable Cloud for auth + storage.
- Migration: `job_class` enum (15 values); `members(id, name, job_class, created_at)`; `party_assignments(id, section, team_index, slot_index, member_id)` with unique `(section, team_index, slot_index)` and unique `member_id`; `app_role` enum + `user_roles` + `has_role()` security-definer function. Explicit GRANTs; RLS with public SELECT (`anon`, `authenticated`) and admin-only INSERT/UPDATE/DELETE via `has_role(auth.uid(), 'admin')`.
- Same migration seeds the admin auth user with a confirmed internal email derived from the username and inserts its `admin` role row. Email-based password reset will not be available for this account.
- Data access through `createServerFn`: public read fns (publishable-key server client) for roster + assignments; `requireSupabaseAuth` mutations that re-check the admin role before writing. Loaded via TanStack Query, invalidated after each mutation.
- Drag and drop with `@dnd-kit/core` (roster draggables + slot droppables + roster droppable for unassign).
- `xlsx` parsed in the browser; only parsed rows sent to the server.
- Screenshot palette (bright green section bars, dark green team headers, white cards, light background) added as semantic tokens in `src/styles.css` — no hardcoded color utilities.
- Route `head()` with app-specific title/description/OG tags replacing the placeholder index.
