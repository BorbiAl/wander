'use client';

import { useEffect } from 'react';
import { MapContainer, TileLayer, CircleMarker, Popup } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import { VILLAGES } from '@/app/lib/data';
import { cwsColor } from '@/app/lib/utils';
import type { Village } from '@/app/lib/data';

export default function VillageMap({ 
  onSelectVillage, visited = [] 
}: { 
  onSelectVillage?: (v: Village) => void, visited?: string[] 
}) {
  const villagesToShow = visited.length > 0 ? VILLAGES.filter(v => visited.includes(v.name)) : VILLAGES;

  return (
    <div className="w-full h-full relative z-0">
      <MapContainer 
        center={[42.7, 25.5]} 
        zoom={7} 
        style={{ width: '100%', height: '100%', background: '#080808' }}
        zoomControl={false}
      >
        <TileLayer
          url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>'
        />
        {villagesToShow.map(village => (
          <CircleMarker
            key={village.id}
            center={[village.lat, village.lng]}
            radius={8}
            pathOptions={{ 
              color: cwsColor(village.cws), 
              fillColor: cwsColor(village.cws), 
              fillOpacity: 0.8,
              weight: 2
            }}
            eventHandlers={{
              click: () => onSelectVillage && onSelectVillage(village)
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

      {/* Legend */}
      <div className="absolute top-4 left-4 bg-surface/90 backdrop-blur border border-[#333] rounded-card p-3 z-[400] text-[10px] flex flex-col gap-2">
        <div className="flex items-center gap-2"><div className="w-2.5 h-2.5 rounded-full bg-accent" /> High CWS</div>
        <div className="flex items-center gap-2"><div className="w-2.5 h-2.5 rounded-full bg-amber" /> Medium</div>
        <div className="flex items-center gap-2"><div className="w-2.5 h-2.5 rounded-full bg-red" /> Pioneer territory</div>
      </div>
    </div>
  );
}
