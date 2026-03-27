"use client";

import Image from 'next/image';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Compass, BarChart2, User, Users, Map as MapIcon } from 'lucide-react';

export function Navbar() {
  const pathname = usePathname();

  // Desktop Navigation items (excluding Mobile-only icons)
  const navItems = [
    { name: 'Discover', href: '/discover', icon: Compass },
    { name: 'Map', href: '/map', icon: MapIcon },
    { name: 'Impact', href: '/impact', icon: BarChart2 },
  ];

  // Mobile Bottom Tab Bar items
  const mobileNavItems = [
    { name: 'Discover', href: '/discover', icon: Compass },
    { name: 'Map', href: '/map', icon: MapIcon },
    { name: 'Impact', href: '/impact', icon: BarChart2 },
    { name: 'Friends', href: '/friends', icon: Users },
  ];

  return (
    <>
      {/* Mobile Bottom Tab Bar */}
      <nav className="fixed bottom-0 left-0 z-50 w-full bg-[#f4e3d7] border-t border-[#0B6E2A]/10 pb-[env(safe-area-inset-bottom)] md:hidden shadow-[0_-2px_10px_rgba(0,0,0,0.05)]">
        <div className="flex justify-between items-center h-16 px-4">
          {mobileNavItems.map((item) => {
            const Icon = item.icon;
            const isActive = pathname?.startsWith(item.href);
            return (
              <Link 
                key={item.href}
                href={item.href} 
                className={`flex flex-col items-center justify-center w-full h-full transition-colors ${
                  isActive 
                    ? 'text-[#0B6E2A]' 
                    : 'text-gray-500 hover:text-[#0B6E2A] active:text-[#0B6E2A]/70'
                }`}
              >
                <Icon className="w-6 h-6 mb-1" />
                <span className="text-xs font-medium">{item.name}</span>
              </Link>
            );
          })}
        </div>
      </nav>

      {/* Top Bar for Desktop and Mobile */}
      <nav className="fixed top-0 left-0 w-full h-[60px] md:h-[72px] bg-[#f4e3d7]/90 backdrop-blur-md z-50 border-b border-[#0B6E2A]/10 flex items-center justify-between px-4 md:px-8">
        <Link href="/" className="flex items-center gap-3 group">
          <div className="flex items-center justify-center w-10 h-10 bg-[#f5efde] rounded-full shadow-[0_2px_8px_rgba(0,0,0,0.08)] border border-[#0B6E2A]/10 transition-transform group-hover:scale-105 group-active:scale-95">
            <Image 
              src="/favicon.svg" 
              alt="Wander Logo" 
              width={26} 
              height={26} 
              className="w-[26px] h-[26px]" 
            />
          </div>
          <span className="text-xl md:text-2xl font-bold font-display text-[#1A2E1C]">Wander</span>
        </Link>
        <div className="hidden md:flex gap-8">
          {navItems.map((item) => (
            <Link 
              key={item.href}
              href={item.href} 
              className={`flex items-center gap-2 font-medium transition-colors ${
                pathname?.startsWith(item.href) ? 'text-[#0B6E2A]' : 'text-[#1A2E1C] hover:text-[#0B6E2A]'
              }`}
            >
              <item.icon className="w-5 h-5" />
              <span>{item.name}</span>
            </Link>
          ))}
        </div>
        <div className="md:hidden flex">
           <Link href="/profile" className="text-[#1A2E1C] hover:text-[#0B6E2A] p-2">
              <User className="w-6 h-6" />
           </Link>
        </div>
      </nav>
    </>
  );
}
