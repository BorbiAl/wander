'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useApp } from '@/app/lib/store';
import { Map, Zap, User, Home, GitFork } from 'lucide-react';

export function Navbar() {
  const pathname = usePathname();
  const { personality, bookings } = useApp();

  const navItems = [
    { label: 'Discover', href: '/discover', icon: Map },
    { label: 'Impact', href: '/impact', icon: Zap, badge: bookings.length },
    { label: 'Graph', href: '/graph', icon: GitFork },
    { label: 'Profile', href: '/profile', icon: User },
  ];

  return (
    <>
      <nav className="fixed top-0 left-0 right-0 h-14 bg-[#080808CC] backdrop-blur-sm border-b border-[#222] z-50 flex items-center justify-between px-4 md:px-8">
        <Link href="/" className="flex items-center gap-2">
          <span className="font-display text-accent text-xl font-bold">WG</span>
          <span className="text-white font-medium hidden sm:block">WanderGraph</span>
        </Link>

        <div className="hidden md:flex items-center gap-8">
          {navItems.map(item => (
            <Link 
              key={item.href} 
              href={item.href}
              className={`text-sm font-medium transition-colors relative ${pathname === item.href ? 'text-white' : 'text-text-2 hover:text-white'}`}
            >
              {item.label}
              {(item.badge ?? 0) > 0 && (
                <span className="ml-2 bg-accent text-black text-[10px] px-1.5 py-0.5 rounded-full font-bold">
                  {item.badge}
                </span>
              )}
              {pathname === item.href && (
                <span className="absolute -bottom-[19px] left-0 right-0 h-0.5 bg-accent" />
              )}
            </Link>
          ))}
          {!personality && (
            <Link href="/onboarding" className="bg-surface-2 border border-[#333] text-accent text-xs px-4 py-1.5 rounded-pill hover:border-accent transition-colors">
              Complete onboarding →
            </Link>
          )}
        </div>
      </nav>

      {/* Mobile Bottom Nav */}
      <div className="md:hidden fixed bottom-0 left-0 right-0 h-16 bg-[#080808F0] backdrop-blur-md border-t border-[#222] z-50 flex items-center justify-around px-2">
        <Link href="/" className={`flex flex-col items-center gap-1 ${pathname === '/' ? 'text-accent' : 'text-text-2'}`}>
          <Home size={20} />
          <span className="text-[10px]">Home</span>
        </Link>
        {navItems.map(item => (
          <Link 
            key={item.href} 
            href={item.href}
            className={`flex flex-col items-center gap-1 relative ${pathname === item.href ? 'text-accent' : 'text-text-2'}`}
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
    </>
  );
}
