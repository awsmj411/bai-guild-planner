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

export const SECTIONS = [
  { key: "elite", label: "Elite Battlefield Raid Party" },
  { key: "sub", label: "Sub-Battlefield Raid Party" },
] as const;

export type SectionKey = (typeof SECTIONS)[number]["key"];

export const TEAM_COUNT = 8;
export const SLOT_COUNT = 5;

export const ADMIN_USERNAME = "adminbai";
export const ADMIN_EMAIL = `${ADMIN_USERNAME}@bai-guild.local`;

export type Member = { id: string; name: string; job_class: JobClass };
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
