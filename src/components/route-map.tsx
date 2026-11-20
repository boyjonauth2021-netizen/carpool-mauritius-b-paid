import { useEffect, useRef } from "react";
import type { Place } from "@/domain/places";

type Point = Pick<Place, "name" | "lat" | "lng">;

const BOUNDS = { north: -19.95, south: -20.55, west: 57.3, east: 57.82 };
const OUTLINE = [
  [57.51, -19.99],
  [57.64, -20.0],
  [57.74, -20.08],
  [57.8, -20.2],
  [57.78, -20.35],
  [57.7, -20.46],
  [57.55, -20.53],
  [57.42, -20.5],
  [57.33, -20.38],
  [57.33, -20.22],
  [57.4, -20.08],
  [57.51, -19.99],
];

function project(lat: number, lng: number) {
  const x = ((lng - BOUNDS.west) / (BOUNDS.east - BOUNDS.west)) * 320;
  const y = ((BOUNDS.north - lat) / (BOUNDS.north - BOUNDS.south)) * 400;
  return { x, y };
}

export function RouteMap({
  origin,
  destination,
  apiKey,
  mapId,
}: {
  origin: Point;
  destination: Point;
  apiKey: string | null;
  mapId: string | null;
}) {
  if (!apiKey) return <Schematic origin={origin} destination={destination} />;
  return <GoogleMap origin={origin} destination={destination} apiKey={apiKey} mapId={mapId} />;
}

function Schematic({ origin, destination }: { origin: Point; destination: Point }) {
  const a = project(origin.lat, origin.lng);
  const b = project(destination.lat, destination.lng);
  const d = OUTLINE.map(([lng, lat]) => {
    const p = project(lat, lng);
    return `${p.x},${p.y}`;
  }).join(" ");
  return (
    <svg viewBox="0 0 320 400" className="h-64 w-full rounded-xl bg-[#e7f2ef]" role="img" aria-label={`${origin.name} to ${destination.name}`}>
      <polygon points={d} fill="#c9ddd4" stroke="#0f6e68" strokeWidth="2" />
      <line x1={a.x} y1={a.y} x2={b.x} y2={b.y} stroke="#c6533a" strokeWidth="2" strokeDasharray="4 4" />
      <circle cx={a.x} cy={a.y} r="6" fill="#0f6e68" />
      <circle cx={b.x} cy={b.y} r="6" fill="#c6533a" />
      <text x="16" y="28" fill="#123833" fontSize="13" fontFamily="Figtree, sans-serif">
        {origin.name} → {destination.name}
      </text>
    </svg>
  );
}

function GoogleMap({
  origin,
  destination,
  apiKey,
  mapId,
}: {
  origin: Point;
  destination: Point;
  apiKey: string;
  mapId: string | null;
}) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    let cancelled = false;
    const id = "google-maps-carpool";
    const existing = document.getElementById(id) as HTMLScriptElement | null;
    const ready = () => {
      const maps = (window as unknown as { google?: { maps: GoogleMaps } }).google?.maps;
      if (!maps || !ref.current || cancelled) return;
      const map = new maps.Map(ref.current, {
        center: { lat: (origin.lat + destination.lat) / 2, lng: (origin.lng + destination.lng) / 2 },
        zoom: 10,
        mapId: mapId ?? undefined,
        disableDefaultUI: true,
      });
      new maps.Marker({ position: { lat: origin.lat, lng: origin.lng }, map, title: origin.name });
      new maps.Marker({ position: { lat: destination.lat, lng: destination.lng }, map, title: destination.name });
    };
    if (existing && (window as unknown as { google?: unknown }).google) {
      ready();
      return;
    }
    const script = existing ?? document.createElement("script");
    script.id = id;
    script.src = `https://maps.googleapis.com/maps/api/js?key=${encodeURIComponent(apiKey)}`;
    script.async = true;
    script.onload = ready;
    if (!existing) document.head.appendChild(script);
    return () => {
      cancelled = true;
    };
  }, [apiKey, destination.lat, destination.lng, destination.name, mapId, origin.lat, origin.lng, origin.name]);
  return <div ref={ref} className="h-64 w-full rounded-xl bg-muted" />;
}

type GoogleMaps = {
  Map: new (el: HTMLElement, opts: object) => unknown;
  Marker: new (opts: object) => unknown;
};
