'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useState } from 'react';
import { useApp } from '@/app/lib/store';
import { Map, Zap, User, Home, GitFork, Globe, Users, LogIn, LogOut } from 'lucide-react';
import { AuthModal } from './AuthModal';

export function Navbar() {
  const pathname = usePathname();
  const { personality, bookings, friends, email, loginWithEmail, logout } = useApp();
  const [showAuth, setShowAuth] = useState(false);

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
      <nav className="fixed top-0 left-0 right-0 h-[72px] bg-[#F4E3D7]/80 backdrop-blur-xl border-b border-[#D6DCCD]/60 z-50 flex items-center justify-center px-4 md:px-8 font-sans shadow-[0_4px_30px_rgba(0,0,0,0.03)] transition-all duration-300">
        <div className="relative w-full flex items-center justify-center">
          <Link href="/" className="absolute left-0 flex items-center gap-2.5 group">
            <div className="flex items-center justify-center w-9 h-9 rounded-full bg-[#0B6E2A] text-[#E5E9DF] group-hover:scale-105 transition-transform duration-300 shadow-md">
              <span className="font-display text-[15px] font-bold tracking-widest mt-0.5">WG</span>
            </div>
            <span className="text-[#1A2E1C] font-semibold tracking-tight hidden sm:block text-lg">Wander</span>
          </Link>

          <div className="hidden md:flex items-center gap-1.5 bg-white/50 p-1.5 rounded-full border border-white/60 shadow-[0_2px_12px_rgba(0,0,0,0.02)] backdrop-blur-md">
            {navItems.map(item => {
              const active = pathname === item.href;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`relative flex items-center gap-2 px-4 py-2 rounded-full text-[13px] font-semibold tracking-tight transition-all duration-300 ease-out ${
                    active 
                      ? 'bg-white text-[#1A2E1C] shadow-[0_2px_12px_rgba(0,0,0,0.04)] ' 
                      : 'text-[#1A2E1C]/50 hover:text-[#1A2E1C] hover:bg-white/40'
                  }`}
                >
                  <item.icon className={`w-[18px] h-[18px] ${active ? 'text-[#0B6E2A]' : 'text-[#1A2E1C]/40'}`} strokeWidth={active ? 2.5 : 2} />
                  <span>{item.label}</span>
                  {(item.badge ?? 0) > 0 && (
                    <span className={`ml-1 flex items-center justify-center min-w-[18px] h-[18px] rounded-full text-[10px] font-bold ${
                      active ? 'bg-[#0B6E2A] text-white' : 'bg-[#1A2E1C]/10 text-[#1A2E1C]'
                    }`}>
                      {item.badge}
                    </span>
                  )}
                </Link>
              );
            })}
          </div>

          <div className="absolute right-0 flex items-center gap-4">
            {!personality ? (
              <Link href="/onboarding" className="bg-[#0B6E2A] text-white text-[13px] font-semibold tracking-wide px-5 py-2.5 rounded-full hover:bg-[#095A22] transition-colors shadow-md hover:shadow-lg active:scale-95 shadow-[#0B6E2A]/20">
                Start journey
              </Link>
            ) : (
              <div className="hidden sm:block" />
            )}
            {email ? (
              <button
                onClick={logout}
                title={`Logged in as ${email} — click to log out`}
                className="flex items-center gap-1.5 bg-white/60 border border-[#D6DCCD] text-[#1A2E1C] text-[12px] font-semibold px-3 py-1.5 rounded-full hover:bg-white transition-colors shadow-sm"
              >
                <LogOut className="w-3.5 h-3.5 text-[#1A2E1C]/50" />
                <span className="hidden sm:block max-w-[100px] truncate">{email.split('@')[0]}</span>
              </button>
            ) : (
              <button
                onClick={() => setShowAuth(true)}
                className="flex items-center gap-1.5 bg-[#0B6E2A] text-white text-[12px] font-semibold px-3.5 py-1.5 rounded-full hover:bg-[#095A22] transition-colors shadow-sm"
              >
                <LogIn className="w-3.5 h-3.5" />
                <span className="hidden sm:block">Save account</span>
              </button>
            )}
          </div>
        </div>
      </nav>

      {showAuth && (
        <AuthModal
          onClose={() => setShowAuth(false)}
          onSuccess={({ email: e, userId, state }) => {
            loginWithEmail(e, userId, state);
            setShowAuth(false);
          }}
        />
      )}

      {/* Mobile nav bottom */}
      <div className="md:hidden fixed bottom-0 left-0 right-0 h-20 bg-[#F4E3D7]/80 backdrop-blur-2xl border-t border-[#D6DCCD]/60 z-50 flex items-center justify-around px-2 [padding-bottom:env(safe-area-inset-bottom)] font-sans shadow-[0_-8px_30px_rgba(0,0,0,0.04)]">
        <Link href="/" className={`flex flex-col items-center gap-1.5 transition-all ${pathname === '/' ? 'text-[#0B6E2A] scale-105' : 'text-[#1A2E1C]/40 hover:text-[#1A2E1C]'}`}>
          <Home size={22} strokeWidth={pathname === '/' ? 2.5 : 2} />
          <span className={`text-[10px] tracking-tight ${pathname === '/' ? 'font-semibold' : 'font-medium'}`}>Home</span>
        </Link>
        {navItems.map(item => {
          const active = pathname === item.href;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex flex-col items-center gap-1.5 relative transition-all ${active ? 'text-[#0B6E2A] scale-105' : 'text-[#1A2E1C]/40 hover:text-[#1A2E1C]'}`}
            >
              <item.icon size={22} strokeWidth={active ? 2.5 : 2} />
              <span className={`text-[10px] tracking-tight ${active ? 'font-semibold' : 'font-medium'}`}>{item.label}</span>
              {(item.badge ?? 0) > 0 && (
                <span className="absolute -top-1.5 -right-2 bg-[#F5A623] text-white text-[9px] w-[18px] h-[18px] flex items-center justify-center rounded-full font-bold ring-2 ring-white shadow-sm">
                  {item.badge}
                </span>
              )}
            </Link>
          );
        })}
      </div>
    </>
  );
}
