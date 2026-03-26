'use client';

import { useEffect, useState } from 'react';
import { MapContainer, TileLayer, CircleMarker, Popup, useMap } from 'react-leaflet';
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
    <div className="w-full h-full relative z-0">
      <MapContainer
        center={[initLat, initLng]}
        zoom={7}
        style={{ width: '100%', height: '100%', background: '#080808' }}
        zoomControl={false}
      >
        <TileLayer
          url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>'
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
              <div className="bg-surface border border-[#333] rounded-card p-3 text-white min-w-[200px]">
                <h3 className="font-display text-lg mb-1">{village.name}</h3>
                <div className="text-[10px] uppercase text-text-2 mb-3 bg-surface-2 inline-block px-2 py-0.5 rounded-pill border border-[#333]">
                  {village.region}
                </div>
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-xs text-text-2">CWS Score</span>
                  <span className="font-bold" style={{ color: cwsColor(village.cws) }}>{village.cws}</span>
                </div>
                <div className="w-full h-1.5 bg-[#222] rounded-full mb-4 overflow-hidden">
                  <div className="h-full" style={{ width: `${village.cws}%`, backgroundColor: cwsColor(village.cws) }} />
                </div>
                {onSelectVillage && (
                  <button
                    onClick={() => onSelectVillage(village)}
                    className="w-full text-center text-xs text-black font-medium py-2 rounded-pill bg-accent hover:bg-accent-dim transition-colors"
                  >
                    View experiences →
                  </button>
                )}
              </div>
            </Popup>
          </CircleMarker>
        ))}
      </MapContainer>

      <div className="absolute top-4 left-4 bg-surface/90 backdrop-blur border border-[#333] rounded-card p-3 z-[400] text-[10px] flex flex-col gap-2">
        <div className="flex items-center gap-2"><div className="w-2.5 h-2.5 rounded-full bg-accent" /> High CWS</div>
        <div className="flex items-center gap-2"><div className="w-2.5 h-2.5 rounded-full bg-amber" /> Medium</div>
        <div className="flex items-center gap-2"><div className="w-2.5 h-2.5 rounded-full" style={{background:'#FF4444'}} /> Pioneer territory</div>
      </div>
    </div>
  );
}
