'use client';

import { useEffect, useRef, useState, useMemo } from 'react';
import dynamic from 'next/dynamic';
import { useRouter } from 'next/navigation';
import { useApp } from '../app/lib/store';

// Dynamically import Globe as it uses browser APIs and can't be SSR'd
const Globe = dynamic(() => import('react-globe.gl'), { ssr: false });

export const DESTINATIONS = [
  { name: 'Rural Tuscany, Italy', lat: 43.1122, lng: 11.1198 },
  { name: 'Oaxaca highlands, Mexico', lat: 17.0732, lng: -96.7266 },
  { name: 'Cappadocia, Turkey', lat: 38.6431, lng: 34.8289 },
  { name: 'Transylvania, Romania', lat: 46.7712, lng: 23.6236 },
  { name: 'Rhodope Mountains, Bulgaria', lat: 41.7725, lng: 24.3217 },
  { name: 'Kerala backwaters, India', lat: 9.9312, lng: 76.2673 },
  { name: 'Faroe Islands', lat: 61.8926, lng: -6.9118 },
  { name: 'Atlas Mountains, Morocco', lat: 31.2589, lng: -7.9897 },
  { name: 'Patagonia, Argentina', lat: -50.2185, lng: -72.771 },
  { name: 'Yunnan province, China', lat: 25.0453, lng: 102.7100 },
  { name: 'Kyoto, Japan', lat: 35.0116, lng: 135.7681 }
];

export default function MarketingGlobe() {
  const router = useRouter();
  const globeRef = useRef<any>(null);
  const { seedLocation } = useApp();
  const [windowSize, setWindowSize] = useState({ width: 0, height: 0 });
  const [globeReady, setGlobeReady] = useState(false);

  useEffect(() => {
    const handleResize = () => setWindowSize({ width: window.innerWidth, height: window.innerHeight });
    window.addEventListener('resize', handleResize);
    handleResize(); // set initial size

    return () => window.removeEventListener('resize', handleResize);
  }, []);

  useEffect(() => {
    // Start rotating the globe automatically on mount
    if (globeRef.current && globeReady) {
      const controls = globeRef.current.controls();
      controls.autoRotate = true;
      controls.autoRotateSpeed = 0.5;
      controls.enableZoom = false; // Disable zooming so it doesn't mess with the layout
    }
  }, [globeReady]);

  const handlePointClick = (point: any) => {
    seedLocation(point.name);
    router.push('/onboarding');
  };

  if (windowSize.width === 0) return null;
  
  return (
    <div className="absolute inset-0 flex items-center justify-center -z-10 overflow-visible touch-none">
      <div className="opacity-90 transition-opacity duration-1000 ease-in-out">
        <Globe
          ref={globeRef}
          width={windowSize.width}
          height={windowSize.height}
          globeImageUrl="//unpkg.com/three-globe/example/img/earth-day.jpg"
          backgroundColor="rgba(0,0,0,0)"
          atmosphereColor="#0B6E2A"
          atmosphereAltitude={0.15}
          
          ringsData={DESTINATIONS}
          ringColor={() => '#0B6E2A'}
          ringMaxRadius={2}
          ringPropagationSpeed={2}
          ringRepeatPeriod={1500}

          pointsData={DESTINATIONS}
          pointLat="lat"
          pointLng="lng"
          pointColor={() => "#0B6E2A"}
          pointAltitude={0.08}
          pointRadius={0.5}
          pointsMerge={false}
          onPointClick={handlePointClick}
          
          htmlElementsData={DESTINATIONS}
          htmlElement={(d: any) => {
            const el = document.createElement('div');
            el.innerHTML = `<div class="cursor-pointer hover:scale-105 transition-all bg-white rounded-2xl px-4 py-3 border border-black/5 shadow-[0_10px_30px_rgba(0,0,0,0.1)] flex flex-col -translate-x-1/2 -translate-y-[120%] select-none pointer-events-auto min-w-max">
              <span class="text-[10px] font-bold tracking-wider text-black/40 uppercase mb-1">Impact Node</span>
              <span class="text-[#1A2E1C] text-sm font-display font-semibold mb-0.5 leading-none">${d.name.split(',')[0]}</span>
              <span class="text-[#1A2E1C]/60 text-xs font-medium">${d.name.split(',')[1] || d.name}</span>
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
    </div>
  );
}
