/// <reference types="google.maps" />
import { useEffect, useRef } from "react";
import type { Listing } from "@/lib/listings.functions";

type Props = {
  center: { lat: number; lng: number };
  radiusKm: number;
  properties: Listing[];
  onCenterChange: (c: { lat: number; lng: number }) => void;
  selectedId: string | null;
  onSelect: (id: string | null) => void;
};

export function PropertyMap({
  center,
  radiusKm,
  properties,
  onCenterChange,
  selectedId,
  onSelect,
}: Props) {
  const ref = useRef<HTMLDivElement>(null);
  const mapRef = useRef<google.maps.Map | null>(null);
  const circleRef = useRef<google.maps.Circle | null>(null);
  const centerMarkerRef = useRef<google.maps.Marker | null>(null);
  const markersRef = useRef<Map<string, google.maps.Marker>>(new Map());

  // Init map
  useEffect(() => {
    if (!ref.current || mapRef.current) return;
    const map = new google.maps.Map(ref.current, {
      center,
      zoom: 12,
      disableDefaultUI: false,
      mapTypeControl: false,
      streetViewControl: false,
      fullscreenControl: false,
      styles: [
        { elementType: "geometry", stylers: [{ color: "#f5f4ef" }] },
        { elementType: "labels.text.stroke", stylers: [{ color: "#f5f4ef" }] },
        { elementType: "labels.text.fill", stylers: [{ color: "#5a5648" }] },
        { featureType: "water", stylers: [{ color: "#c8dde4" }] },
        { featureType: "road", elementType: "geometry", stylers: [{ color: "#ffffff" }] },
        { featureType: "poi", stylers: [{ visibility: "off" }] },
      ],
    });
    mapRef.current = map;

    const circle = new google.maps.Circle({
      map,
      center,
      radius: radiusKm * 1000,
      strokeColor: "#c2410c",
      strokeOpacity: 0.8,
      strokeWeight: 2,
      fillColor: "#c2410c",
      fillOpacity: 0.08,
      clickable: false,
    });
    circleRef.current = circle;

    const centerMarker = new google.maps.Marker({
      map,
      position: center,
      draggable: true,
      icon: {
        path: google.maps.SymbolPath.CIRCLE,
        scale: 10,
        fillColor: "#c2410c",
        fillOpacity: 1,
        strokeColor: "#fff",
        strokeWeight: 3,
      },
      zIndex: 1000,
    });
    centerMarker.addListener("dragend", () => {
      const p = centerMarker.getPosition();
      if (p) onCenterChange({ lat: p.lat(), lng: p.lng() });
    });
    map.addListener("click", (e: google.maps.MapMouseEvent) => {
      if (e.latLng) onCenterChange({ lat: e.latLng.lat(), lng: e.latLng.lng() });
    });
    centerMarkerRef.current = centerMarker;
  }, []);

  // Update center
  useEffect(() => {
    if (!mapRef.current) return;
    circleRef.current?.setCenter(center);
    centerMarkerRef.current?.setPosition(center);
    mapRef.current.panTo(center);
  }, [center]);

  // Update radius + zoom to fit
  useEffect(() => {
    if (!circleRef.current || !mapRef.current) return;
    circleRef.current.setRadius(radiusKm * 1000);
    const bounds = circleRef.current.getBounds();
    if (bounds) mapRef.current.fitBounds(bounds, 40);
  }, [radiusKm]);

  // Render property markers
  useEffect(() => {
    if (!mapRef.current) return;
    const map = mapRef.current;
    const existing = markersRef.current;
    const nextIds = new Set(properties.map((p) => p.id));

    // remove old
    existing.forEach((m, id) => {
      if (!nextIds.has(id)) {
        m.setMap(null);
        existing.delete(id);
      }
    });

    properties.forEach((p) => {
      let m = existing.get(p.id);
      const isSelected = p.id === selectedId;
      const label = `$${Math.round(p.price / 1000)}k`;
      if (!m) {
        m = new google.maps.Marker({
          map,
          position: { lat: p.lat, lng: p.lng },
          label: {
            text: label,
            color: "#fff",
            fontSize: "11px",
            fontWeight: "600",
          },
          icon: pillIcon(isSelected),
        });
        m.addListener("click", () => onSelect(p.id));
        existing.set(p.id, m);
      } else {
        m.setIcon(pillIcon(isSelected));
        m.setLabel({
          text: label,
          color: "#fff",
          fontSize: "11px",
          fontWeight: "600",
        });
      }
    });
  }, [properties, selectedId, onSelect]);

  return <div ref={ref} className="h-full w-full" />;
}

function pillIcon(selected: boolean): google.maps.Symbol {
  return {
    path: "M -22,-12 A 12,12 0 0 1 -10,-24 L 10,-24 A 12,12 0 0 1 22,-12 L 22,-12 A 12,12 0 0 1 10,0 L 4,0 L 0,6 L -4,0 L -10,0 A 12,12 0 0 1 -22,-12 Z",
    fillColor: selected ? "#0f172a" : "#c2410c",
    fillOpacity: 1,
    strokeColor: "#fff",
    strokeWeight: 2,
    scale: 1,
    labelOrigin: new google.maps.Point(0, -12),
    anchor: new google.maps.Point(0, 6),
  };
}
