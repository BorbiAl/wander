'use client';

import { useEffect, useRef, useState } from 'react';
import { MapContainer, TileLayer, CircleMarker, Popup, useMap } from 'react-leaflet';
import type { Map as LeafletMap } from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { VILLAGES } from '@/app/lib/data';
import { cwsColor } from '@/app/lib/utils';
import type { Village } from '@/app/lib/data';
import type { SeedStatus } from '@/app/lib/store';

// Recenter map whenever seedStatus changes to 'done' (new destination seeded)
function AutoCenter({ seedStatus }: { seedStatus: SeedStatus }) {
  const map = useMap();
  useEffect(() => {
    if (VILLAGES.length === 0) return;
    const lats = VILLAGES.map(v => v.lat);
    const lngs = VILLAGES.map(v => v.lng);
    const centerLat = (Math.min(...lats) + Math.max(...lats)) / 2;
    const centerLng = (Math.min(...lngs) + Math.max(...lngs)) / 2;
    const latSpan = Math.max(...lats) - Math.min(...lats);
    const lngSpan = Math.max(...lngs) - Math.min(...lngs);
    const span = Math.max(latSpan, lngSpan);
    // Rough zoom: wider span = lower zoom
    const zoom = span < 0.5 ? 12 : span < 2 ? 10 : span < 5 ? 8 : span < 15 ? 7 : 5;
    map.setView([centerLat, centerLng], zoom);
  }, [map, seedStatus]);
  return null;
}

export default function VillageMap({
  onSelectVillage,
  visited = [],
  seedStatus = 'idle',
}: {
  onSelectVillage?: (v: Village) => void;
  visited?: string[];
  seedStatus?: SeedStatus;
}) {
  const mapRef = useRef<LeafletMap | null>(null);
  // Re-read VILLAGES from the mutable array when seed completes
  const [villages, setVillages] = useState([...VILLAGES]);
  useEffect(() => {
    setVillages([...VILLAGES]);
  }, [seedStatus]);

  const villagesToShow = visited.length > 0
    ? villages.filter(v => visited.includes(v.name))
    : villages;

  // Initial center: compute from current VILLAGES (or world default)
  const lats = villages.map(v => v.lat);
  const lngs = villages.map(v => v.lng);
  const initLat = lats.length ? (Math.min(...lats) + Math.max(...lats)) / 2 : 20;
  const initLng = lngs.length ? (Math.min(...lngs) + Math.max(...lngs)) / 2 : 0;

  return (
    <div className="w-full h-full relative z-0 overflow-hidden rounded-3xl border border-[#D6DCCD]">
      <MapContainer
        center={[initLat, initLng]}
        zoom={7}
        style={{ width: '100%', height: '100%', background: '#E5E9DF', borderRadius: '1.5rem' }}
        zoomControl={false}
        ref={mapRef}
      >
        <TileLayer
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
        />
        <AutoCenter seedStatus={seedStatus} />
        {villagesToShow.map(village => (
          <CircleMarker
            key={village.id}
            center={[village.lat, village.lng]}
            radius={8}
            pathOptions={{
              color: cwsColor(village.cws),
              fillColor: cwsColor(village.cws),
              fillOpacity: 0.8,
              weight: 2,
            }}
            eventHandlers={{
              click: () => onSelectVillage && onSelectVillage(village),
            }}
          >
            <Popup className="custom-popup">
              <div className="bg-white/60 backdrop-blur-md border border-white/50 shadow-sm rounded-card p-3 text-[#1A2E1C] min-w-[200px]">
                <h3 className="font-display text-lg mb-1 text-[#1A2E1C]">{village.name}</h3>
                <div className="text-[10px] uppercase text-[#1A2E1C]/70 mb-3 bg-[#E2E7DA] inline-block px-2 py-0.5 rounded-pill border border-[#D6DCCD]">
                  {village.region}
                </div>
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-xs text-[#1A2E1C]/70">CWS Score</span>
                  <span className="font-bold" style={{ color: cwsColor(village.cws) }}>{village.cws}</span>
                </div>
                <div className="w-full h-1.5 bg-[#D6DCCD] rounded-full mb-4 overflow-hidden">
                  <div className="h-full" style={{ width: `${village.cws}%`, backgroundColor: cwsColor(village.cws) }} />
                </div>
              </div>
            </Popup>
          </CircleMarker>
        ))}
      </MapContainer>

      <div className="absolute top-4 left-4 bg-[#F4EDE2E6] backdrop-blur border border-[#D6DCCD] rounded-card p-3 z-[400] text-[10px] text-[#1A2E1C] flex flex-col gap-2">
        <div className="flex items-center gap-2"><div className="w-2.5 h-2.5 rounded-full bg-accent" /> High CWS</div>
        <div className="flex items-center gap-2"><div className="w-2.5 h-2.5 rounded-full bg-amber" /> Medium</div>
        <div className="flex items-center gap-2"><div className="w-2.5 h-2.5 rounded-full" style={{background:'#FF4444'}} /> Pioneer territory</div>
      </div>
    </div>
  );
}
