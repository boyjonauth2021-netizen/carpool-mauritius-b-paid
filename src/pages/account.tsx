import { useState } from "react";
import { Link, useNavigate } from "react-router";
import { hashPassword } from "@/services/hash";
import { DEMO_ACCOUNTS, DEMO_PASSWORD } from "@/store/seed";
import { login, register, requestEmailCode, requestPhoneCode, verifyEmail, verifyPhone } from "@/store/actions";
import { useApp, useT } from "@/store/context";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { ErrorText, Field } from "@/components/bits";

export function LoginPage() {
  const { state, commit } = useApp();
  const t = useT();
  const navigate = useNavigate();
  const [email, setEmail] = useState("passenger@bojosolutions.example");
  const [password, setPassword] = useState(DEMO_PASSWORD);
  const [code, setCode] = useState<string | null>(null);

  async function submit(nextEmail: string, nextPassword: string) {
    const passwordHash = await hashPassword(nextPassword);
    const result = login(state, nextEmail, passwordHash);
    if (!result.ok) {
      setCode(result.code);
      return;
    }
    commit(result.state);
    navigate("/");
  }

  return (
    <Card className="mx-auto max-w-lg">
      <CardHeader><CardTitle className="font-heading text-3xl">{t.loginTitle}</CardTitle></CardHeader>
      <CardContent className="grid gap-4">
        <form className="grid gap-3" onSubmit={(event) => { event.preventDefault(); void submit(email, password); }}>
          <Field label={t.email}><Input className="h-10 bg-card" type="email" value={email} onChange={(event) => setEmail(event.target.value)} required /></Field>
          <Field label={t.password}><Input className="h-10 bg-card" type="password" value={password} onChange={(event) => setPassword(event.target.value)} required /></Field>
          <ErrorText code={code} />
          <Button type="submit" className="h-10">{t.navLogin}</Button>
        </form>
        <p className="text-sm text-muted-foreground">{t.demoHint} <span className="font-semibold text-foreground">{DEMO_PASSWORD}</span></p>
        <div className="grid gap-2">
          {DEMO_ACCOUNTS.map((account) => (
            <Button key={account.email} type="button" variant="outline" className="h-10 justify-start" onClick={() => void submit(account.email, DEMO_PASSWORD)}>
              {t.continueAs} {account.name}
            </Button>
          ))}
        </div>
        <p className="text-sm">{t.needAccount} <Link to="/register" className="underline">{t.registerTitle}</Link></p>
      </CardContent>
    </Card>
  );
}

export function RegisterPage() {
  const { state, commit, adapters } = useApp();
  const t = useT();
  const navigate = useNavigate();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [adult, setAdult] = useState(false);
  const [code, setCode] = useState<string | null>(null);

  async function onSubmit(event: React.FormEvent) {
    event.preventDefault();
    const passwordHash = await hashPassword(password);
    const result = register(state, { name, email, password, passwordHash, phone: "", confirmedAdult: adult }, new Date(), adapters.email);
    commit(result.state);
    if (!result.ok) setCode(result.code);
    else navigate("/verify");
  }

  return (
    <Card className="mx-auto max-w-lg">
      <CardHeader><CardTitle className="font-heading text-3xl">{t.registerTitle}</CardTitle></CardHeader>
      <CardContent>
        <form className="grid gap-3" onSubmit={onSubmit}>
          <Field label={t.name}><Input className="h-10 bg-card" value={name} onChange={(event) => setName(event.target.value)} required /></Field>
          <Field label={t.email}><Input className="h-10 bg-card" type="email" value={email} onChange={(event) => setEmail(event.target.value)} required /></Field>
          <Field label={t.password}><Input className="h-10 bg-card" type="password" value={password} onChange={(event) => setPassword(event.target.value)} required /></Field>
          <label className="flex items-start gap-2 text-sm"><input type="checkbox" checked={adult} onChange={(event) => setAdult(event.target.checked)} /> {t.adult}</label>
          <ErrorText code={code} />
          <Button type="submit" className="h-10">{t.create}</Button>
        </form>
        <p className="mt-3 text-sm">{t.haveAccount} <Link to="/login" className="underline">{t.navLogin}</Link></p>
      </CardContent>
    </Card>
  );
}

export function VerifyPage() {
  const { state, commit, adapters } = useApp();
  const t = useT();
  const me = state.users.find((user) => user.id === state.sessionUserId) ?? null;
  const [phone, setPhone] = useState(me?.phone ?? "");
  const [code, setCode] = useState("");
  const [error, setError] = useState<string | null>(null);
  if (!me) return <p><Link to="/login" className="underline">{t.navLogin}</Link></p>;

  function apply(result: { ok: boolean; state: typeof state; code?: string }) {
    commit(result.state);
    setError(result.ok ? null : result.code ?? null);
    if (result.ok) setCode("");
  }

  return (
    <Card className="mx-auto max-w-lg">
      <CardHeader><CardTitle className="font-heading text-3xl">{t.verifyTitle}</CardTitle></CardHeader>
      <CardContent className="grid gap-4">
        <p className="text-sm text-muted-foreground">{t.inboxHint}</p>
        {!me.emailVerified ? (
          <form className="grid gap-3" onSubmit={(event) => { event.preventDefault(); apply(verifyEmail(state, me.id, code, new Date())); }}>
            <Field label={t.code}><Input className="h-10 bg-card" value={code} onChange={(event) => setCode(event.target.value)} inputMode="numeric" /></Field>
            <Button type="submit" className="h-10">{t.confirm}</Button>
            <Button type="button" variant="outline" onClick={() => apply(requestEmailCode(state, me.id, new Date(), adapters.email))}>{t.resend}</Button>
          </form>
        ) : null}
        {me.emailVerified && !me.phoneVerified ? (
          <form className="grid gap-3" onSubmit={(event) => { event.preventDefault(); apply(verifyPhone(state, me.id, code, new Date())); }}>
            <Field label={t.phone}><Input className="h-10 bg-card" value={phone} onChange={(event) => setPhone(event.target.value)} inputMode="numeric" /></Field>
            <Button type="button" variant="outline" onClick={() => apply(requestPhoneCode(state, me.id, phone, new Date(), adapters.sms))}>{t.sendSms}</Button>
            <Field label={t.code}><Input className="h-10 bg-card" value={code} onChange={(event) => setCode(event.target.value)} inputMode="numeric" /></Field>
            <Button type="submit" className="h-10">{t.confirm}</Button>
          </form>
        ) : null}
        {me.emailVerified && me.phoneVerified ? (
          <div className="grid gap-3">
            <p>{t.verified}</p>
            <Link to="/rides"><Button className="h-10">{t.goSearch}</Button></Link>
          </div>
        ) : null}
        <ErrorText code={error} />
        <Link to="/messages" className="text-sm underline">{t.navMessages}</Link>
      </CardContent>
    </Card>
  );
}
