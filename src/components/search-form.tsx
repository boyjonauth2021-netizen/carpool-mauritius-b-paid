import { useState } from "react";
import { useNavigate } from "react-router";
import { addMauritiusDays, mauritiusTodayISO } from "@/domain/time";
import { Button } from "@/components/ui/button";
import { Field } from "@/components/bits";
import { PlaceSelect } from "@/components/place-select";
import { useT } from "@/store/context";

export function SearchForm({
  initial,
}: {
  initial?: { from?: string; to?: string; date?: string; seats?: string };
}) {
  const t = useT();
  const navigate = useNavigate();
  const tomorrow = addMauritiusDays(mauritiusTodayISO(new Date()), 1);
  const [from, setFrom] = useState(initial?.from || "port-louis");
  const [to, setTo] = useState(initial?.to || "ebene");
  const [date, setDate] = useState(initial?.date || tomorrow);
  const [seats, setSeats] = useState(initial?.seats || "1");

  return (
    <form
      className="grid gap-3"
      onSubmit={(event) => {
        event.preventDefault();
        const params = new URLSearchParams({ from, to, date, seats });
        navigate(`/rides?${params.toString()}`);
      }}
    >
      <div className="grid gap-3 sm:grid-cols-2">
        <Field label={t.from}><PlaceSelect value={from} onChange={setFrom} label={t.from} /></Field>
        <Field label={t.to}><PlaceSelect value={to} onChange={setTo} label={t.to} /></Field>
        <Field label={t.when}><input className="control" type="date" value={date} onChange={(event) => setDate(event.target.value)} required /></Field>
        <Field label={t.seats}>
          <select className="control" value={seats} onChange={(event) => setSeats(event.target.value)}>
            {[1, 2, 3, 4].map((count) => <option key={count} value={count}>{count}</option>)}
          </select>
        </Field>
      </div>
      <Button type="submit" className="h-10">{t.search}</Button>
    </form>
  );
}
