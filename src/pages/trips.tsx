import { useState } from "react";
import { Link } from "react-router";
import { formatMur } from "@/domain/money";
import { formatWhen } from "@/domain/time";
import { cancelBookingByPassenger, cancelRideByDriver, completeRide } from "@/store/actions";
import { useApp, useT } from "@/store/context";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { ErrorText, StatusPill } from "@/components/bits";
import { PayPanel } from "@/components/pay-panel";
import { placeName } from "@/pages/driver";

export function BookingsPage() {
  const { state, commit, adapters } = useApp();
  const t = useT();
  const me = state.users.find((user) => user.id === state.sessionUserId) ?? null;
  const [code, setCode] = useState<string | null>(null);
  const [pending, setPending] = useState<string | null>(null);
  if (!me) return <p><Link to="/login" className="underline">{t.navLogin}</Link></p>;
  const mine = state.bookings.filter((booking) => booking.passengerId === me.id).sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  return (
    <div className="grid gap-4">
      <h1 className="font-heading text-4xl">{t.bookingsTitle}</h1>
      {mine.length === 0 ? <p className="text-muted-foreground">{t.noBookings}</p> : null}
      <ErrorText code={code} />
      {mine.map((booking) => {
        const ride = state.rides.find((item) => item.id === booking.rideId);
        return (
          <Card key={booking.id}>
            <CardContent className="grid gap-3">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div>
                  <h2 className="font-heading text-2xl">{ride ? `${placeName(ride.originPlaceId)} → ${placeName(ride.destinationPlaceId)}` : booking.rideId}</h2>
                  <p className="text-sm text-muted-foreground">{ride ? formatWhen(ride.departureAt, state.locale) : ""} · {booking.seats} {t.seatUnit}</p>
                </div>
                <StatusPill status={booking.status} />
              </div>
              <p>{t.fare}: {formatMur(booking.fareCents, state.locale)} · {t.fee}: {formatMur(booking.commissionCents, state.locale)} · {t.net}: {formatMur(booking.driverNetCents, state.locale)}</p>
              <p className="text-xs text-muted-foreground">{t.notAPayout}</p>
              {booking.status === "pending_payment" ? <PayPanel booking={booking} /> : null}
              {booking.status === "confirmed" ? (
                <Button
                  type="button"
                  variant="outline"
                  disabled={pending === booking.id}
                  onClick={() => {
                    setPending(booking.id);
                    const result = cancelBookingByPassenger(state, me.id, booking.id, new Date(), adapters.email);
                    commit(result.state);
                    setCode(result.ok ? null : result.code);
                    setPending(null);
                  }}
                >
                  {pending === booking.id ? t.cancelling : t.cancelSeat}
                </Button>
              ) : null}
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}

export function DrivePage() {
  const { state, commit, adapters } = useApp();
  const t = useT();
  const me = state.users.find((user) => user.id === state.sessionUserId) ?? null;
  const [code, setCode] = useState<string | null>(null);
  if (!me) return <p><Link to="/login" className="underline">{t.navLogin}</Link></p>;
  const rides = state.rides.filter((ride) => ride.driverUserId === me.id).sort((a, b) => a.departureAt.localeCompare(b.departureAt));
  return (
    <div className="grid gap-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="font-heading text-4xl">{t.driveTitle}</h1>
        <Link to="/rides/new"><Button className="h-10">{t.offer}</Button></Link>
      </div>
      {rides.length === 0 ? <p className="text-muted-foreground">{t.noDrive}</p> : null}
      <ErrorText code={code} />
      {rides.map((ride) => {
        const paid = state.bookings.filter((booking) => booking.rideId === ride.id && (booking.status === "confirmed" || booking.status === "completed"));
        const payable = paid.reduce((sum, booking) => sum + booking.driverNetCents, 0);
        return (
          <Card key={ride.id}>
            <CardContent className="grid gap-3">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div>
                  <h2 className="font-heading text-2xl">{placeName(ride.originPlaceId)} → {placeName(ride.destinationPlaceId)}</h2>
                  <p className="text-sm text-muted-foreground">{formatWhen(ride.departureAt, state.locale)} · {formatMur(ride.pricePerSeatCents, state.locale)} {t.perSeat}</p>
                </div>
                <StatusPill status={ride.status} />
              </div>
              <p className="text-sm">{t.net}: {formatMur(payable, state.locale)}. {t.notAPayout}</p>
              {ride.status === "open" || ride.status === "full" ? (
                <div className="flex flex-wrap gap-2">
                  <Button type="button" onClick={() => {
                    const result = completeRide(state, me.id, ride.id, new Date());
                    commit(result.state);
                    setCode(result.ok ? null : result.code);
                  }}>{t.complete}</Button>
                  <Button type="button" variant="outline" onClick={() => {
                    const result = cancelRideByDriver(state, me.id, ride.id, new Date(), adapters.email);
                    commit(result.state);
                    setCode(result.ok ? null : result.code);
                  }}>{t.cancelRide}</Button>
                </div>
              ) : null}
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
