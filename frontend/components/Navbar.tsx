'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useApp } from '@/app/lib/store';
import { Map, Zap, User, Home, GitFork, Globe } from 'lucide-react';

export function Navbar() {
  const pathname = usePathname();
  const { bookings } = useApp();

  const navItems = [
    { label: 'Discover', href: '/discover', icon: Map },
    { label: 'Map', href: '/map', icon: Globe },
    { label: 'Impact', href: '/impact', icon: Zap, badge: bookings.length },
    { label: 'Graph', href: '/graph', icon: GitFork },
    { label: 'Profile', href: '/profile', icon: User },
  ];

  return (
    <div className="fixed bottom-0 left-0 right-0 z-50 border-t border-[#D6DCCD] bg-[#F4EDE2F2] backdrop-blur-md">
      <div className="mx-auto flex h-16 w-full max-w-5xl items-center gap-1 overflow-x-auto px-2 [padding-bottom:env(safe-area-inset-bottom)]">
        <Link href="/" className={`flex min-w-[64px] flex-col items-center gap-1 px-1 ${pathname === '/' ? 'text-accent' : 'text-text-2'}`}>
          <Home size={20} />
          <span className="text-[10px]">Home</span>
        </Link>
        {navItems.map(item => (
          <Link 
            key={item.href} 
            href={item.href}
            className={`relative flex min-w-[64px] flex-col items-center gap-1 px-1 ${pathname === item.href ? 'text-accent' : 'text-text-2'}`}
          >
            <item.icon size={20} />
            <span className="text-[10px]">{item.label}</span>
            {(item.badge ?? 0) > 0 && (
              <span className="absolute -top-1 -right-2 bg-accent text-black text-[9px] w-4 h-4 flex items-center justify-center rounded-full font-bold">
                {item.badge}
              </span>
            )}
          </Link>
        ))}
      </div>
    </div>
  );
}
