import { Link } from "react-router";
import { placeById } from "@/domain/places";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { RouteMap } from "@/components/route-map";
import { SearchForm } from "@/components/search-form";
import { RideCard } from "@/components/ride-card";
import { useApp, useT } from "@/store/context";

export function HomePage() {
  const { state, adapters } = useApp();
  const t = useT();
  const upcoming = state.rides
    .filter((ride) => ride.status === "open" && new Date(ride.departureAt).getTime() > Date.now())
    .sort((a, b) => a.departureAt.localeCompare(b.departureAt))
    .slice(0, 3);
  const origin = placeById("port-louis");
  const destination = placeById("grand-baie");
  return (
    <div className="grid gap-10">
      <section className="grid items-center gap-6 lg:grid-cols-[1.05fr_0.95fr]">
        <div>
          <p className="text-sm font-semibold text-primary">{t.heroKicker}</p>
          <h1 className="mt-2 font-heading text-4xl leading-tight md:text-6xl">{t.heroTitle}</h1>
          <p className="mt-4 max-w-xl text-lg text-muted-foreground">{t.heroBody}</p>
          <div className="mt-6 flex flex-wrap gap-3">
            <Link to="/rides"><Button className="h-10 px-4">{t.search}</Button></Link>
            <Link to="/rides/new"><Button variant="outline" className="h-10 px-4">{t.offer}</Button></Link>
          </div>
        </div>
        <Card>
          <CardContent className="grid gap-4">
            {origin && destination ? (
              <RouteMap origin={origin} destination={destination} apiKey={adapters.maps.apiKey} mapId={adapters.maps.mapId} />
            ) : null}
            <SearchForm />
          </CardContent>
        </Card>
      </section>
      <section>
        <h2 className="font-heading text-3xl">{t.howTitle}</h2>
        <div className="mt-4 grid gap-3 md:grid-cols-3">
          {t.how.map((step, index) => (
            <Card key={step.title}>
              <CardContent>
                <p className="text-sm text-primary">0{index + 1}</p>
                <h3 className="mt-1 font-heading text-xl">{step.title}</h3>
                <p className="mt-2 text-sm text-muted-foreground">{step.body}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      </section>
      <section className="grid gap-3">
        <h2 className="font-heading text-3xl">{t.upcoming}</h2>
        {upcoming.length === 0 ? <p className="text-muted-foreground">{t.noUpcoming}</p> : upcoming.map((ride) => <RideCard key={ride.id} ride={ride} />)}
      </section>
    </div>
  );
}
