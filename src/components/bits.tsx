import type { ErrorCode } from "@/domain/errors";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { useT } from "@/store/context";

export function Field({ id, label, children, hint }: { id?: string; label: string; children: React.ReactNode; hint?: string }) {
  return (
    <div className="grid gap-1.5">
      <Label htmlFor={id}>{label}</Label>
      {children}
      {hint ? <p className="text-xs text-muted-foreground">{hint}</p> : null}
    </div>
  );
}

export function ErrorText({ code }: { code: string | null }) {
  const t = useT();
  if (!code) return null;
  const text = t.errors[code as ErrorCode] ?? code;
  return (
    <p className="text-sm text-destructive" role="alert">
      {text}
    </p>
  );
}

export function StatusPill({ status }: { status: string }) {
  const t = useT();
  const label = t.status[status] ?? status;
  const variant = status === "approved" || status === "confirmed" || status === "captured" || status === "completed" || status === "open"
    ? "default"
    : status === "rejected" || status === "declined" || status === "cancelled"
      ? "destructive"
      : "secondary";
  return <Badge variant={variant}>{label}</Badge>;
}
