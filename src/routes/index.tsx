import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { distanceKm, KM_PER_MILE } from "@/lib/properties";
import { searchListings, type Listing } from "@/lib/listings.functions";
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
          "Explore real for-sale listings on an interactive map. Move the pin, adjust the radius, and see every home in the area.",
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

function useDebounced<T>(value: T, ms: number): T {
  const [v, setV] = useState(value);
  useEffect(() => {
    const t = setTimeout(() => setV(value), ms);
    return () => clearTimeout(t);
  }, [value, ms]);
  return v;
}

function Index() {
  const { ready, error: mapsError } = useGoogleMaps();
  const [center, setCenter] = useState(DEFAULTS);
  const [radius, setRadius] = useState(5); // km
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [sort, setSort] = useState<"distance" | "price-asc" | "price-desc">("distance");
  const [typeFilter, setTypeFilter] = useState<string>("All");

  const debouncedCenter = useDebounced(center, 400);
  const debouncedRadius = useDebounced(radius, 400);

  const search = useServerFn(searchListings);
  const query = useQuery({
    queryKey: [
      "listings",
      debouncedCenter.lat.toFixed(4),
      debouncedCenter.lng.toFixed(4),
      debouncedRadius,
    ],
    queryFn: () =>
      search({
        data: {
          latitude: debouncedCenter.lat,
          longitude: debouncedCenter.lng,
          radiusMiles: Math.min(100, debouncedRadius / KM_PER_MILE),
          limit: 200,
        },
      }),
    staleTime: 60_000,
  });

  const listings: Listing[] = query.data?.listings ?? [];
  const apiError = query.data?.error ?? (query.error ? "Failed to load listings" : null);

  const types = useMemo(() => {
    const s = new Set<string>();
    listings.forEach((l) => s.add(l.type));
    return ["All", ...Array.from(s).sort()];
  }, [listings]);

  const visible = useMemo(() => {
    const withDist = listings
      .map((p) => ({ p, d: distanceKm({ lat: p.lat, lng: p.lng }, center) }))
      .filter((x) => x.d <= radius)
      .filter((x) => (typeFilter === "All" ? true : x.p.type === typeFilter));
    if (sort === "distance") withDist.sort((a, b) => a.d - b.d);
    if (sort === "price-asc") withDist.sort((a, b) => a.p.price - b.p.price);
    if (sort === "price-desc") withDist.sort((a, b) => b.p.price - a.p.price);
    return withDist;
  }, [listings, center, radius, sort, typeFilter]);

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
            <p className="text-xs text-muted-foreground">Live listings from RentCast</p>
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
            onChange={(e) => setTypeFilter(e.target.value)}
            className="rounded-full border border-border bg-card px-3 py-2 text-sm outline-none focus:border-primary"
          >
            {types.map((t) => (
              <option key={t} value={t}>
                {t}
              </option>
            ))}
          </select>
          <select
            value={sort}
            onChange={(e) => setSort(e.target.value as typeof sort)}
            className="rounded-full border border-border bg-card px-3 py-2 text-sm outline-none focus:border-primary"
          >
            <option value="distance">Nearest</option>
            <option value="price-asc">Price ↑</option>
            <option value="price-desc">Price ↓</option>
          </select>
        </div>
      </header>

      <div className="flex flex-1 overflow-hidden">
        <aside className="hidden w-[400px] flex-col border-r border-border bg-card md:flex">
          <div className="space-y-3 border-b border-border p-5">
            <div className="flex items-baseline justify-between">
              <h2 className="text-base font-semibold">
                {query.isFetching ? "Searching…" : `${visible.length} ${visible.length === 1 ? "home" : "homes"}`}
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
              Tip: click anywhere on the map or drag the orange pin to recenter. Listings refresh automatically.
            </p>
            {apiError && (
              <div className="rounded-xl border border-destructive/30 bg-destructive/5 p-3 text-xs text-destructive">
                {apiError}
              </div>
            )}
          </div>
          <div className="flex-1 space-y-2 overflow-y-auto p-4">
            {!query.isFetching && visible.length === 0 && !apiError && (
              <div className="rounded-2xl border border-dashed border-border p-8 text-center text-sm text-muted-foreground">
                No active for-sale listings in this area. Try expanding the radius or moving the pin to a US city.
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

        <main className="relative flex-1">
          {mapsError && (
            <div className="absolute inset-0 z-10 flex items-center justify-center bg-background p-6 text-center text-sm text-destructive">
              {mapsError}
            </div>
          )}
          {!ready && !mapsError && (
            <div className="absolute inset-0 z-10 flex items-center justify-center bg-muted">
              <div className="text-sm text-muted-foreground">Loading map…</div>
            </div>
          )}
          {ready && (
            <PropertyMap
              center={{ lat: center.lat, lng: center.lng }}
              radiusKm={radius}
              properties={visible.map((v) => v.p)}
              onCenterChange={(c) => {
                setCenter({ ...c, label: "Custom location" });
                setSelectedId(null);
              }}
              selectedId={selectedId}
              onSelect={setSelectedId}
            />
          )}
          {query.isFetching && ready && (
            <div className="absolute left-1/2 top-4 z-10 -translate-x-1/2 rounded-full bg-card px-4 py-2 text-xs font-medium text-foreground shadow-md">
              Loading listings…
            </div>
          )}
        </main>
      </div>
    </div>
  );
}
