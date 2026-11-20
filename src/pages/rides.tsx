import { useState } from "react";
import { Link, useParams, useSearchParams } from "react-router";
import { formatKm, haversineKm } from "@/domain/matching";
import { formatMur, quoteFare } from "@/domain/money";
import { placeById } from "@/domain/places";
import { formatWhen } from "@/domain/time";
import { bookRide, searchRides } from "@/store/actions";
import { useApp, useT } from "@/store/context";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { ErrorText, StatusPill } from "@/components/bits";
import { RouteMap } from "@/components/route-map";
import { SearchForm } from "@/components/search-form";
import { RideCard } from "@/components/ride-card";

export function RidesPage() {
  const [params] = useSearchParams();
  const { state } = useApp();
  const t = useT();
  const from = params.get("from") ?? "";
  const to = params.get("to") ?? "";
  const date = params.get("date") ?? "";
  const seats = Number(params.get("seats") ?? "1");
  const searched = Boolean(from && to && date);
  const result = searched ? searchRides(state, { originPlaceId: from, destinationPlaceId: to, day: date, seats }) : null;
  return (
    <div className="grid gap-6">
      <h1 className="font-heading text-4xl">{t.results}</h1>
      <Card><CardContent><SearchForm initial={{ from, to, date, seats: String(seats || 1) }} /></CardContent></Card>
      {result?.code ? <ErrorText code={result.code} /> : null}
      {result && !result.code && result.rides.length === 0 ? <p className="text-muted-foreground">{t.noResults}</p> : null}
      <div className="grid gap-3">{(result?.rides ?? []).map((ride) => <RideCard key={ride.id} ride={ride} />)}</div>
    </div>
  );
}

export function RideDetailPage() {
  const { id } = useParams();
  const { state, commit, adapters } = useApp();
  const t = useT();
  const ride = state.rides.find((item) => item.id === id);
  const [seats, setSeats] = useState(1);
  const [code, setCode] = useState<string | null>(null);
  const [bookingId, setBookingId] = useState<string | null>(null);
  if (!ride) return <p>{t.errors.NOT_FOUND}</p>;
  const origin = placeById(ride.originPlaceId);
  const destination = placeById(ride.destinationPlaceId);
  const driver = state.users.find((user) => user.id === ride.driverUserId);
  const profile = state.profiles.find((item) => item.userId === ride.driverUserId);
  const me = state.users.find((user) => user.id === state.sessionUserId) ?? null;
  const km = origin && destination ? haversineKm(origin, destination) : 0;
  const quote = seats >= 1 && seats <= 4 ? quoteFare(seats, ride.pricePerSeatCents) : null;

  function book() {
    if (!me) return;
    const result = bookRide(state, me.id, ride!.id, seats, new Date());
    commit(result.state);
    if (!result.ok) setCode(result.code);
    else {
      setCode(null);
      setBookingId(result.data.bookingId);
    }
  }

  return (
    <div className="grid gap-6 lg:grid-cols-[1.1fr_0.9fr]">
      <div className="grid gap-4">
        <div className="flex flex-wrap items-center gap-2">
          <h1 className="font-heading text-4xl">{origin?.name} → {destination?.name}</h1>
          <StatusPill status={ride.status} />
        </div>
        <p className="text-muted-foreground">{formatWhen(ride.departureAt, state.locale)} · {formatKm(km, state.locale)} {t.straightLine}</p>
        {origin && destination ? <RouteMap origin={origin} destination={destination} apiKey={adapters.maps.apiKey} mapId={adapters.maps.mapId} /> : null}
        <p><span className="text-muted-foreground">{t.driver}. </span>{driver?.name}</p>
        <p><span className="text-muted-foreground">{t.vehicle}. </span>{profile?.vehicleColour} {profile?.vehicleMake} {profile?.vehicleModel} · {profile?.plate}</p>
        {ride.notes ? <p><span className="text-muted-foreground">{t.notes}. </span>{ride.notes}</p> : null}
      </div>
      <Card>
        <CardContent className="grid gap-3">
          <p className="font-heading text-4xl text-primary">{formatMur(ride.pricePerSeatCents, state.locale)}</p>
          <p className="text-sm text-muted-foreground">{t.perSeat} · {ride.seatsLeft} {t.seatsLeft}</p>
          {!me ? <Link to="/login"><Button className="h-10">{t.navLogin}</Button></Link> : null}
          {me && !me.emailVerified ? <Link to="/verify" className="text-sm underline">{t.errors.EMAIL_UNVERIFIED}</Link> : null}
          {me && me.emailVerified && !me.phoneVerified ? <Link to="/verify" className="text-sm underline">{t.errors.PHONE_UNVERIFIED}</Link> : null}
          {me && ride.status === "open" && me.id !== ride.driverUserId ? (
            <>
              <label className="grid gap-1 text-sm">
                {t.seats}
                <select className="control" value={seats} onChange={(event) => setSeats(Number(event.target.value))}>
                  {Array.from({ length: Math.min(4, ride.seatsLeft) }, (_, index) => index + 1).map((count) => (
                    <option key={count} value={count}>{count}</option>
                  ))}
                </select>
              </label>
              {quote ? (
                <p className="text-sm">{t.fare}: {formatMur(quote.fareCents, state.locale)} · {t.fee}: {formatMur(quote.commissionCents, state.locale)}</p>
              ) : null}
              <Button type="button" className="h-10" onClick={book}>{t.book}</Button>
            </>
          ) : null}
          <ErrorText code={code} />
          {bookingId ? <Link to="/bookings" className="text-sm font-medium text-primary underline">{t.pay}</Link> : null}
        </CardContent>
      </Card>
    </div>
  );
}
