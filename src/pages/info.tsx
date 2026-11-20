import { useEffect } from "react";
import { Link } from "react-router";
import { COMMISSION_BPS, formatMur, MAX_PRICE_PER_SEAT_CENTS, MIN_PRICE_PER_SEAT_CENTS } from "@/domain/money";
import { markAllRead } from "@/store/actions";
import { useApp, useT } from "@/store/context";

export function MessagesPage() {
  const { state, commit } = useApp();
  const t = useT();
  const me = state.users.find((user) => user.id === state.sessionUserId) ?? null;
  useEffect(() => {
    if (me && state.messages.some((message) => message.userId === me.id && !message.read)) {
      commit(markAllRead(state, me.id));
    }
  }, [commit, me, state]);
  if (!me) return <p><Link to="/login" className="underline">{t.navLogin}</Link></p>;
  const mine = state.messages.filter((message) => message.userId === me.id);
  return (
    <div className="grid gap-4">
      <h1 className="font-heading text-4xl">{t.messagesTitle}</h1>
      {mine.length === 0 ? <p className="text-muted-foreground">{t.noMessages}</p> : null}
      {mine.map((message) => (
        <article key={message.id} className="rounded-xl border bg-card p-4">
          <p className="text-xs uppercase tracking-wide text-muted-foreground">{message.channel} · {message.adapter}</p>
          <h2 className="mt-1 font-heading text-2xl">{message.title}</h2>
          {message.code ? <p className="mt-3 font-heading text-4xl tracking-widest text-primary">{message.code}</p> : null}
          <p className="mt-3 whitespace-pre-wrap text-sm">{message.body}</p>
          <p className="mt-3 text-xs text-muted-foreground">{message.adapter === "sandbox" ? t.sandboxFoot : t.mockFoot}</p>
        </article>
      ))}
    </div>
  );
}

export function LegalPage() {
  const { state } = useApp();
  const t = useT();
  return (
    <article className="grid max-w-3xl gap-4">
      <h1 className="font-heading text-4xl">{t.legalTitle}</h1>
      <p>{t.legalLead}</p>
      <p>
        {state.locale === "fr"
          ? `Le prix est fixé par le conducteur, entre ${formatMur(MIN_PRICE_PER_SEAT_CENTS, "fr")} et ${formatMur(MAX_PRICE_PER_SEAT_CENTS, "fr")} par place. La commission est de ${COMMISSION_BPS / 100} %, arrondie au centime inférieur, déduite du conducteur. L'annulation passager est intégrale jusqu'à 2 heures avant le départ. Après, la démo refuse et n'invente pas de frais.`
          : `The driver sets the price, between ${formatMur(MIN_PRICE_PER_SEAT_CENTS, "en")} and ${formatMur(MAX_PRICE_PER_SEAT_CENTS, "en")} per seat. The commission is ${COMMISSION_BPS / 100}%, rounded down to the cent, and taken from the driver. A passenger can cancel for a full refund until 2 hours before departure. After that, the demo refuses and does not invent a fee.`}
      </p>
      <p>{t.notAPayout}</p>
      <h2 className="font-heading text-2xl">{state.locale === "fr" ? "Questions ouvertes" : "Open questions"}</h2>
      <ol className="grid list-decimal gap-3 pl-5">
        {t.questions.map((question) => <li key={question}>{question}</li>)}
      </ol>
      <p className="text-sm text-muted-foreground">docs/OPEN_QUESTIONS.md</p>
    </article>
  );
}
