'use client';

import { useEffect, useLayoutEffect, useRef, useState, useMemo } from 'react';
// Direct import — this component is already wrapped in next/dynamic({ ssr: false })
// from page.tsx, so it never runs on the server. A second dynamic() here would create
// a sequential waterfall (MarketingGlobe chunk → react-globe.gl chunk). Import it
// directly so both land in the same lazy chunk.
import Globe from 'react-globe.gl';

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
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const globeRef = useRef<any>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [windowSize, setWindowSize] = useState({ width: 0, height: 0 });
  const [inlineSize, setInlineSize] = useState({ width: 0, height: 0 });
  const [globeReady, setGlobeReady] = useState(false);

  const points = useMemo(
    () => (destinations.length > 0 ? destinations : DEFAULT_DESTINATIONS),
    [destinations],
  );

  // Full-screen mode: track window size
  useEffect(() => {
    if (inline) return;
    const handleResize = () => setWindowSize({ width: window.innerWidth, height: window.innerHeight });
    window.addEventListener('resize', handleResize);
    handleResize();
    return () => window.removeEventListener('resize', handleResize);
  }, [inline]);

  // Inline mode: measure the container immediately (useLayoutEffect runs before paint,
  // so we get dimensions in the same frame as mount — no ResizeObserver callback delay).
  useLayoutEffect(() => {
    if (!inline || !containerRef.current) return;

    // Immediate read — avoids waiting for the first ResizeObserver tick
    const rect = containerRef.current.getBoundingClientRect();
    if (rect.width > 0 && rect.height > 0) {
      setInlineSize({ width: rect.width, height: rect.height });
    }

    // Keep updating on subsequent resizes
    const observer = new ResizeObserver((entries) => {
      const r = entries[0].contentRect;
      setInlineSize({ width: r.width, height: r.height });
    });
    observer.observe(containerRef.current);
    return () => observer.disconnect();
  }, [inline]);

  // Configure camera and auto-rotation once the globe's WebGL scene is ready
  useEffect(() => {
    if (!globeRef.current || !globeReady) return;
    const controls = globeRef.current.controls();
    controls.autoRotate = true;
    controls.autoRotateSpeed = 0.5;
    controls.enableZoom = true;
    globeRef.current.pointOfView({ lat: 20, lng: 0, altitude: inline ? 1.8 : 1.7 }, 0);
  }, [globeReady, inline]);

  const handlePointClick = (point: object) => {
    const node = point as DestinationNode;
    onSelect(node.name);
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
        <div
          className="transition-opacity duration-300 ease-in-out"
          style={{ opacity: globeReady ? 0.9 : 0 }}
        >
          <Globe
            ref={globeRef}
            width={width}
            height={height}
            globeImageUrl="/assets/earth-day.jpg"
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
            pointColor={() => '#0B6E2A'}
            pointAltitude={0.08}
            pointRadius={0.5}
            pointsMerge={false}
            onPointClick={handlePointClick}

            // Defer city labels until the sphere is visible — creating 30+ DOM nodes
            // with event listeners before the globe is painted blocks the initial render.
            htmlElementsData={globeReady ? points : []}
            htmlElement={(d: object) => {
              const node = d as DestinationNode;
              const el = document.createElement('div');
              el.innerHTML = `<div class="cursor-pointer hover:scale-105 transition-all bg-white rounded-2xl px-4 py-3 border border-black/5 shadow-[0_10px_30px_rgba(0,0,0,0.1)] flex flex-col -translate-x-1/2 -translate-y-[120%] select-none pointer-events-auto min-w-max">
                <span class="text-[10px] font-bold tracking-wider text-black/40 uppercase mb-1">City Hub</span>
                <span class="text-[#1A2E1C] text-sm font-display font-semibold mb-0.5 leading-none">${node.city}</span>
                <span class="text-[#1A2E1C]/60 text-xs font-medium">${node.country}</span>
              </div>`;
              el.style.pointerEvents = 'none';
              el.firstChild?.addEventListener('mousedown', (e) => {
                e.stopPropagation();
                handlePointClick(node);
              });
              el.firstChild?.addEventListener('touchstart', (e) => {
                e.stopPropagation();
                handlePointClick(node);
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
