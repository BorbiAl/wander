'use client';

import { useEffect, useState } from 'react';
import QRCode from 'qrcode';

export function ProfileQR({ url, size = 180 }: { url: string; size?: number }) {
  const [dataUrl, setDataUrl] = useState<string | null>(null);

  useEffect(() => {
    if (!url) return;
    QRCode.toDataURL(url, {
      width: size,
      margin: 1,
      color: { dark: '#1A2E1C', light: '#F4EDE2' },
    }).then(setDataUrl).catch(() => setDataUrl(null));
  }, [url, size]);

  if (!dataUrl) {
    return (
      <div
        className="flex items-center justify-center bg-surface rounded-card"
        style={{ width: size, height: size }}
      >
        <span className="text-text-3 text-xs">Generating…</span>
      </div>
    );
  }

  return (
    <img
      src={dataUrl}
      alt="Your profile QR code"
      width={size}
      height={size}
      className="rounded-card"
    />
  );
}
