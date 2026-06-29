'use client';

import { useEffect, useRef, useState } from 'react';
import { Trackpoint } from '../utils/tcxParser';
import 'leaflet/dist/leaflet.css';

interface RunningMapProps {
  trackpoints: Trackpoint[];
  sport: string;
}

export default function RunningMap({ trackpoints, sport }: RunningMapProps) {
  const mapRef = useRef<any>(null);
  const [L, setL] = useState<any>(null);
  const [mapContainerId] = useState(() => `map-${Math.random().toString(36).substr(2, 9)}`);

  // Load Leaflet dynamically on the client
  useEffect(() => {
    import('leaflet').then((leaflet) => {
      setL(leaflet.default);
    });
  }, []);

  // Filter trackpoints that have coordinates
  const gpsPoints = trackpoints.filter(
    (tp) => tp.latitude !== undefined && tp.longitude !== undefined
  ) as Array<Required<Pick<Trackpoint, 'latitude' | 'longitude'>> & Trackpoint>;

  const hasGPS = gpsPoints.length > 0;

  useEffect(() => {
    if (!L || !hasGPS || !mapRef.current) return;

    // Clear previous map instance if it exists
    const container = L.DomUtil.get(mapContainerId);
    if (container && (container as any)._leaflet_id) {
      return; // Leaflet already initialized on this container
    }

    const coords = gpsPoints.map((p) => [p.latitude, p.longitude] as [number, number]);
    const startCoord = coords[0];
    const endCoord = coords[coords.length - 1];

    // Initialize map
    const map = L.map(mapContainerId, {
      zoomControl: false,
      scrollWheelZoom: true,
    });

    // Use a beautiful dark tile layer for the dark mode theme
    L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', {
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>',
      subdomains: 'abcd',
      maxZoom: 20,
    }).addTo(map);

    // Zoom control on bottom right
    L.control.zoom({ position: 'bottomright' }).addTo(map);

    // Draw the running path with a glowing neon cyan polyline
    const path = L.polyline(coords, {
      color: '#06b6d4', // Cyan 500
      weight: 5,
      opacity: 0.85,
      lineJoin: 'round',
    }).addTo(map);

    // Add a subtle glow behind the path
    L.polyline(coords, {
      color: '#22d3ee', // Cyan 400
      weight: 10,
      opacity: 0.25,
      lineJoin: 'round',
    }).addTo(map);

    // Custom start marker: Neon Green Dot
    const startIcon = L.divIcon({
      className: 'custom-map-marker',
      html: `
        <div class="relative flex items-center justify-center h-6 w-6">
          <span class="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
          <span class="relative inline-flex rounded-full h-3.5 w-3.5 bg-emerald-500 border border-white"></span>
        </div>
      `,
      iconSize: [24, 24],
      iconAnchor: [12, 12],
    });

    // Custom end marker: Neon Rose Dot
    const endIcon = L.divIcon({
      className: 'custom-map-marker',
      html: `
        <div class="relative flex items-center justify-center h-6 w-6">
          <span class="animate-pulse absolute inline-flex h-full w-full rounded-full bg-rose-400 opacity-50"></span>
          <span class="relative inline-flex rounded-full h-3.5 w-3.5 bg-rose-500 border border-white"></span>
        </div>
      `,
      iconSize: [24, 24],
      iconAnchor: [12, 12],
    });

    L.marker(startCoord, { icon: startIcon }).addTo(map).bindPopup('Start Point');
    L.marker(endCoord, { icon: endIcon }).addTo(map).bindPopup('End Point');

    // Fit map bounds to show the entire run path
    map.fitBounds(path.getBounds(), { padding: [30, 30] });

    return () => {
      map.remove();
    };
  }, [L, hasGPS, gpsPoints, mapContainerId]);

  if (!hasGPS) {
    return (
      <div className="flex flex-col items-center justify-center h-[350px] md:h-[400px] w-full rounded-2xl bg-zinc-900 border border-zinc-800 p-8 text-center overflow-hidden relative">
        {/* Abstract design elements */}
        <div className="absolute inset-0 bg-gradient-to-tr from-cyan-500/5 to-purple-500/5 pointer-events-none" />
        <div className="absolute -top-24 -left-24 h-48 w-48 rounded-full bg-cyan-500/10 blur-3xl pointer-events-none" />
        <div className="absolute -bottom-24 -right-24 h-48 w-48 rounded-full bg-purple-500/10 blur-3xl pointer-events-none" />

        <div className="relative z-10 max-w-sm flex flex-col items-center">
          <div className="mb-4 h-16 w-16 rounded-full bg-zinc-800/80 flex items-center justify-center border border-zinc-700 animate-pulse">
            <svg className="w-8 h-8 text-cyan-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
            </svg>
          </div>
          <h3 className="text-lg font-semibold text-zinc-100 mb-2">Treadmill Activity Detected</h3>
          <p className="text-sm text-zinc-400">
            This activity was recorded as an indoor treadmill run. No GPS route data is available.
          </p>
          <div className="mt-6 flex flex-wrap gap-2 justify-center">
            <span className="px-3 py-1 rounded-full text-xs font-semibold bg-cyan-500/10 text-cyan-400 border border-cyan-500/20">
              Indoor Workout
            </span>
            <span className="px-3 py-1 rounded-full text-xs font-semibold bg-purple-500/10 text-purple-400 border border-purple-500/20">
              Sensor Tracking
            </span>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="h-[350px] md:h-[400px] w-full rounded-2xl bg-zinc-900 border border-zinc-800 overflow-hidden relative shadow-2xl">
      <div className="absolute top-4 left-4 z-[1000] bg-zinc-950/80 backdrop-blur-md px-3 py-1.5 rounded-lg border border-zinc-800 flex items-center gap-2">
        <span className="relative flex h-2 w-2">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-cyan-400 opacity-75"></span>
          <span className="relative inline-flex rounded-full h-2 w-2 bg-cyan-500"></span>
        </span>
        <span className="text-xs font-semibold text-zinc-300">GPS Route Active</span>
      </div>
      <div id={mapContainerId} className="h-full w-full" ref={mapRef} />
    </div>
  );
}
