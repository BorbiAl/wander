'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useApp } from '@/app/lib/store';
import { Map, Zap, User, Home, GitFork, Globe, Users } from 'lucide-react';

export function Navbar() {
  const pathname = usePathname();
  const { personality, bookings, friends } = useApp();

  const navItems = [
    { label: 'Discover', href: '/discover', icon: Map },
    { label: 'Map', href: '/map', icon: Globe },
    { label: 'Impact', href: '/impact', icon: Zap, badge: bookings.length },
    { label: 'Graph', href: '/graph', icon: GitFork },
    { label: 'Friends', href: '/friends', icon: Users, badge: friends.length },
    { label: 'Profile', href: '/profile', icon: User },
  ];

  return (
    <>
      <nav className="fixed top-0 left-0 right-0 h-14 bg-[#F4EDE2EE] backdrop-blur-sm border-b border-[#D6DCCD] z-50 flex items-center justify-between px-4 md:px-8 font-sans">
        <Link href="/" className="flex items-center gap-2">
          <span className="font-display text-[#0B6E2A] text-xl font-bold">WG</span>
          <span className="text-[#1A2E1C] font-medium hidden sm:block">WanderGraph</span>
        </Link>

        <div className="hidden md:flex items-center gap-8">
          {navItems.map(item => (
            <Link
              key={item.href}
              href={item.href}
              className={`text-sm font-medium transition-colors relative ${pathname === item.href ? 'text-[#1A2E1C]' : 'text-[#1A2E1C]/65 hover:text-[#1A2E1C]'}`}
            >
              {item.label}
              {(item.badge ?? 0) > 0 && (
                <span className="ml-2 bg-[#0B6E2A] text-white text-[10px] px-1.5 py-0.5 rounded-full font-bold">
                  {item.badge}
                </span>
              )}
              {pathname === item.href && (
                <span className="absolute -bottom-[19px] left-0 right-0 h-0.5 bg-[#0B6E2A]" />
              )}
            </Link>
          ))}
          {!personality && (
            <Link href="/onboarding" className="bg-[#0B6E2A] border border-[#0B6E2A] text-white text-xs px-4 py-1.5 rounded-pill hover:bg-[#095A22] transition-colors">
              Start journey →
            </Link>
          )}
        </div>
      </nav>

      <div className="md:hidden fixed bottom-0 left-0 right-0 h-16 bg-[#F4EDE2F2] backdrop-blur-md border-t border-[#D6DCCD] z-50 flex items-center justify-around px-2 [padding-bottom:env(safe-area-inset-bottom)] font-sans">
        <Link href="/" className={`flex flex-col items-center gap-1 ${pathname === '/' ? 'text-[#0B6E2A]' : 'text-[#1A2E1C]/65'}`}>
          <Home size={20} />
          <span className="text-[10px]">Home</span>
        </Link>
        {navItems.map(item => (
          <Link
            key={item.href}
            href={item.href}
            className={`flex flex-col items-center gap-1 relative ${pathname === item.href ? 'text-[#0B6E2A]' : 'text-[#1A2E1C]/65'}`}
          >
            <item.icon size={20} />
            <span className="text-[10px]">{item.label}</span>
            {(item.badge ?? 0) > 0 && (
              <span className="absolute -top-1 -right-2 bg-[#0B6E2A] text-white text-[9px] w-4 h-4 flex items-center justify-center rounded-full font-bold">
                {item.badge}
              </span>
            )}
          </Link>
        ))}
      </div>
    </>
  );
}
