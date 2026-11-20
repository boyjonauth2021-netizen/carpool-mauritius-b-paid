import { useState } from "react";
import { formatMur } from "@/domain/money";
import { payBooking } from "@/store/actions";
import { useApp, useT } from "@/store/context";
import type { Booking } from "@/store/types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ErrorText, Field } from "@/components/bits";

export function PayPanel({ booking }: { booking: Booking }) {
  const { state, commit, adapters } = useApp();
  const t = useT();
  const [pan, setPan] = useState("4242 4242 4242 4242");
  const [expiry, setExpiry] = useState("12/34");
  const [cvc, setCvc] = useState("123");
  const [pending, setPending] = useState(false);
  const [code, setCode] = useState<string | null>(null);
  const me = state.users.find((user) => user.id === state.sessionUserId);

  async function onSubmit(event: React.FormEvent) {
    event.preventDefault();
    if (!me) return;
    setPending(true);
    await new Promise((resolve) => setTimeout(resolve, 450));
    const result = payBooking(
      state,
      { passengerId: me.id, bookingId: booking.id, pan, expiry, cvc },
      new Date(),
      adapters.payment,
      adapters.email,
    );
    commit(result.state);
    setPending(false);
    if (!result.ok) setCode(result.code);
    else setCode(result.data.status === "declined" ? "DECLINED" : null);
  }

  return (
    <form onSubmit={onSubmit} className="grid gap-3 rounded-xl border border-dashed border-destructive/50 bg-destructive/5 p-4">
      <p className="text-sm font-semibold tracking-wide text-destructive">TEST MODE</p>
      <p className="text-sm">{adapters.payment.label === "sandbox" ? t.sandbox : t.simulator}</p>
      <p className="text-sm text-muted-foreground">{t.testCards}: {t.successCard}. {t.declineCard}. {t.testMeta}</p>
      <dl className="grid gap-1 text-sm">
        <div className="flex justify-between"><dt>{t.fare}</dt><dd>{formatMur(booking.fareCents, state.locale)}</dd></div>
        <div className="flex justify-between"><dt>{t.fee}</dt><dd>{formatMur(booking.commissionCents, state.locale)}</dd></div>
        <div className="flex justify-between"><dt>{t.net}</dt><dd>{formatMur(booking.driverNetCents, state.locale)}</dd></div>
      </dl>
      <p className="text-xs text-muted-foreground">{t.notAPayout}</p>
      <Field label={t.cardNumber}><Input className="h-10 bg-card" value={pan} onChange={(event) => setPan(event.target.value)} autoComplete="off" inputMode="numeric" /></Field>
      <div className="grid grid-cols-2 gap-3">
        <Field label={t.expiry}><Input className="h-10 bg-card" value={expiry} onChange={(event) => setExpiry(event.target.value)} autoComplete="off" /></Field>
        <Field label={t.cvc}><Input className="h-10 bg-card" value={cvc} onChange={(event) => setCvc(event.target.value)} autoComplete="off" /></Field>
      </div>
      <ErrorText code={code} />
      <Button type="submit" className="h-10" disabled={pending}>{pending ? t.paying : t.pay}</Button>
    </form>
  );
}
