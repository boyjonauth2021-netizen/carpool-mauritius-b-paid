import { useState } from "react";
import { Link, useNavigate } from "react-router";
import { placeById } from "@/domain/places";
import { atMauritius } from "@/domain/time";
import { rupeesToCents } from "@/domain/money";
import { addMauritiusDays, mauritiusTodayISO } from "@/domain/time";
import { postRide, submitDriver, type DriverInput } from "@/store/actions";
import { useApp, useT } from "@/store/context";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { ErrorText, Field, StatusPill } from "@/components/bits";
import { PlaceSelect } from "@/components/place-select";

const emptyDriver: DriverInput = {
  nicNumber: "",
  licenceNumber: "",
  licenceExpiry: "",
  vehicleMake: "",
  vehicleModel: "",
  vehicleColour: "",
  plate: "",
  seatCount: 3,
  insuranceExpiry: "",
};

export function DriverPage() {
  const { state, commit } = useApp();
  const t = useT();
  const me = state.users.find((user) => user.id === state.sessionUserId) ?? null;
  const profile = state.profiles.find((item) => item.userId === me?.id);
  const [form, setForm] = useState<DriverInput>(profile ? { ...profile } : emptyDriver);
  const [code, setCode] = useState<string | null>(null);
  if (!me) return <p><Link to="/login" className="underline">{t.navLogin}</Link></p>;

  function set<K extends keyof DriverInput>(key: K, value: DriverInput[K]) {
    setForm((current) => ({ ...current, [key]: value }));
  }

  return (
    <div className="grid gap-4">
      <h1 className="font-heading text-4xl">{t.driverTitle}</h1>
      <p className="max-w-2xl text-muted-foreground">{t.driverBody}</p>
      {profile ? <div className="flex items-center gap-2"><StatusPill status={profile.status} /> <span>{profile.status === "pending" ? t.pendingReview : profile.status === "approved" ? t.approved : t.rejected}</span></div> : null}
      {profile?.reviewNote ? <p className="text-sm">{profile.reviewNote}</p> : null}
      {profile?.status === "approved" ? <Link to="/rides/new"><Button className="h-10">{t.offer}</Button></Link> : null}
      {profile?.status !== "approved" ? (
        <Card>
          <CardContent>
            <form
              className="grid gap-3 md:grid-cols-2"
              onSubmit={(event) => {
                event.preventDefault();
                const result = submitDriver(state, me.id, { ...form, seatCount: Number(form.seatCount) }, new Date());
                commit(result.state);
                setCode(result.ok ? null : result.code);
              }}
            >
              <Field label={t.nic}><Input className="h-10 bg-card" value={form.nicNumber} onChange={(event) => set("nicNumber", event.target.value)} required /></Field>
              <Field label={t.licence}><Input className="h-10 bg-card" value={form.licenceNumber} onChange={(event) => set("licenceNumber", event.target.value)} required /></Field>
              <Field label={t.licenceExpiry}><Input className="h-10 bg-card" type="date" value={form.licenceExpiry} onChange={(event) => set("licenceExpiry", event.target.value)} required /></Field>
              <Field label={t.insuranceExpiry}><Input className="h-10 bg-card" type="date" value={form.insuranceExpiry} onChange={(event) => set("insuranceExpiry", event.target.value)} required /></Field>
              <Field label={t.make}><Input className="h-10 bg-card" value={form.vehicleMake} onChange={(event) => set("vehicleMake", event.target.value)} required /></Field>
              <Field label={t.model}><Input className="h-10 bg-card" value={form.vehicleModel} onChange={(event) => set("vehicleModel", event.target.value)} required /></Field>
              <Field label={t.colour}><Input className="h-10 bg-card" value={form.vehicleColour} onChange={(event) => set("vehicleColour", event.target.value)} required /></Field>
              <Field label={t.plate}><Input className="h-10 bg-card" value={form.plate} onChange={(event) => set("plate", event.target.value)} required /></Field>
              <Field label={t.passengerSeats}>
                <select className="control" value={form.seatCount} onChange={(event) => set("seatCount", Number(event.target.value))}>
                  {[1, 2, 3, 4, 5, 6].map((count) => <option key={count} value={count}>{count}</option>)}
                </select>
              </Field>
              <div className="md:col-span-2 grid gap-3">
                <ErrorText code={code} />
                <Button type="submit" className="h-10">{t.submitDriver}</Button>
              </div>
            </form>
          </CardContent>
        </Card>
      ) : null}
    </div>
  );
}

export function PostRidePage() {
  const { state, commit } = useApp();
  const t = useT();
  const navigate = useNavigate();
  const me = state.users.find((user) => user.id === state.sessionUserId) ?? null;
  const tomorrow = addMauritiusDays(mauritiusTodayISO(new Date()), 1);
  const [originPlaceId, setOrigin] = useState("port-louis");
  const [destinationPlaceId, setDestination] = useState("curepipe");
  const [date, setDate] = useState(tomorrow);
  const [time, setTime] = useState("07:30");
  const [seatsTotal, setSeats] = useState(2);
  const [price, setPrice] = useState("150");
  const [notes, setNotes] = useState("");
  const [code, setCode] = useState<string | null>(null);
  if (!me) return <p><Link to="/login" className="underline">{t.navLogin}</Link></p>;
  const profile = state.profiles.find((item) => item.userId === me.id);
  if (!profile || profile.status !== "approved") {
    return <p><Link to="/driver" className="underline">{t.errors.NOT_APPROVED}</Link></p>;
  }
  return (
    <Card className="mx-auto max-w-2xl">
      <CardHeader>
        <CardTitle className="font-heading text-3xl">{t.postTitle}</CardTitle>
        <p className="text-sm text-muted-foreground">{t.postBody}</p>
      </CardHeader>
      <CardContent>
        <form
          className="grid gap-3"
          onSubmit={(event) => {
            event.preventDefault();
            const cents = rupeesToCents(price);
            if (cents === null) {
              setCode("INVALID_PRICE");
              return;
            }
            const result = postRide(
              state,
              me.id,
              { originPlaceId, destinationPlaceId, departureAt: atMauritius(date, time).toISOString(), seatsTotal, pricePerSeatCents: cents, notes },
              new Date(),
            );
            commit(result.state);
            if (!result.ok) setCode(result.code);
            else navigate(`/rides/${result.data.rideId}`);
          }}
        >
          <div className="grid gap-3 sm:grid-cols-2">
            <Field label={t.from}><PlaceSelect value={originPlaceId} onChange={setOrigin} label={t.from} /></Field>
            <Field label={t.to}><PlaceSelect value={destinationPlaceId} onChange={setDestination} label={t.to} /></Field>
            <Field label={t.when}><Input className="h-10 bg-card" type="date" value={date} onChange={(event) => setDate(event.target.value)} required /></Field>
            <Field label={t.departureTime}><Input className="h-10 bg-card" type="time" value={time} onChange={(event) => setTime(event.target.value)} required /></Field>
          </div>
          <Field label={t.passengerSeats}>
            <select className="control" value={seatsTotal} onChange={(event) => setSeats(Number(event.target.value))}>
              {Array.from({ length: profile.seatCount }, (_, index) => index + 1).map((count) => <option key={count} value={count}>{count}</option>)}
            </select>
          </Field>
          <Field label={t.price} hint="Rs 50 – Rs 2,000"><Input className="h-10 bg-card" value={price} onChange={(event) => setPrice(event.target.value)} inputMode="decimal" required /></Field>
          <Field label={t.notes}><Textarea value={notes} onChange={(event) => setNotes(event.target.value)} maxLength={280} /></Field>
          <ErrorText code={code} />
          <Button type="submit" className="h-10">{t.publish}</Button>
        </form>
      </CardContent>
    </Card>
  );
}

export function placeName(id: string) {
  return placeById(id)?.name ?? id;
}
