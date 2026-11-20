export type Place = {
  id: string;
  name: string;
  region: string;
  lat: number;
  lng: number;
};

export const PLACES: Place[] = [
  { id: "port-louis", name: "Port Louis", region: "Port Louis", lat: -20.1609, lng: 57.5012 },
  { id: "ebene", name: "Ébène", region: "Plaines Wilhems", lat: -20.244, lng: 57.49 },
  { id: "rose-hill", name: "Rose Hill", region: "Plaines Wilhems", lat: -20.243, lng: 57.472 },
  { id: "beau-bassin", name: "Beau Bassin", region: "Plaines Wilhems", lat: -20.223, lng: 57.468 },
  { id: "quatre-bornes", name: "Quatre Bornes", region: "Plaines Wilhems", lat: -20.264, lng: 57.479 },
  { id: "vacoas", name: "Vacoas", region: "Plaines Wilhems", lat: -20.298, lng: 57.478 },
  { id: "phoenix", name: "Phoenix", region: "Plaines Wilhems", lat: -20.299, lng: 57.508 },
  { id: "curepipe", name: "Curepipe", region: "Plaines Wilhems", lat: -20.317, lng: 57.526 },
  { id: "moka", name: "Moka", region: "Moka", lat: -20.219, lng: 57.496 },
  { id: "st-pierre", name: "Saint Pierre", region: "Moka", lat: -20.217, lng: 57.521 },
  { id: "centre-de-flacq", name: "Centre de Flacq", region: "Flacq", lat: -20.19, lng: 57.714 },
  { id: "belle-mare", name: "Belle Mare", region: "Flacq", lat: -20.196, lng: 57.776 },
  { id: "goodlands", name: "Goodlands", region: "Rivière du Rempart", lat: -20.035, lng: 57.643 },
  { id: "grand-baie", name: "Grand Baie", region: "Rivière du Rempart", lat: -20.013, lng: 57.581 },
  { id: "pereybere", name: "Péreybère", region: "Rivière du Rempart", lat: -19.994, lng: 57.587 },
  { id: "triolet", name: "Triolet", region: "Pamplemousses", lat: -20.055, lng: 57.545 },
  { id: "pamplemousses", name: "Pamplemousses", region: "Pamplemousses", lat: -20.104, lng: 57.57 },
  { id: "flic-en-flac", name: "Flic en Flac", region: "Black River", lat: -20.274, lng: 57.366 },
  { id: "tamarin", name: "Tamarin", region: "Black River", lat: -20.325, lng: 57.37 },
  { id: "black-river", name: "Black River", region: "Black River", lat: -20.36, lng: 57.366 },
  { id: "bambous", name: "Bambous", region: "Black River", lat: -20.256, lng: 57.406 },
  { id: "mahebourg", name: "Mahébourg", region: "Grand Port", lat: -20.408, lng: 57.7 },
  { id: "rose-belle", name: "Rose Belle", region: "Grand Port", lat: -20.4, lng: 57.597 },
  { id: "souillac", name: "Souillac", region: "Savanne", lat: -20.517, lng: 57.521 },
  { id: "chemin-grenier", name: "Chemin Grenier", region: "Savanne", lat: -20.487, lng: 57.466 },
];

export function placeById(id: string): Place | undefined {
  return PLACES.find((place) => place.id === id);
}
