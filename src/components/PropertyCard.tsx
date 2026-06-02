import type { Property } from "@/lib/properties";

type Props = {
  property: Property;
  distanceKm: number;
  selected: boolean;
  onClick: () => void;
};

export function PropertyCard({ property, distanceKm, selected, onClick }: Props) {
  return (
    <button
      onClick={onClick}
      className={`group flex w-full gap-3 rounded-2xl border bg-card p-3 text-left transition hover:border-primary hover:shadow-md ${
        selected ? "border-primary ring-2 ring-primary/20" : "border-border"
      }`}
    >
      <img
        src={property.image}
        alt={property.title}
        loading="lazy"
        className="h-24 w-28 flex-shrink-0 rounded-xl object-cover"
      />
      <div className="min-w-0 flex-1">
        <div className="flex items-baseline justify-between gap-2">
          <span className="text-lg font-semibold text-foreground">
            ${property.price.toLocaleString()}
          </span>
          <span className="text-xs text-muted-foreground">
            {distanceKm.toFixed(1)} km
          </span>
        </div>
        <p className="truncate text-sm text-muted-foreground">{property.title}</p>
        <div className="mt-2 flex flex-wrap gap-x-3 gap-y-1 text-xs text-muted-foreground">
          <span>{property.beds} bd</span>
          <span>{property.baths} ba</span>
          <span>{property.sqft.toLocaleString()} sqft</span>
          <span className="rounded-full bg-secondary px-2 py-0.5 text-[10px] font-medium text-secondary-foreground">
            {property.type}
          </span>
        </div>
      </div>
    </button>
  );
}
