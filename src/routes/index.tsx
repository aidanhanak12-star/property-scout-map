import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { PROPERTIES, distanceKm, type Property } from "@/lib/properties";
import { useGoogleMaps } from "@/hooks/useGoogleMaps";
import { PropertyMap } from "@/components/PropertyMap";
import { PlaceSearch } from "@/components/PlaceSearch";
import { PropertyCard } from "@/components/PropertyCard";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Nestmap — Find homes within your radius" },
      {
        name: "description",
        content:
          "Explore real estate on an interactive map. Move the pin, adjust the radius, and see every listing in the area.",
      },
      { property: "og:title", content: "Nestmap — Find homes within your radius" },
      {
        property: "og:description",
        content: "Interactive real estate map with adjustable search radius.",
      },
    ],
  }),
  component: Index,
});

const DEFAULTS = { lat: 37.7749, lng: -122.4194, label: "San Francisco, CA" };

function Index() {
  const { ready, error } = useGoogleMaps();
  const [center, setCenter] = useState(DEFAULTS);
  const [radius, setRadius] = useState(5);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [sort, setSort] = useState<"distance" | "price-asc" | "price-desc">("distance");
  const [typeFilter, setTypeFilter] = useState<"All" | Property["type"]>("All");

  const visible = useMemo(() => {
    const withDist = PROPERTIES.map((p) => ({
      p,
      d: distanceKm({ lat: p.lat, lng: p.lng }, center),
    }))
      .filter((x) => x.d <= radius)
      .filter((x) => (typeFilter === "All" ? true : x.p.type === typeFilter));
    if (sort === "distance") withDist.sort((a, b) => a.d - b.d);
    if (sort === "price-asc") withDist.sort((a, b) => a.p.price - b.p.price);
    if (sort === "price-desc") withDist.sort((a, b) => b.p.price - a.p.price);
    return withDist;
  }, [center, radius, sort, typeFilter]);

  return (
    <div className="flex h-screen flex-col bg-background">
      <header className="z-10 flex flex-col gap-3 border-b border-border bg-card/80 px-6 py-4 backdrop-blur md:flex-row md:items-center md:gap-6">
        <div className="flex items-center gap-2">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary text-primary-foreground">
            <svg viewBox="0 0 24 24" fill="none" className="h-5 w-5" stroke="currentColor" strokeWidth="2">
              <path d="M3 11l9-8 9 8v10a2 2 0 01-2 2h-4v-7H9v7H5a2 2 0 01-2-2V11z" />
            </svg>
          </div>
          <div>
            <h1 className="text-lg font-bold tracking-tight">Nestmap</h1>
            <p className="text-xs text-muted-foreground">Find homes within your radius</p>
          </div>
        </div>
        <div className="flex-1 md:max-w-md">
          {ready ? (
            <PlaceSearch
              onSelect={(loc) => {
                setCenter({ lat: loc.lat, lng: loc.lng, label: loc.label });
                setSelectedId(null);
              }}
            />
          ) : (
            <div className="h-11 w-full animate-pulse rounded-full bg-muted" />
          )}
        </div>
        <div className="flex items-center gap-3 text-sm">
          <select
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value as any)}
            className="rounded-full border border-border bg-card px-3 py-2 text-sm outline-none focus:border-primary"
          >
            <option>All</option>
            <option>House</option>
            <option>Condo</option>
            <option>Townhouse</option>
            <option>Apartment</option>
          </select>
          <select
            value={sort}
            onChange={(e) => setSort(e.target.value as any)}
            className="rounded-full border border-border bg-card px-3 py-2 text-sm outline-none focus:border-primary"
          >
            <option value="distance">Nearest</option>
            <option value="price-asc">Price ↑</option>
            <option value="price-desc">Price ↓</option>
          </select>
        </div>
      </header>

      <div className="flex flex-1 overflow-hidden">
        {/* Sidebar */}
        <aside className="hidden w-[400px] flex-col border-r border-border bg-card md:flex">
          <div className="space-y-3 border-b border-border p-5">
            <div className="flex items-baseline justify-between">
              <h2 className="text-base font-semibold">
                {visible.length} {visible.length === 1 ? "home" : "homes"}
              </h2>
              <span className="text-xs text-muted-foreground">
                within {radius} km of {center.label}
              </span>
            </div>
            <div>
              <div className="mb-2 flex items-center justify-between text-xs text-muted-foreground">
                <span>Search radius</span>
                <span className="font-medium text-foreground">{radius} km</span>
              </div>
              <input
                type="range"
                min={1}
                max={50}
                step={1}
                value={radius}
                onChange={(e) => setRadius(Number(e.target.value))}
                className="w-full accent-[var(--color-primary)]"
              />
              <div className="mt-1 flex justify-between text-[10px] text-muted-foreground">
                <span>1</span>
                <span>25</span>
                <span>50 km</span>
              </div>
            </div>
            <p className="text-[11px] leading-relaxed text-muted-foreground">
              Tip: click anywhere on the map or drag the orange pin to recenter the search.
            </p>
          </div>
          <div className="flex-1 space-y-2 overflow-y-auto p-4">
            {visible.length === 0 && (
              <div className="rounded-2xl border border-dashed border-border p-8 text-center text-sm text-muted-foreground">
                No homes in this area. Try expanding the radius or moving the pin.
              </div>
            )}
            {visible.map(({ p, d }) => (
              <PropertyCard
                key={p.id}
                property={p}
                distanceKm={d}
                selected={p.id === selectedId}
                onClick={() => setSelectedId(p.id)}
              />
            ))}
          </div>
        </aside>

        {/* Map */}
        <main className="relative flex-1">
          {error && (
            <div className="absolute inset-0 z-10 flex items-center justify-center bg-background p-6 text-center text-sm text-destructive">
              {error}
            </div>
          )}
          {!ready && !error && (
            <div className="absolute inset-0 z-10 flex items-center justify-center bg-muted">
              <div className="text-sm text-muted-foreground">Loading map…</div>
            </div>
          )}
          {ready && (
            <PropertyMap
              center={{ lat: center.lat, lng: center.lng }}
              radiusKm={radius}
              properties={visible.map((v) => v.p)}
              onCenterChange={(c) => setCenter({ ...c, label: "Custom location" })}
              selectedId={selectedId}
              onSelect={setSelectedId}
            />
          )}
        </main>
      </div>
    </div>
  );
}
