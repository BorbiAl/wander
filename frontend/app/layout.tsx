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

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${playfair.variable} ${dmSans.variable}`}>
      <body suppressHydrationWarning className="bg-bg text-text-1 font-sans min-h-screen flex flex-col">
        <AppProvider>
          <DataProvider>
            <Navbar />
            <main className="flex-1 pt-14">
              {children}
            </main>
          </DataProvider>
        </AppProvider>
      </body>
    </html>
  );
}
