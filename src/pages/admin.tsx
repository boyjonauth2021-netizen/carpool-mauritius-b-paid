import { useState } from "react";
import { Link } from "react-router";
import { formatMur, sumAccount } from "@/domain/money";
import { reviewDriver } from "@/store/actions";
import { useApp, useT } from "@/store/context";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { ErrorText, StatusPill } from "@/components/bits";

export function AdminPage() {
  const { state, commit, adapters } = useApp();
  const t = useT();
  const me = state.users.find((user) => user.id === state.sessionUserId) ?? null;
  const [filter, setFilter] = useState<"pending" | "approved" | "rejected">("pending");
  const [notes, setNotes] = useState<Record<string, string>>({});
  const [code, setCode] = useState<string | null>(null);
  if (!me) return <p><Link to="/login" className="underline">{t.navLogin}</Link></p>;
  if (!me.isAdmin) return <p>{t.errors.FORBIDDEN}</p>;
  const lines = state.ledger.map((entry) => ({ account: entry.account, amountCents: entry.amountCents, memo: entry.memo }));
  const profiles = state.profiles.filter((profile) => profile.status === filter);
  return (
    <div className="grid gap-6">
      <h1 className="font-heading text-4xl">{t.adminTitle}</h1>
      <section className="grid gap-3 md:grid-cols-3">
        <Card><CardContent><p className="text-sm text-muted-foreground">{t.cash}</p><p className="font-heading text-3xl">{formatMur(sumAccount(lines, "platform_cash"), state.locale)}</p></CardContent></Card>
        <Card><CardContent><p className="text-sm text-muted-foreground">{t.commission}</p><p className="font-heading text-3xl">{formatMur(sumAccount(lines, "platform_commission"), state.locale)}</p></CardContent></Card>
        <Card><CardContent><p className="text-sm text-muted-foreground">{t.payable}</p><p className="font-heading text-3xl">{formatMur(sumAccount(lines, "driver_payable"), state.locale)}</p></CardContent></Card>
      </section>
      <p className="text-sm text-muted-foreground">{t.notAPayout} {adapters.payment.label === "sandbox" ? t.sandbox : t.simulator}</p>
      <section className="grid gap-3">
        <div className="flex flex-wrap items-center gap-2">
          <h2 className="font-heading text-3xl">{t.queue}</h2>
          {(["pending", "approved", "rejected"] as const).map((status) => (
            <Button key={status} type="button" variant={filter === status ? "default" : "outline"} className="h-8" onClick={() => setFilter(status)}>{t.status[status]}</Button>
          ))}
        </div>
        <ErrorText code={code} />
        {profiles.length === 0 ? <p className="text-muted-foreground">{t.emptyQueue}</p> : null}
        {profiles.map((profile) => {
          const user = state.users.find((item) => item.id === profile.userId);
          return (
            <Card key={profile.id}>
              <CardContent className="grid gap-2">
                <div className="flex flex-wrap items-center gap-2">
                  <h3 className="font-heading text-2xl">{user?.name}</h3>
                  <StatusPill status={profile.status} />
                </div>
                <p className="text-sm">{user?.email} · +230 {user?.phone}</p>
                <p className="text-sm">{profile.vehicleColour} {profile.vehicleMake} {profile.vehicleModel} · {profile.plate} · {profile.seatCount} {t.seats}</p>
                <p className="text-sm">NIC {profile.nicNumber} · {t.licence} {profile.licenceNumber} · {profile.licenceExpiry}</p>
                <p className="text-sm">{t.insuranceExpiry} {profile.insuranceExpiry}</p>
                {profile.status === "pending" ? (
                  <div className="grid gap-2">
                    <Textarea value={notes[profile.id] ?? ""} onChange={(event) => setNotes({ ...notes, [profile.id]: event.target.value })} placeholder={t.note} />
                    <div className="flex gap-2">
                      <Button type="button" onClick={() => {
                        const result = reviewDriver(state, me.id, profile.id, "approved", notes[profile.id] ?? "Approved in the demo", new Date(), adapters.email);
                        commit(result.state);
                        setCode(result.ok ? null : result.code);
                      }}>{t.approve}</Button>
                      <Button type="button" variant="outline" onClick={() => {
                        const result = reviewDriver(state, me.id, profile.id, "rejected", notes[profile.id] ?? "", new Date(), adapters.email);
                        commit(result.state);
                        setCode(result.ok ? null : result.code);
                      }}>{t.reject}</Button>
                    </div>
                  </div>
                ) : null}
              </CardContent>
            </Card>
          );
        })}
      </section>
      <section className="grid gap-2">
        <h2 className="font-heading text-3xl">{t.payments}</h2>
        {state.payments.length === 0 ? <p className="text-muted-foreground">{t.noPayments}</p> : null}
        {state.payments.map((payment) => (
          <div key={payment.id} className="flex flex-wrap items-center justify-between gap-2 rounded-xl border bg-card px-3 py-2 text-sm">
            <span>TEST · {payment.provider} · {payment.providerRef}</span>
            <span>{formatMur(payment.amountCents, state.locale)} {payment.last4 ? `···· ${payment.last4}` : ""}</span>
            <StatusPill status={payment.status} />
          </div>
        ))}
      </section>
    </div>
  );
}
