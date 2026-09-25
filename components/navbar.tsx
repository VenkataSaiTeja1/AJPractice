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
    <nav className="sticky top-0 z-50 border-b border-slate-200/80 bg-white/80 backdrop-blur-xl backdrop-saturate-150">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="flex h-16 items-center justify-between">
          {/* Logo / Branding */}
          <Link
            href="/dashboard"
            className="group flex items-center gap-2.5 transition-opacity hover:opacity-80"
          >
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-indigo-500 to-indigo-600 shadow-md shadow-indigo-500/20">
              <GraduationCap className="h-5 w-5 text-white" />
            </div>
            <span className="hidden text-lg font-bold tracking-tight text-slate-900 sm:inline-block">
              Practice Portal{' '}
              <span className="font-medium text-indigo-500">By VVS</span>
            </span>
          </Link>

          {/* Right‑side: nav links + profile */}
          <div className="flex items-center gap-1.5">
            {profile && (
              <>
                {/* Dashboard Link */}
                <Link
                  href="/dashboard"
                  className={`flex items-center gap-1.5 rounded-full px-4 py-2 text-sm font-medium transition-all duration-200 ${
                    pathname === '/dashboard'
                      ? 'bg-indigo-50 text-indigo-600 shadow-sm ring-1 ring-indigo-100'
                      : 'text-slate-500 hover:bg-slate-100 hover:text-slate-900'
                  }`}
                >
                  <BookOpen className="h-4 w-4" />
                  Dashboard
                </Link>

                {/* Faculty Control Panel Link */}
                {profile.role === 'faculty' && (
                  <Link
                    href="/admin"
                    className={`flex items-center gap-1.5 rounded-full px-4 py-2 text-sm font-medium transition-all duration-200 ${
                      pathname === '/admin'
                        ? 'bg-rose-50 text-rose-600 shadow-sm ring-1 ring-rose-100'
                        : 'text-slate-500 hover:bg-slate-100 hover:text-slate-900'
                    }`}
                  >
                    <ShieldAlert className="h-4 w-4" />
                    Faculty Control Panel
                  </Link>
                )}

                {/* Divider */}
                <div className="mx-2 h-8 w-px bg-slate-200" />

                {/* Profile Badge & Logout */}
                <div className="flex items-center gap-3">
                  {/* Avatar */}
                  <div className="flex h-8 w-8 items-center justify-center rounded-full bg-gradient-to-br from-indigo-400 to-indigo-500 text-xs font-bold uppercase text-white shadow-sm">
                    {profile.full_name
                      ? profile.full_name.charAt(0)
                      : '?'}
                  </div>

                  {/* Name & Role */}
                  <div className="hidden flex-col text-right md:flex">
                    <span className="text-sm font-semibold leading-tight text-slate-800">
                      {profile.full_name}
                    </span>
                    <span className="text-xs leading-tight text-slate-400">
                      {profile.role === 'faculty'
                        ? 'Faculty'
                        : `Year ${profile.year} | Roll: ${profile.roll_number || 'N/A'}`}
                    </span>
                  </div>

                  {/* Logout Button */}
                  <button
                    onClick={handleLogout}
                    className="flex items-center gap-1.5 rounded-full border border-slate-200 bg-white px-3 py-1.5 text-sm font-medium text-slate-500 shadow-sm transition-all duration-200 hover:border-red-200 hover:bg-red-50 hover:text-red-600 cursor-pointer"
                  >
                    <LogOut className="h-3.5 w-3.5" />
                    <span className="hidden sm:inline">Logout</span>
                  </button>
                </div>
              </>
            )}

            {/* Not logged in – Sign In CTA */}
            {!profile && (
              <Link
                href="/login"
                className="flex items-center gap-1.5 rounded-full bg-gradient-to-r from-indigo-500 to-indigo-600 px-5 py-2 text-sm font-semibold text-white shadow-md shadow-indigo-500/25 transition-all duration-200 hover:shadow-lg hover:shadow-indigo-500/30 hover:brightness-110"
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
