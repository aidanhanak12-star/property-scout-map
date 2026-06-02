export type Property = {
  id: string;
  title: string;
  price: number;
  beds: number;
  baths: number;
  sqft: number;
  type: "House" | "Condo" | "Townhouse" | "Apartment";
  lat: number;
  lng: number;
  image: string;
};

// Generate deterministic mock properties around the world clustered in cities.
const cities = [
  { name: "San Francisco", lat: 37.7749, lng: -122.4194 },
  { name: "New York", lat: 40.7128, lng: -74.006 },
  { name: "Los Angeles", lat: 34.0522, lng: -118.2437 },
  { name: "Chicago", lat: 41.8781, lng: -87.6298 },
  { name: "Austin", lat: 30.2672, lng: -97.7431 },
  { name: "Miami", lat: 25.7617, lng: -80.1918 },
  { name: "Seattle", lat: 47.6062, lng: -122.3321 },
  { name: "Boston", lat: 42.3601, lng: -71.0589 },
  { name: "Denver", lat: 39.7392, lng: -104.9903 },
  { name: "London", lat: 51.5074, lng: -0.1278 },
  { name: "Paris", lat: 48.8566, lng: 2.3522 },
  { name: "Berlin", lat: 52.52, lng: 13.405 },
  { name: "Tokyo", lat: 35.6762, lng: 139.6503 },
  { name: "Sydney", lat: -33.8688, lng: 151.2093 },
  { name: "Toronto", lat: 43.6532, lng: -79.3832 },
];

const types: Property["type"][] = ["House", "Condo", "Townhouse", "Apartment"];
const streets = ["Oak", "Maple", "Pine", "Elm", "Cedar", "Birch", "Sunset", "Park", "Lake", "Hill"];
const images = [
  "https://images.unsplash.com/photo-1568605114967-8130f3a36994?w=600&q=80",
  "https://images.unsplash.com/photo-1570129477492-45c003edd2be?w=600&q=80",
  "https://images.unsplash.com/photo-1580587771525-78b9dba3b914?w=600&q=80",
  "https://images.unsplash.com/photo-1512917774080-9991f1c4c750?w=600&q=80",
  "https://images.unsplash.com/photo-1600585154340-be6161a56a0c?w=600&q=80",
  "https://images.unsplash.com/photo-1564013799919-ab600027ffc6?w=600&q=80",
  "https://images.unsplash.com/photo-1502672260266-1c1ef2d93688?w=600&q=80",
  "https://images.unsplash.com/photo-1505693416388-ac5ce068fe85?w=600&q=80",
];

// Seeded pseudo-random
function mulberry32(a: number) {
  return function () {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const rand = mulberry32(42);

export const PROPERTIES: Property[] = cities.flatMap((city, ci) =>
  Array.from({ length: 40 }, (_, i) => {
    const r = rand();
    const r2 = rand();
    const r3 = rand();
    const r4 = rand();
    const r5 = rand();
    // Spread within ~0.15 degrees (~15km)
    const dLat = (r - 0.5) * 0.3;
    const dLng = (r2 - 0.5) * 0.3;
    const beds = 1 + Math.floor(r3 * 5);
    const baths = 1 + Math.floor(r4 * 4);
    const sqft = 500 + Math.floor(r5 * 3500);
    const price = Math.round((sqft * (300 + r3 * 800)) / 1000) * 1000;
    return {
      id: `${ci}-${i}`,
      title: `${100 + Math.floor(r * 900)} ${streets[Math.floor(r2 * streets.length)]} ${r3 > 0.5 ? "St" : "Ave"}, ${city.name}`,
      price,
      beds,
      baths,
      sqft,
      type: types[Math.floor(r4 * types.length)],
      lat: city.lat + dLat,
      lng: city.lng + dLng,
      image: images[Math.floor(r5 * images.length)],
    };
  }),
);

// Haversine distance in km
export function distanceKm(a: { lat: number; lng: number }, b: { lat: number; lng: number }) {
  const R = 6371;
  const dLat = ((b.lat - a.lat) * Math.PI) / 180;
  const dLng = ((b.lng - a.lng) * Math.PI) / 180;
  const lat1 = (a.lat * Math.PI) / 180;
  const lat2 = (b.lat * Math.PI) / 180;
  const h =
    Math.sin(dLat / 2) ** 2 + Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(h));
}
