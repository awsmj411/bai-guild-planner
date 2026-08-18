export const JOB_CLASSES = [
  "Lord Knight",
  "Paladin",
  "Sniper",
  "Minstrel",
  "Gypsy",
  "High Priest",
  "Champion",
  "Whitesmith",
  "Biochemist",
  "High Wizard",
  "Professor",
  "Doram",
  "Gunslinger",
  "Stalker",
  "Assassin Cross",
] as const;

export type JobClass = (typeof JOB_CLASSES)[number];

export const FIRST_JOBS = [
  "Swordsman",
  "Thief",
  "Merchant",
  "Archer",
  "Magician",
  "Acolyte",
  "Doram",
  "Gunslinger",
] as const;

export type FirstJob = (typeof FIRST_JOBS)[number];

export const SECOND_TO_FIRST: Record<JobClass, FirstJob> = {
  "Lord Knight": "Swordsman",
  Paladin: "Swordsman",
  "Assassin Cross": "Thief",
  Stalker: "Thief",
  Whitesmith: "Merchant",
  Biochemist: "Merchant",
  Sniper: "Archer",
  Gypsy: "Archer",
  Minstrel: "Archer",
  "High Wizard": "Magician",
  Professor: "Magician",
  "High Priest": "Acolyte",
  Champion: "Acolyte",
  Doram: "Doram",
  Gunslinger: "Gunslinger",
};

export function firstJobOf(jobClass: JobClass): FirstJob {
  return SECOND_TO_FIRST[jobClass] ?? "Swordsman";
}

/** Tailwind-safe token slug used for the --job-* color tokens. */
export function jobToken(jobClass: JobClass): string {
  return firstJobOf(jobClass).toLowerCase();
}


export const SECTIONS = [
  { key: "elite", label: "Elite Battlefield Raid Party" },
  { key: "sub", label: "Sub-Battlefield Raid Party" },
] as const;

export type SectionKey = (typeof SECTIONS)[number]["key"];

export const TEAM_COUNT = 8;
export const SLOT_COUNT = 5;

export const ADMIN_USERNAME = "adminbai";
export const ADMIN_EMAIL = `${ADMIN_USERNAME}@bai-guild.local`;

export type MemberStatus = "active" | "removed";
export const REMOVAL_REASONS = [
  "rejoin",
  "reassign",
  "rejected",
  "mia",
  "expelled_left",
] as const;
export type RemovalReason = (typeof REMOVAL_REASONS)[number];

export const REMOVAL_REASON_LABELS: Record<RemovalReason, string> = {
  rejoin: "Rejoin",
  reassign: "Reassign",
  rejected: "Rejected to bid",
  mia: "MIA",
  expelled_left: "Expelled / Left",
};

export const REMOVAL_REASON_RULES: Record<RemovalReason, string> = {
  rejoin: "On return: bottom of roster, join date reset (tenure restarts), bidding cycle standing cleared.",
  reassign: "On return: restored to previous roster position, join date unchanged, bidding cycle standing kept.",
  rejected: "On return: bottom of roster, join date reset (tenure restarts), bidding cycle standing cleared.",
  mia: "On return: bottom of roster, join date reset (tenure restarts), bidding cycle standing cleared.",
  expelled_left:
    "On return: bottom of roster, join date reset (tenure restarts), bidding cycle standing cleared.",
};

/** Reasons whose re-entry rule resets position, join date and cycle standing. */
export function isResetReason(reason: RemovalReason): boolean {
  return reason !== "reassign";
}

export type Member = {
  id: string;
  name: string;
  job_class: JobClass;
  sort_order: number;
  join_date: string | null;
  status: MemberStatus;
  removal_reason: RemovalReason | null;
  removed_at: string | null;
  position_at_removal: number | null;
  restriction_lifted_at: string | null;
  cycle_bid_at: string | null;
  cycle_bid_number: number | null;
};

export type GuildSettings = {
  new_member_restriction_hours: number;
  current_cycle: number;
};

/** Auction types that apply the new-member restriction gate. */
export const TENURE_GATED_AUCTIONS = ["guild_league", "emperium_overrun"] as const;

/** Date at which a member's new-member restriction lifts, or null when never gated. */
export function restrictionLiftsAt(member: Member, hours: number): Date | null {
  if (member.restriction_lifted_at) return null;
  if (!member.join_date) return null;
  return new Date(new Date(member.join_date).getTime() + hours * 3_600_000);
}

/** True when the member may join a tenure-gated auction at `at`. */
export function isTenureEligible(member: Member, hours: number, at: Date = new Date()): boolean {
  const lifts = restrictionLiftsAt(member, hours);
  return !lifts || at.getTime() >= lifts.getTime();
}

/** True when the member has already bid in the guild's current fair-rotation cycle. */
export function hasBidThisCycle(member: Member, currentCycle: number): boolean {
  return member.cycle_bid_number != null && member.cycle_bid_number === currentCycle;
}

export function formatJoinDate(value: string | null): string {
  if (!value) return "—";
  const d = new Date(value);
  return d.toLocaleString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export type Assignment = {
  id: string;
  section: SectionKey;
  team_index: number;
  slot_index: number;
  member_id: string;
};


export function matchJobClass(raw: string | undefined | null): JobClass | null {
  if (!raw) return null;
  const normalized = raw.trim().toLowerCase().replace(/\s+/g, " ");
  return JOB_CLASSES.find((c) => c.toLowerCase() === normalized) ?? null;
}

export type ParsedRow = { name: string; job_class: JobClass | null };

export function parsePastedRows(text: string): ParsedRow[] {
  return text
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => {
      const parts = line.split(/[,;\t]/);
      const name = (parts[0] ?? "").trim();
      const job_class = matchJobClass(parts[1]);
      return { name, job_class };
    })
    .filter((row) => row.name.length > 0);
}
