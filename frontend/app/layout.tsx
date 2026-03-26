import type { Metadata } from 'next';
import { Playfair_Display, DM_Sans } from 'next/font/google';
import './globals.css';
import { AppProvider } from './lib/store';
import { DataProvider } from './lib/DataProvider';
import { Navbar } from '@/components/Navbar';

const playfair = Playfair_Display({ subsets: ['latin'], variable: '--font-display' });
const dmSans = DM_Sans({ subsets: ['latin'], variable: '--font-sans' });

export const metadata: Metadata = {
  title: 'WanderGraph',
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
        <link rel="preload" as="image" href="https://unpkg.com/three-globe/example/img/earth-day.jpg" />
      </head>
      <body suppressHydrationWarning className="bg-bg text-text-1 font-sans min-h-screen flex flex-col">
        <AppProvider>
          <DataProvider>
            <Navbar />
            <main className="flex-1 pt-14 pb-20 md:pb-0">
              {children}
            </main>
          </DataProvider>
        </AppProvider>
      </body>
    </html>
  );
}
