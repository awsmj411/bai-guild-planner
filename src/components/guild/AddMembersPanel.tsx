import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { JOB_CLASSES, matchJobClass, parsePastedRows, type JobClass, type ParsedRow } from "@/lib/guild";
import { toast } from "sonner";
import { X } from "lucide-react";

type Props = {
  existingNames: string[];
  onSubmit: (rows: { name: string; job_class: JobClass }[]) => Promise<void>;
};

export function AddMembersPanel({ existingNames, onSubmit }: Props) {
  const [name, setName] = useState("");
  const [jobClass, setJobClass] = useState<JobClass>(JOB_CLASSES[0]);
  const [pasted, setPasted] = useState("");
  const [preview, setPreview] = useState<ParsedRow[] | null>(null);
  const [busy, setBusy] = useState(false);

  const lowerExisting = new Set(existingNames.map((n) => n.toLowerCase()));

  async function addSingle() {
    if (!name.trim()) return;
    setBusy(true);
    try {
      await onSubmit([{ name: name.trim(), job_class: jobClass }]);
      setName("");
    } finally {
      setBusy(false);
    }
  }

  async function saveFile(file: File) {
    const XLSX = await import("xlsx");
    const buffer = await file.arrayBuffer();
    const wb = XLSX.read(buffer, { type: "array" });
    const sheetName = wb.SheetNames[0];
    if (!sheetName) return;
    const sheet = wb.Sheets[sheetName];
    if (!sheet) return;
    const rows = XLSX.utils.sheet_to_json<unknown[]>(sheet, { header: 1, blankrows: false });
    const parsed: ParsedRow[] = [];
    rows.forEach((row, index) => {
      const rawName = String(row?.[0] ?? "").trim();
      const rawClass = String(row?.[1] ?? "").trim();
      if (!rawName) return;
      const isHeader =
        index === 0 && /^(name|member|character)$/i.test(rawName) && !matchJobClass(rawClass);
      if (isHeader) return;
      parsed.push({ name: rawName, job_class: matchJobClass(rawClass) });
    });
    if (parsed.length === 0) {
      toast.error("No rows found in that file.");
      return;
    }
    setPreview(parsed);
  }

  async function commitPreview() {
    if (!preview) return;
    const missing = preview.filter((r) => !r.job_class);
    if (missing.length > 0) {
      toast.error("Pick a class for every row first.");
      return;
    }
    setBusy(true);
    try {
      await onSubmit(preview.map((r) => ({ name: r.name, job_class: r.job_class as JobClass })));
      setPreview(null);
      setPasted("");
    } finally {
      setBusy(false);
    }
  }

  if (preview) {
    return (
      <div className="space-y-2 rounded-md border border-border bg-guild-surface p-3">
        <div className="flex items-center justify-between">
          <p className="text-sm font-semibold">Preview · {preview.length} rows</p>
          <Button variant="ghost" size="sm" onClick={() => setPreview(null)}>
            Cancel
          </Button>
        </div>
        <ul className="max-h-64 space-y-1 overflow-y-auto">
          {preview.map((row, i) => {
            const dupe = lowerExisting.has(row.name.toLowerCase());
            return (
              <li key={`${row.name}-${i}`} className="flex items-center gap-2 text-sm">
                <span className="flex-1 truncate">
                  {row.name}
                  {dupe && <span className="ml-1 text-xs text-destructive">duplicate</span>}
                </span>
                {row.job_class ? (
                  <span className="text-xs text-muted-foreground">{row.job_class}</span>
                ) : (
                  <Select
                    value=""
                    onValueChange={(v) =>
                      setPreview((prev) =>
                        (prev ?? []).map((r, idx) => (idx === i ? { ...r, job_class: v as JobClass } : r)),
                      )
                    }
                  >
                    <SelectTrigger className="h-7 w-36 text-xs">
                      <SelectValue placeholder="Pick class" />
                    </SelectTrigger>
                    <SelectContent>
                      {JOB_CLASSES.map((c) => (
                        <SelectItem key={c} value={c}>
                          {c}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
                <button
                  type="button"
                  aria-label={`Remove ${row.name}`}
                  className="text-muted-foreground hover:text-destructive"
                  onClick={() => setPreview((prev) => (prev ?? []).filter((_, idx) => idx !== i))}
                >
                  <X className="size-3.5" />
                </button>
              </li>
            );
          })}
        </ul>
        <Button size="sm" className="w-full" disabled={busy} onClick={commitPreview}>
          Save {preview.length} members
        </Button>
      </div>
    );
  }

  return (
    <Tabs defaultValue="single" className="rounded-md border border-border bg-guild-surface p-2">
      <TabsList className="grid w-full grid-cols-3">
        <TabsTrigger value="single">Add</TabsTrigger>
        <TabsTrigger value="paste">Paste</TabsTrigger>
        <TabsTrigger value="file">Upload</TabsTrigger>
      </TabsList>

      <TabsContent value="single" className="space-y-2 pt-2">
        <Input
          placeholder="Member name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          className="h-8"
        />
        <Select value={jobClass} onValueChange={(v) => setJobClass(v as JobClass)}>
          <SelectTrigger className="h-8">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {JOB_CLASSES.map((c) => (
              <SelectItem key={c} value={c}>
                {c}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Button size="sm" className="w-full" disabled={busy || !name.trim()} onClick={addSingle}>
          Add
        </Button>
      </TabsContent>

      <TabsContent value="paste" className="space-y-2 pt-2">
        <Textarea
          rows={5}
          placeholder={"Name, Class\nAnother Name"}
          value={pasted}
          onChange={(e) => setPasted(e.target.value)}
          className="text-sm"
        />
        <Button
          size="sm"
          className="w-full"
          onClick={() => {
            const rows = parsePastedRows(pasted);
            if (rows.length === 0) {
              toast.error("Nothing to import.");
              return;
            }
            setPreview(rows);
          }}
        >
          Preview
        </Button>
      </TabsContent>

      <TabsContent value="file" className="space-y-2 pt-2">
        <Input
          type="file"
          accept=".xlsx,.xls,.csv"
          className="h-9 text-xs"
          onChange={(e) => {
            const file = e.target.files?.[0];
            e.target.value = "";
            if (file) void saveFile(file);
          }}
        />
        <p className="text-xs text-muted-foreground">
          First two columns are read as name and class. Header rows are detected automatically.
        </p>
      </TabsContent>
    </Tabs>
  );
}
