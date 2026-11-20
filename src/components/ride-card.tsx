import { Link } from "react-router";
import { formatKm, haversineKm } from "@/domain/matching";
import { formatMur } from "@/domain/money";
import { placeById } from "@/domain/places";
import { formatWhen } from "@/domain/time";
import { Card, CardContent } from "@/components/ui/card";
import { StatusPill } from "@/components/bits";
import { useApp, useT } from "@/store/context";
import type { Ride } from "@/store/types";

export function RideCard({ ride }: { ride: Ride }) {
  const { state } = useApp();
  const t = useT();
  const origin = placeById(ride.originPlaceId);
  const destination = placeById(ride.destinationPlaceId);
  const driver = state.users.find((user) => user.id === ride.driverUserId);
  const profile = state.profiles.find((item) => item.userId === ride.driverUserId);
  const km = origin && destination ? haversineKm(origin, destination) : 0;
  return (
    <Link to={`/rides/${ride.id}`} className="block">
      <Card className="transition hover:-translate-y-0.5">
        <CardContent className="grid gap-3 md:grid-cols-[1fr_auto] md:items-center">
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <h2 className="font-heading text-2xl">{origin?.name} → {destination?.name}</h2>
              <StatusPill status={ride.status} />
            </div>
            <p className="mt-1 text-muted-foreground">{formatWhen(ride.departureAt, state.locale)}</p>
            <p className="mt-1 text-sm">
              {driver?.name} · {profile ? `${profile.vehicleColour} ${profile.vehicleMake} ${profile.vehicleModel}` : ""} · {profile?.plate}
            </p>
            <p className="text-sm text-muted-foreground">{formatKm(km, state.locale)} {t.straightLine} · {ride.seatsLeft} {t.seatsLeft}</p>
          </div>
          <p className="font-heading text-3xl text-primary">{formatMur(ride.pricePerSeatCents, state.locale)} <span className="text-base text-muted-foreground">{t.perSeat}</span></p>
        </CardContent>
      </Card>
    </Link>
  );
}
