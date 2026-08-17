import { useEffect, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  JOB_CLASSES,
  REMOVAL_REASONS,
  REMOVAL_REASON_LABELS,
  REMOVAL_REASON_RULES,
  type JobClass,
  type Member,
  type RemovalReason,
} from "@/lib/guild";

export function EditMemberDialog({
  member,
  onOpenChange,
  onSave,
}: {
  member: Member | null;
  onOpenChange: (open: boolean) => void;
  onSave: (input: { id: string; name: string; job_class: JobClass; join_date: string | null }) => void;
}) {
  const [name, setName] = useState("");
  const [jobClass, setJobClass] = useState<JobClass>("Lord Knight");
  const [joinDate, setJoinDate] = useState("");

  useEffect(() => {
    if (!member) return;
    setName(member.name);
    setJobClass(member.job_class);
    setJoinDate(member.join_date ?? "");
  }, [member]);

  return (
    <Dialog open={!!member} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle>Edit member</DialogTitle>
          <DialogDescription>
            Join date is optional — blank means the member is always auction-eligible.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-3">
          <div className="space-y-1.5">
            <Label htmlFor="edit-name">IGN</Label>
            <Input id="edit-name" value={name} onChange={(e) => setName(e.target.value)} />
          </div>
          <div className="space-y-1.5">
            <Label>Class</Label>
            <Select value={jobClass} onValueChange={(v) => setJobClass(v as JobClass)}>
              <SelectTrigger>
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
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="edit-join">Join date</Label>
            <Input
              id="edit-join"
              type="date"
              value={joinDate}
              onChange={(e) => setJoinDate(e.target.value)}
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button
            disabled={!name.trim()}
            onClick={() => {
              if (!member) return;
              onSave({
                id: member.id,
                name: name.trim(),
                job_class: jobClass,
                join_date: joinDate ? joinDate : null,
              });
              onOpenChange(false);
            }}
          >
            Save
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export function RemoveMemberDialog({
  member,
  onOpenChange,
  onConfirm,
}: {
  member: Member | null;
  onOpenChange: (open: boolean) => void;
  onConfirm: (input: { id: string; reason: RemovalReason }) => void;
}) {
  const [reason, setReason] = useState<RemovalReason | "">("");

  useEffect(() => {
    if (member) setReason("");
  }, [member]);

  return (
    <Dialog open={!!member} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle>Remove {member?.name}</DialogTitle>
          <DialogDescription>
            The member is kept in the Removed tab with their history. A reason is required.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-1.5">
          <Label>Removal reason</Label>
          <Select value={reason} onValueChange={(v) => setReason(v as RemovalReason)}>
            <SelectTrigger>
              <SelectValue placeholder="Select a reason" />
            </SelectTrigger>
            <SelectContent>
              {REMOVAL_REASONS.map((r) => (
                <SelectItem key={r} value={r}>
                  {REMOVAL_REASON_LABELS[r]}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {reason && (
            <p className="text-xs text-muted-foreground">{REMOVAL_REASON_RULES[reason]}</p>
          )}
        </div>
        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button
            variant="destructive"
            disabled={!reason}
            onClick={() => {
              if (!member || !reason) return;
              onConfirm({ id: member.id, reason });
              onOpenChange(false);
            }}
          >
            Remove member
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export function RestrictionSettingsDialog({
  open,
  onOpenChange,
  hours,
  onSave,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  hours: number;
  onSave: (hours: number) => void;
}) {
  const [value, setValue] = useState(String(hours));
  useEffect(() => {
    if (open) setValue(String(hours));
  }, [open, hours]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle>New Member Restriction Period</DialogTitle>
          <DialogDescription>
            New members cannot join Guild League or Emperium Overrun auctions until this period
            has passed since their join date. Other auction types ignore it.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-1.5">
          <Label htmlFor="restriction-hours">Hours</Label>
          <Input
            id="restriction-hours"
            type="number"
            min={0}
            value={value}
            onChange={(e) => setValue(e.target.value)}
          />
        </div>
        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button
            onClick={() => {
              const n = Number(value);
              if (!Number.isFinite(n) || n < 0) return;
              onSave(Math.round(n));
              onOpenChange(false);
            }}
          >
            Save
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
