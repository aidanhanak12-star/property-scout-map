import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

const InputSchema = z.object({
  latitude: z.number().min(-90).max(90),
  longitude: z.number().min(-180).max(180),
  // RentCast uses miles, max 100
  radiusMiles: z.number().min(0.1).max(100),
  limit: z.number().min(1).max(500).default(200),
});

export type Listing = {
  id: string;
  title: string;
  price: number;
  beds: number;
  baths: number;
  sqft: number;
  type: string;
  lat: number;
  lng: number;
  image: string | null;
  listingUrl: string | null;
};

const FALLBACK_IMAGES = [
  "https://images.unsplash.com/photo-1568605114967-8130f3a36994?w=600&q=80",
  "https://images.unsplash.com/photo-1570129477492-45c003edd2be?w=600&q=80",
  "https://images.unsplash.com/photo-1580587771525-78b9dba3b914?w=600&q=80",
  "https://images.unsplash.com/photo-1512917774080-9991f1c4c750?w=600&q=80",
  "https://images.unsplash.com/photo-1600585154340-be6161a56a0c?w=600&q=80",
  "https://images.unsplash.com/photo-1564013799919-ab600027ffc6?w=600&q=80",
];

export const searchListings = createServerFn({ method: "POST" })
  .inputValidator((data: unknown) => InputSchema.parse(data))
  .handler(async ({ data }) => {
    const reqId = Math.random().toString(36).slice(2, 8);
    const log = (...args: unknown[]) => console.log(`[rentcast ${reqId}]`, ...args);

    const apiKey = process.env.RENTCAST_API_KEY;
    log("input", data);
    log("env", {
      hasKey: Boolean(apiKey),
      keyLength: apiKey?.length ?? 0,
      keyPreview: apiKey ? `${apiKey.slice(0, 4)}…${apiKey.slice(-2)}` : null,
    });
    if (!apiKey) {
      return {
        listings: [] as Listing[],
        error: "Server is missing RENTCAST_API_KEY",
      };
    }

    const params = new URLSearchParams({
      latitude: data.latitude.toString(),
      longitude: data.longitude.toString(),
      radius: data.radiusMiles.toFixed(3),
      limit: data.limit.toString(),
      status: "Active",
    });

    const url = `https://api.rentcast.io/v1/listings/sale?${params}`;
    log("GET", url);

    const startedAt = Date.now();
    try {
      const res = await fetch(url, {
        headers: {
          "X-Api-Key": apiKey,
          Accept: "application/json",
        },
      });

      const elapsedMs = Date.now() - startedAt;
      log("response", {
        status: res.status,
        statusText: res.statusText,
        elapsedMs,
        contentType: res.headers.get("content-type"),
      });

      if (!res.ok) {
        const text = await res.text().catch(() => "");
        log("error body", text.slice(0, 500));
        if (res.status === 404) {
          // RentCast returns 404 when no listings found in that area
          return { listings: [] as Listing[], error: null };
        }
        return {
          listings: [] as Listing[],
          error: `RentCast ${res.status} ${res.statusText}: ${text.slice(0, 200) || "no body"}`,
        };
      }

      const raw = (await res.json()) as unknown;
      const arr = Array.isArray(raw) ? raw : [];
      log("ok", { count: arr.length });

      const listings: Listing[] = arr
        .map((item: any, idx: number): Listing | null => {
          const lat = Number(item?.latitude);
          const lng = Number(item?.longitude);
          const price = Number(item?.price);
          if (!Number.isFinite(lat) || !Number.isFinite(lng) || !Number.isFinite(price)) {
            return null;
          }
          const photos: string[] = Array.isArray(item?.photos) ? item.photos : [];
          const photo =
            photos.find((p) => typeof p === "string") ??
            FALLBACK_IMAGES[idx % FALLBACK_IMAGES.length];
          return {
            id: String(item?.id ?? `${lat},${lng},${idx}`),
            title: String(item?.formattedAddress ?? "Address unavailable"),
            price,
            beds: Number(item?.bedrooms ?? 0),
            baths: Number(item?.bathrooms ?? 0),
            sqft: Number(item?.squareFootage ?? 0),
            type: String(item?.propertyType ?? "Property"),
            lat,
            lng,
            image: photo,
            listingUrl:
              typeof item?.listingUrl === "string" ? item.listingUrl : null,
          };
        })
        .filter((x): x is Listing => x !== null);

      return { listings, error: null };
    } catch (e) {
      console.error("RentCast fetch failed", e);
      return {
        listings: [] as Listing[],
        error: "Could not reach the listings service",
      };
    }
  });
