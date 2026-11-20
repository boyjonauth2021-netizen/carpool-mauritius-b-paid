import { PLACES } from "@/domain/places";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

const items = Object.fromEntries(PLACES.map((place) => [place.id, place.name]));

export function PlaceSelect({
  value,
  onChange,
  label,
}: {
  value: string;
  onChange: (value: string) => void;
  label: string;
}) {
  return (
    <Select items={items} value={value} onValueChange={(next) => { if (typeof next === "string") onChange(next); }}>
      <SelectTrigger className="h-10 w-full bg-card" aria-label={label}>
        <SelectValue />
      </SelectTrigger>
      <SelectContent className="max-h-72">
        {PLACES.map((place) => (
          <SelectItem key={place.id} value={place.id}>
            {place.name}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
