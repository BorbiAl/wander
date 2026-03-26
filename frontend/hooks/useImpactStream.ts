'use client';

import { useEffect, useState, useRef } from 'react';

export type ImpactEvent = {
  booking_id: number;
  experience_id: string;
  village_id: string;
  amount_eur: number;
  money_flow: { host: number; community: number; culture: number; platform: number };
  cws_before: number;
  cws_after: number;
  cws_delta: number;
  user_id: string;
  score_earned: number;
};

export function useImpactStream() {
  const [impacts, setImpacts] = useState<ImpactEvent[]>([]);
  const [connected, setConnected] = useState(false);
  const wsRef = useRef<WebSocket | null>(null);
  const retryRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    let cancelled = false;

    function connect() {
      if (cancelled) return;
      try {
        const ws = new WebSocket('ws://bvsqr.eu/ws');
        wsRef.current = ws;

        ws.onopen = () => {
          if (!cancelled) setConnected(true);
        };

        ws.onclose = () => {
          if (!cancelled) {
            setConnected(false);
            // Reconnect after 2s
            retryRef.current = setTimeout(connect, 2000);
          }
        };

        ws.onerror = () => {
          ws.close();
        };

        ws.onmessage = (event) => {
          try {
            const msg = JSON.parse(event.data);
            if (msg.type === 'IMPACT_UPDATE' && msg.data) {
              setImpacts(prev => [msg.data as ImpactEvent, ...prev].slice(0, 50));
            }
          } catch {
            // ignore malformed frames
          }
        };
      } catch {
        // WebSocket constructor can throw if URL is invalid
        retryRef.current = setTimeout(connect, 2000);
      }
    }

    connect();

    return () => {
      cancelled = true;
      if (retryRef.current) clearTimeout(retryRef.current);
      if (wsRef.current) wsRef.current.close();
    };
  }, []);

  return { impacts, connected };
}
