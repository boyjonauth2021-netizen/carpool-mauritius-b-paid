import { useEffect, useState } from "react";
import { Link, NavLink, Outlet } from "react-router";
import { Button } from "@/components/ui/button";
import { logout, setLocale } from "@/store/actions";
import { useApp, useT } from "@/store/context";

export function Shell() {
  const { state, commit, adapters, reset } = useApp();
  const t = useT();
  const me = state.users.find((user) => user.id === state.sessionUserId) ?? null;
  const unread = me ? state.messages.filter((message) => message.userId === me.id && !message.read).length : 0;
  const [askReset, setAskReset] = useState(false);

  useEffect(() => {
    document.documentElement.lang = state.locale;
    document.title = t.brand;
  }, [state.locale, t.brand]);

  const links = [
    ["/rides", t.navSearch],
    ["/rides/new", t.navOffer],
    ["/bookings", t.navBookings],
    ["/drive", t.navDrive],
    ["/driver", t.navDriver],
    ["/messages", unread ? `${t.navMessages} (${unread})` : t.navMessages],
    ...(me?.isAdmin ? [["/admin", t.navAdmin]] : []),
  ] as const;

  function switchLanguage() {
    commit(setLocale(state, state.locale === "en" ? "fr" : "en"));
  }

  return (
    <div className="min-h-screen">
      <div className="test-ribbon px-4 py-2 text-center text-sm font-semibold tracking-wide">{t.testRibbon}</div>
      {adapters.warnings[0] ? <p className="bg-destructive/10 px-4 py-2 text-center text-sm text-destructive">{adapters.warnings[0]}</p> : null}
      <header className="mx-auto grid w-full max-w-5xl gap-3 px-4 py-4">
        <div className="flex items-center gap-3">
          <Link to="/" className="grid leading-tight">
            <span className="font-heading text-2xl text-primary">{t.brand}</span>
            <span className="text-xs text-muted-foreground">{t.company} · {t.version}</span>
          </Link>
          <div className="ml-auto flex items-center gap-2">
            <Button type="button" variant="outline" className="h-9" onClick={switchLanguage}>
              {t.language}
            </Button>
            {me ? (
              <Button type="button" variant="secondary" className="h-9" onClick={() => commit(logout(state))}>
                {me.name.split(" ")[0]} · {t.navLogout}
              </Button>
            ) : (
              <Link to="/login"><Button className="h-9">{t.navLogin}</Button></Link>
            )}
          </div>
        </div>
        <nav className="hidden flex-wrap items-center gap-1 md:flex">
          {links.map(([to, label]) => (
            <NavLink key={to} to={to} className={({ isActive }) => `rounded-full px-3 py-1.5 text-sm ${isActive ? "bg-primary text-primary-foreground" : "hover:bg-accent"}`}>
              {label}
            </NavLink>
          ))}
        </nav>
        <details className="md:hidden">
          <summary className="cursor-pointer rounded-lg border bg-card px-3 py-2 text-sm">Menu</summary>
          <div className="mt-2 grid gap-1">
            {links.map(([to, label]) => (
              <NavLink key={to} to={to} className="rounded-lg px-3 py-2 text-sm hover:bg-accent">{label}</NavLink>
            ))}
          </div>
        </details>
      </header>
      <main className="mx-auto w-full max-w-5xl px-4 pb-16">
        <Outlet />
      </main>
      <footer className="border-t bg-card/70">
        <div className="mx-auto flex w-full max-w-5xl flex-wrap items-center gap-3 px-4 py-6 text-sm text-muted-foreground">
          <span>{t.company} · Mauritius</span>
          <Link to="/legal" className="underline">{t.navLegal}</Link>
          {askReset ? (
            <Button type="button" variant="destructive" className="h-8" onClick={() => { void reset(); setAskReset(false); }}>
              {t.resetConfirm}
            </Button>
          ) : (
            <button type="button" className="underline" onClick={() => setAskReset(true)}>{t.reset}</button>
          )}
        </div>
      </footer>
    </div>
  );
}
