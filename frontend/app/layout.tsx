import type { Metadata } from 'next';
import { Playfair_Display, DM_Sans } from 'next/font/google';
import './globals.css';
import { AppProvider } from './lib/store';
import { DataProvider } from './lib/DataProvider';
import { Navbar } from '@/components/Navbar';

const playfair = Playfair_Display({ subsets: ['latin'], variable: '--font-display' });
const dmSans = DM_Sans({ subsets: ['latin'], variable: '--font-sans' });

export const metadata: Metadata = {
  title: 'Wander',
  description: 'Travel with purpose.',
};

export const viewport = {
  width: 'device-width',
  initialScale: 1,
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${playfair.variable} ${dmSans.variable}`}>
      <head>
        {/* Early connections for external origins used after the landing page loads */}
        <link rel="preconnect" href="https://picsum.photos" crossOrigin="anonymous" />
        <link rel="dns-prefetch" href="https://picsum.photos" />
        <link rel="dns-prefetch" href="https://nominatim.openstreetmap.org" />
      </head>
      <body suppressHydrationWarning className="bg-[#E5E9DF] text-[#1A2E1C] font-sans antialiased min-h-screen flex flex-col selection:bg-[#0B6E2A]/20">
        <AppProvider>
          <DataProvider>
            <Navbar />
            <main className="flex-1 pt-16 md:pt-[72px] pb-[calc(4.75rem+env(safe-area-inset-bottom))] md:pb-0">
              {children}
            </main>
          </DataProvider>
        </AppProvider>
      </body>
    </html>
  );
}
