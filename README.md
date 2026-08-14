# Guild Party Planner

# BAI Guild — Roster & Party Builder

A single-page guild tool matching the reference screenshot: left sidebar roster, right side two raid sections ("Elite Battlefield Raid Party" and "Sub-Battlefield Raid Party"), each with 8 teams of 5 slots. Green/dark-green header bars, light background, compact type.

## Access model

- One admin login, fixed credentials: username `adminbai`, password `bainabai123`. Sign-in is username-based (mapped internally to a fixed account), and the account is created once on the backend — no signup screen.
- Guests (not logged in) see the full roster and party boards but cannot add, delete, or move anyone. Edit controls are hidden and the backend rejects writes from non-admins.
- Header shows "Sign out" when logged in, "Sign in" otherwise, matching the screenshot.

## Job classes

Lord Knight, Paladin, Sniper, Minstrel, Gypsy, High Priest, Champion, Whitesmith, Biochemist, High Wizard, Professor, Doram, Gunslinger, Stalker, Assassin Cross

## Roster sidebar (admin + guest)

- Header: "Guild Roster" with live count "N members · M unassigned".
- Search by name or class, "All classes" filter dropdown, "Sort: Name" dropdown (name / class).
- Checkbox "Include members already in a party".
- Member rows show name + class; admin rows have a delete button and are draggable.
- Empty state: "No members match."

## Adding members (admin only)

- **Single add**: name field + class dropdown + Add.
- **Bulk paste**: textarea accepting `Name, Class` per line or names only. Preview list before saving; rows missing or with an unrecognized class get an inline class dropdown to fix. Case-insensitive class matching; duplicates flagged.
- **Excel/CSV upload**: `.xlsx`, `.xls`, `.csv`. First two columns read as name and class, header row auto-detected. Same preview + fix step.
- **Delete**: per-row delete, plus multi-select "Delete selected".

## Party boards (admin only for editing)

- Two sections, 8 teams each, 5 slots per team, with `n/5` counters in each team header.
- Drag a member from the roster into any empty slot; drag between slots to move; drag back to the roster (or click the slot's remove control) to unassign.
- A member can occupy only one slot at a time; the roster marks assigned members and hides them unless "Include members already in a party" is checked.
- Assignments persist for everyone; guests see the same boards but drag is disabled.

## Technical notes

- Lovable Cloud enabled for storage and auth.
- Tables: `members` (name, job_class enum of the 15 classes) and party assignments (section, team index, slot index, member id) with a uniqueness constraint per slot and per member. RLS: public SELECT for everyone; INSERT/UPDATE/DELETE restricted to the admin role via a `user_roles` table + `has_role()` security-definer function. Explicit grants included.
- Admin account seeded in a migration with a fixed internal email derived from the username, email auto-confirm enabled so the account works without a mailbox; the `admin` role row is inserted for it. Password reset by email will not be available.
- Sign-in form takes the username, maps it to the internal email, and calls password sign-in. Session drives the header and all edit affordances.
- Reads/writes via TanStack `createServerFn`; roster and assignments loaded through TanStack Query and invalidated after each mutation.
- Drag and drop with `@dnd-kit` (roster list + slot droppables).
- Excel parsing with `xlsx` in the browser; only parsed rows are sent to the server.
- Colors from the screenshot (bright green section bars, dark green team headers, white cards) defined as semantic tokens in `src/styles.css`.

This project was built with [Lovable](https://lovable.dev).

## Build with Lovable

Continue developing this project in the [Lovable editor](https://lovable.dev/projects/78561996-de2a-418b-83ac-d0cc303d519d).

- **Ship faster**: describe what you want to build and Lovable handles the code.
- **Stay in sync**: every change made in Lovable is committed straight to this repository.
- **Full ownership**: this code is yours. Push to `main` on GitHub and your changes sync back into Lovable, ready for your next prompt.

## Development

Prefer working locally? You need Node.js and npm — [install with nvm](https://github.com/nvm-sh/nvm#installing-and-updating).

```sh
git clone <this-repository-url>
cd <repository-name>
npm i
npm run dev
```
