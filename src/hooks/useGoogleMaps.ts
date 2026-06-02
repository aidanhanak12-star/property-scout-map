import { useEffect, useState } from "react";

let loadingPromise: Promise<typeof google> | null = null;

export function loadGoogleMaps(): Promise<typeof google> {
  if (typeof window === "undefined") return Promise.reject(new Error("SSR"));
  if ((window as any).google?.maps) return Promise.resolve((window as any).google);
  if (loadingPromise) return loadingPromise;

  const key = import.meta.env.VITE_LOVABLE_CONNECTOR_GOOGLE_MAPS_BROWSER_KEY;
  const channel = import.meta.env.VITE_LOVABLE_CONNECTOR_GOOGLE_MAPS_TRACKING_ID;

  loadingPromise = new Promise((resolve, reject) => {
    (window as any).__initGoogleMaps = () => resolve((window as any).google);
    const s = document.createElement("script");
    s.src = `https://maps.googleapis.com/maps/api/js?key=${key}&loading=async&libraries=places&callback=__initGoogleMaps&channel=${channel}`;
    s.async = true;
    s.onerror = () => reject(new Error("Failed to load Google Maps"));
    document.head.appendChild(s);
  });
  return loadingPromise;
}

export function useGoogleMaps() {
  const [ready, setReady] = useState(false);
  const [error, setError] = useState<string | null>(null);
  useEffect(() => {
    loadGoogleMaps()
      .then(() => setReady(true))
      .catch((e) => setError(e.message));
  }, []);
  return { ready, error };
}
