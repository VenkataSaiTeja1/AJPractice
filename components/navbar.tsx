'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter, usePathname } from 'next/navigation';
import { getCurrentSession, logoutUser } from '@/lib/supabase';
import { LogOut, BookOpen, User, ShieldAlert, GraduationCap } from 'lucide-react';

export default function Navbar() {
  const router = useRouter();
  const pathname = usePathname();
  const [profile, setProfile] = useState<any>(null);

  useEffect(() => {
    // Read session on mount
    setProfile(getCurrentSession());

    // Sync state periodically (every 1.5 seconds) in case of updates (e.g. password resets/first logins)
    const interval = setInterval(() => {
      setProfile(getCurrentSession());
    }, 1500);

    return () => clearInterval(interval);
  }, [pathname]);

  const handleLogout = () => {
    logoutUser();
    setProfile(null);
    router.push('/login');
  };

  // Do not show navbar on login page
  if (pathname === '/login') return null;

  return (
    <nav className="border-b border-slate-800 bg-slate-950/70 backdrop-blur-md sticky top-0 z-50">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="flex h-16 items-center justify-between">
          {/* Logo Section */}
          <div className="flex items-center">
            <Link href="/dashboard" className="flex items-center gap-2 text-indigo-400 hover:text-indigo-300 transition-colors">
              <GraduationCap className="h-8 w-8" />
              <span className="font-bold text-lg tracking-tight text-white hidden sm:inline-block">
                Java<span className="text-indigo-400 font-medium">HybridPortal</span>
              </span>
            </Link>
          </div>

          {/* Navigation Links */}
          <div className="flex items-center gap-4">
            {profile && (
              <>
                <Link
                  href="/dashboard"
                  className={`flex items-center gap-1.5 px-3 py-2 rounded-md text-sm font-medium transition-all ${
                    pathname === '/dashboard'
                      ? 'bg-indigo-600/20 text-indigo-400 border border-indigo-500/20'
                      : 'text-slate-300 hover:bg-slate-800/50 hover:text-white'
                  }`}
                >
                  <BookOpen className="h-4 w-4" />
                  Dashboard
                </Link>

                {profile.role === 'faculty' && (
                  <Link
                    href="/admin"
                    className={`flex items-center gap-1.5 px-3 py-2 rounded-md text-sm font-medium transition-all ${
                      pathname === '/admin'
                        ? 'bg-red-500/10 text-red-400 border border-red-500/20'
                        : 'text-slate-300 hover:bg-slate-800/50 hover:text-white'
                    }`}
                  >
                    <ShieldAlert className="h-4 w-4" />
                    Faculty Control Panel
                  </Link>
                )}

                {/* Profile Badge & Signout */}
                <div className="flex items-center gap-3 border-l border-slate-800 pl-4">
                  <div className="flex flex-col text-right hidden md:flex">
                    <span className="text-sm font-medium text-white">{profile.full_name}</span>
                    <span className="text-xs text-slate-400">
                      {profile.role === 'faculty' ? 'Faculty' : `Roll: ${profile.roll_number || 'N/A'}`}
                    </span>
                  </div>
                  <button
                    onClick={handleLogout}
                    className="flex items-center gap-1 px-2.5 py-1.5 rounded-md text-sm font-medium bg-slate-900 border border-slate-800 text-slate-300 hover:bg-slate-800 hover:text-white transition-all cursor-pointer"
                  >
                    <LogOut className="h-4 w-4" />
                    <span className="hidden sm:inline">Logout</span>
                  </button>
                </div>
              </>
            )}
            {!profile && (
              <Link
                href="/login"
                className="flex items-center gap-1.5 px-4 py-2 rounded-md text-sm font-medium bg-indigo-600 hover:bg-indigo-500 text-white transition-all"
              >
                <User className="h-4 w-4" />
                Sign In
              </Link>
            )}
          </div>
        </div>
      </div>
    </nav>
  );
}
