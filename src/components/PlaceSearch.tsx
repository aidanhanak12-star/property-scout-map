import { useEffect, useRef, useState } from "react";

type Suggestion = { description: string; placeId: string };

type Props = {
  onSelect: (loc: { lat: number; lng: number; label: string }) => void;
};

export function PlaceSearch({ onSelect }: Props) {
  const [input, setInput] = useState("");
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
  const [open, setOpen] = useState(false);
  const sessionRef = useRef<google.maps.places.AutocompleteSessionToken | null>(null);
  const debounceRef = useRef<number | null>(null);

  useEffect(() => {
    if (!sessionRef.current && (window as any).google?.maps?.places) {
      sessionRef.current = new google.maps.places.AutocompleteSessionToken();
    }
  }, []);

  useEffect(() => {
    if (debounceRef.current) window.clearTimeout(debounceRef.current);
    if (!input.trim()) {
      setSuggestions([]);
      return;
    }
    debounceRef.current = window.setTimeout(async () => {
      try {
        const { AutocompleteSuggestion, AutocompleteSessionToken } =
          (await google.maps.importLibrary("places")) as google.maps.PlacesLibrary;
        if (!sessionRef.current) sessionRef.current = new AutocompleteSessionToken();
        const { suggestions } = await AutocompleteSuggestion.fetchAutocompleteSuggestions({
          input,
          sessionToken: sessionRef.current,
        });
        setSuggestions(
          suggestions
            .map((s) => {
              const p = s.placePrediction;
              if (!p) return null;
              return { description: p.text.toString(), placeId: p.placeId };
            })
            .filter((x): x is Suggestion => !!x)
            .slice(0, 6),
        );
      } catch (e) {
        console.error(e);
      }
    }, 200);
  }, [input]);

  async function choose(s: Suggestion) {
    setInput(s.description);
    setOpen(false);
    setSuggestions([]);
    const { Place } = (await google.maps.importLibrary("places")) as google.maps.PlacesLibrary;
    const place = new Place({ id: s.placeId });
    await place.fetchFields({ fields: ["location", "displayName"] });
    if (place.location) {
      onSelect({
        lat: place.location.lat(),
        lng: place.location.lng(),
        label: s.description,
      });
    }
    sessionRef.current = null;
  }

  return (
    <div className="relative">
      <input
        value={input}
        onChange={(e) => {
          setInput(e.target.value);
          setOpen(true);
        }}
        onFocus={() => setOpen(true)}
        onBlur={() => setTimeout(() => setOpen(false), 150)}
        placeholder="Search city, neighborhood, address…"
        className="w-full rounded-full border border-border bg-card px-5 py-3 text-sm shadow-sm outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20"
      />
      {open && suggestions.length > 0 && (
        <ul className="absolute z-20 mt-2 w-full overflow-hidden rounded-2xl border border-border bg-popover shadow-lg">
          {suggestions.map((s) => (
            <li key={s.placeId}>
              <button
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => choose(s)}
                className="block w-full px-5 py-3 text-left text-sm text-popover-foreground transition hover:bg-accent"
              >
                {s.description}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
