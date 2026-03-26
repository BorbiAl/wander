'use client';

import { useEffect, useRef, useState, useMemo } from 'react';
import dynamic from 'next/dynamic';

// Dynamically import Globe as it uses browser APIs and can't be SSR'd
const Globe = dynamic(() => import('react-globe.gl'), { ssr: false });

export type DestinationNode = {
  name: string;
  city: string;
  country: string;
  lat: number;
  lng: number;
  villages: number;
};

export const DEFAULT_DESTINATIONS: DestinationNode[] = [
  { name: 'Sofia, Bulgaria', city: 'Sofia', country: 'Bulgaria', lat: 42.6977, lng: 23.3219, villages: 1 },
];

type MarketingGlobeProps = {
  destinations: DestinationNode[];
  onSelect: (location: string) => void;
  inline?: boolean;
  allowOverflow?: boolean;
  className?: string;
};

export default function MarketingGlobe({
  destinations,
  onSelect,
  inline = false,
  allowOverflow = false,
  className = '',
}: MarketingGlobeProps) {
  const globeRef = useRef<any>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [windowSize, setWindowSize] = useState({ width: 0, height: 0 });
  const [inlineSize, setInlineSize] = useState({ width: 0, height: 0 });
  const [globeReady, setGlobeReady] = useState(false);
  const points = useMemo(
    () => (destinations.length > 0 ? destinations : DEFAULT_DESTINATIONS),
    [destinations]
  );

  useEffect(() => {
    if (inline) return;

    const handleResize = () => setWindowSize({ width: window.innerWidth, height: window.innerHeight });
    window.addEventListener('resize', handleResize);
    handleResize(); // set initial size

    return () => window.removeEventListener('resize', handleResize);
  }, [inline]);

  useEffect(() => {
    if (!inline || !containerRef.current) return;

    const observer = new ResizeObserver((entries) => {
      const rect = entries[0].contentRect;
      setInlineSize({ width: rect.width, height: rect.height });
    });

    observer.observe(containerRef.current);
    return () => observer.disconnect();
  }, [inline]);

  useEffect(() => {
    // Start rotating the globe automatically on mount
    if (globeRef.current && globeReady) {
      const controls = globeRef.current.controls();
      controls.autoRotate = true;
      controls.autoRotateSpeed = 0.5;
      controls.enableZoom = false; // Disable zooming so it doesn't mess with the layout

      // Bring camera closer so the sphere appears larger within the same canvas.
      globeRef.current.pointOfView(
        { lat: 20, lng: 0, altitude: inline ? 1.8 : 1.7 },
        0
      );
    }
  }, [globeReady, inline]);

  const handlePointClick = (point: any) => {
    onSelect(point.name);
  };

  const width = inline ? inlineSize.width : windowSize.width;
  const height = inline ? inlineSize.height : windowSize.height;
  const canRenderGlobe = width > 0 && height > 0;
  
  return (
    <div
      ref={containerRef}
      className={
        inline
          ? `relative h-full w-full ${allowOverflow ? 'overflow-visible' : 'overflow-hidden'} touch-none ${className}`
          : `absolute inset-0 z-0 flex items-center justify-center overflow-visible touch-none ${className}`
      }
    >
      {canRenderGlobe && (
        <div className="opacity-90 transition-opacity duration-1000 ease-in-out">
          <Globe
            ref={globeRef}
            width={width}
            height={height}
            globeImageUrl="//unpkg.com/three-globe/example/img/earth-day.jpg"
            backgroundColor="rgba(0,0,0,0)"
            atmosphereColor="#0B6E2A"
            atmosphereAltitude={0.15}
            
            ringsData={points}
            ringColor={() => '#0B6E2A'}
            ringMaxRadius={2}
            ringPropagationSpeed={2}
            ringRepeatPeriod={1500}

            pointsData={points}
            pointLat="lat"
            pointLng="lng"
            pointColor={() => "#0B6E2A"}
            pointAltitude={0.08}
            pointRadius={0.5}
            pointsMerge={false}
            onPointClick={handlePointClick}
            
            htmlElementsData={points}
            htmlElement={(d: any) => {
              const el = document.createElement('div');
              el.innerHTML = `<div class="cursor-pointer hover:scale-105 transition-all bg-white rounded-2xl px-4 py-3 border border-black/5 shadow-[0_10px_30px_rgba(0,0,0,0.1)] flex flex-col -translate-x-1/2 -translate-y-[120%] select-none pointer-events-auto min-w-max">
                <span class="text-[10px] font-bold tracking-wider text-black/40 uppercase mb-1">City Hub</span>
                <span class="text-[#1A2E1C] text-sm font-display font-semibold mb-0.5 leading-none">${d.city}</span>
                <span class="text-[#1A2E1C]/60 text-xs font-medium">${d.country}</span>
              </div>`;
              el.style.pointerEvents = 'none';
              // Also enable click on the label themselves!
              el.firstChild?.addEventListener('mousedown', (e) => {
                e.stopPropagation();
                handlePointClick(d);
              });
              el.firstChild?.addEventListener('touchstart', (e) => {
                e.stopPropagation();
                handlePointClick(d);
              }, { passive: true });
              return el;
            }}
            
            onGlobeReady={() => setGlobeReady(true)}
          />
        </div>
      )}
    </div>
  );
}
