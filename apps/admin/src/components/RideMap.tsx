import { useEffect, useMemo, useState } from 'react';
import { MapContainer, Marker, Polyline, Popup, TileLayer, useMap, useMapEvents } from 'react-leaflet';
import L from 'leaflet';
import { useServices } from '@bd-cabs/core';
import 'leaflet/dist/leaflet.css';

/** Centre of Dhaka — sensible default view before any pins are dropped. */
export const DHAKA_CENTER: [number, number] = [23.78, 90.41];

export type MarkerKind = 'pickup' | 'destination' | 'driver' | 'vehicle';

export interface RideMapMarker {
  lat: number;
  lng: number;
  kind: MarkerKind;
  /** Tooltip/popup text shown on click. */
  label?: string;
}

interface RideMapProps {
  markers: RideMapMarker[];
  /** Called with the clicked coordinates — enables drop-a-pin selection. */
  onPick?: (lat: number, lng: number) => void;
  /** Draw a line between the pickup and destination pins when both exist. */
  route?: boolean;
  /** Keep all markers in view; pass false for interactive picking. Default true. */
  autoFit?: boolean;
  center?: [number, number];
  zoom?: number;
  height?: number | string;
}

/**
 * A lucide-style car glyph as inline SVG. We draw the vehicle pins with this
 * instead of an emoji (🚗) because regional/symbol emoji render inconsistently
 * across platforms — Windows in particular shows them as flat monochrome boxes.
 */
function carSvg(color: string): string {
  return `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="${color}" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" style="display:block">
      <path d="M19 17h2c.6 0 1-.4 1-1v-3c0-.9-.7-1.7-1.5-1.9C18.7 10.6 16 10 16 10s-1.3-1.4-2.2-2.3c-.5-.4-1.1-.7-1.8-.7H5c-.6 0-1.1.4-1.4.9l-1.4 2.9A3.7 3.7 0 0 0 1 12v4c0 .6.4 1 1 1h2"/>
      <circle cx="7" cy="17" r="2"/><path d="M9 17h6"/><circle cx="17" cy="17" r="2"/>
    </svg>`;
}

const PIN_STYLES: Record<MarkerKind, { color: string; letter?: string }> = {
  pickup: { color: '#198754', letter: 'A' }, // bootstrap success green
  destination: { color: '#dc3545', letter: 'B' }, // bootstrap danger red
  driver: { color: '#0d6efd' }, // bootstrap primary blue — car glyph
  vehicle: { color: '#6c757d' }, // bootstrap secondary grey — car glyph
};

/** A teardrop pin rendered as inline SVG so we don't depend on Leaflet's bundled icon assets. */
function pinIcon(kind: MarkerKind): L.DivIcon {
  const { color, letter } = PIN_STYLES[kind];
  const glyph = letter
    ? `<span style="font-size:13px;line-height:18px;font-weight:700;color:${color}">${letter}</span>`
    : carSvg(color);
  return L.divIcon({
    className: 'bdc-map-pin',
    html: `<div style="position:relative;width:30px;height:40px">
      <svg width="30" height="40" viewBox="0 0 30 40" xmlns="http://www.w3.org/2000/svg">
        <path d="M15 0C6.7 0 0 6.7 0 15c0 10.5 15 25 15 25s15-14.5 15-25C30 6.7 23.3 0 15 0z" fill="${color}"/>
        <circle cx="15" cy="15" r="9" fill="#fff"/>
      </svg>
      <span style="position:absolute;top:7px;left:0;width:30px;display:flex;justify-content:center">${glyph}</span>
    </div>`,
    iconSize: [30, 40],
    iconAnchor: [15, 40],
    popupAnchor: [0, -36],
  });
}

type LatLng = [number, number];

/**
 * Fetches the actual driving route geometry (following roads) between two points
 * via our backend route proxy, so the line on the map traces the streets rather
 * than cutting straight across the city — and the routing provider is never
 * called directly from the browser. Falls back to `null` on any failure; the
 * caller then draws a straight line so a route is always shown.
 */
function useRoadRoute(a: LatLng | null, b: LatLng | null): LatLng[] | null {
  const { endpoints } = useServices();
  const [coords, setCoords] = useState<LatLng[] | null>(null);
  const key = a && b ? `${a[0]},${a[1]};${b[0]},${b[1]}` : null;

  useEffect(() => {
    if (!a || !b) {
      setCoords(null);
      return;
    }
    let cancelled = false;
    endpoints.rides
      .route({ fromLat: a[0], fromLng: a[1], toLat: b[0], toLng: b[1] })
      .then((path) => {
        if (cancelled) return;
        // Backend already returns [lat, lng] points; 204 → null → straight-line fallback.
        setCoords(path?.coordinates?.length ? (path.coordinates as LatLng[]) : null);
      })
      .catch(() => {
        if (!cancelled) setCoords(null);
      });
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);

  return coords;
}

/** Bridges Leaflet map clicks to the React onPick callback. */
function ClickPicker({ onPick }: { onPick: (lat: number, lng: number) => void }) {
  useMapEvents({ click: (e) => onPick(e.latlng.lat, e.latlng.lng) });
  return null;
}

/** Keeps the visible markers in view as they change (e.g. a moving driver). */
function FitBounds({ markers }: { markers: RideMapMarker[] }) {
  const map = useMap();
  useEffect(() => {
    if (markers.length === 0) return;
    if (markers.length === 1) {
      map.setView([markers[0]!.lat, markers[0]!.lng], Math.max(map.getZoom(), 14));
      return;
    }
    map.fitBounds(
      markers.map((m) => [m.lat, m.lng] as [number, number]),
      { padding: [48, 48], maxZoom: 16 },
    );
  }, [map, markers]);
  return null;
}

/**
 * A Leaflet/OpenStreetMap map for the ride flows. Drops colour-coded pins for
 * pickup (A), destination (B), the assigned driver, and nearby vehicles, and —
 * when `onPick` is given — lets the user choose a point by clicking the map.
 */
export function RideMap({
  markers,
  onPick,
  route = false,
  autoFit = true,
  center = DHAKA_CENTER,
  zoom = 12,
  height = 320,
}: RideMapProps) {
  const endpoints = useMemo(() => {
    if (!route) return { a: null as LatLng | null, b: null as LatLng | null };
    const a = markers.find((m) => m.kind === 'pickup');
    const b = markers.find((m) => m.kind === 'destination');
    return {
      a: a ? ([a.lat, a.lng] as LatLng) : null,
      b: b ? ([b.lat, b.lng] as LatLng) : null,
    };
  }, [route, markers]);

  const roadRoute = useRoadRoute(endpoints.a, endpoints.b);

  // Prefer the road-following geometry; fall back to a straight line until/unless it loads.
  const line: LatLng[] | null =
    roadRoute ?? (endpoints.a && endpoints.b ? [endpoints.a, endpoints.b] : null);

  return (
    <MapContainer
      center={center}
      zoom={zoom}
      scrollWheelZoom
      style={{ height, width: '100%', borderRadius: '0.5rem', cursor: onPick ? 'crosshair' : 'grab' }}
    >
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />
      {onPick && <ClickPicker onPick={onPick} />}
      {autoFit && <FitBounds markers={markers} />}
      {line && (
        <Polyline
          positions={line}
          pathOptions={{
            color: '#198754',
            weight: 4,
            opacity: 0.7,
            // Solid line for the real road route; dashed while showing the straight-line fallback.
            dashArray: roadRoute ? undefined : '8 8',
          }}
        />
      )}
      {markers.map((m, i) => (
        <Marker key={`${m.kind}-${i}`} position={[m.lat, m.lng]} icon={pinIcon(m.kind)}>
          {m.label && <Popup>{m.label}</Popup>}
        </Marker>
      ))}
    </MapContainer>
  );
}
