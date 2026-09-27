'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter, usePathname } from 'next/navigation';
import { getCurrentSession, logoutUser } from '@/lib/supabase';
import { LogOut, BookOpen, User, ShieldAlert, GraduationCap } from 'lucide-react';
import ThemeToggle from '@/components/theme-toggle';

export default function Navbar() {
  const router = useRouter();
  const pathname = usePathname();
  const [profile, setProfile] = useState<any>(null);

  useEffect(() => {
    // Read session on mount
    setProfile(getCurrentSession());

    // Sync state periodically (every 1.5 seconds) in case of updates
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

  // Format student branch and year for display
  const getCohortLabel = () => {
    if (!profile) return '';
    if (profile.role === 'faculty') return 'Faculty';
    const roll = profile.roll_number?.toUpperCase() || '';
    if (profile.year === 1 || roll.startsWith('26FE')) {
      const branch = roll.includes('43') || profile.section === 'CAI' ? 'CAI' : roll.includes('44') || profile.section === 'CSD' ? 'CSD' : 'C & DS';
      return `1st Year (${branch}) · Roll: ${profile.roll_number || 'N/A'}`;
    }
    if (profile.year === 2) {
      return `2nd Year (${profile.section || 'A'}) · Roll: ${profile.roll_number || 'N/A'}`;
    }
    return `3rd Year · Roll: ${profile.roll_number || 'N/A'}`;
  };

  return (
    <nav className="sticky top-0 z-50 border-b border-slate-200/80 dark:border-slate-800 bg-white/85 dark:bg-slate-900/85 backdrop-blur-xl backdrop-saturate-150 transition-colors duration-200">
      <div className="mx-auto max-w-7xl px-3 sm:px-6 lg:px-8">
        <div className="flex h-16 items-center justify-between gap-2">
          
          {/* Logo / Branding */}
          <Link
            href="/dashboard"
            className="group flex items-center gap-2.5 transition-opacity hover:opacity-85 shrink-0"
          >
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-indigo-500 to-indigo-600 shadow-md shadow-indigo-500/20">
              <GraduationCap className="h-5 w-5 text-white" />
            </div>
            <span className="text-base sm:text-lg font-bold tracking-tight text-slate-900 dark:text-white">
              Practice Portal <span className="font-medium text-indigo-500">By VVS</span>
            </span>
          </Link>

          {/* Right‑side: nav links + theme toggle + profile */}
          <div className="flex items-center gap-2 sm:gap-3">
            {profile && (
              <>
                {/* Dashboard Link */}
                <Link
                  href="/dashboard"
                  className={`flex items-center gap-1.5 rounded-full px-3 sm:px-4 py-1.5 sm:py-2 text-xs sm:text-sm font-semibold transition-all duration-200 ${
                    pathname === '/dashboard'
                      ? 'bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 shadow-xs ring-1 ring-indigo-200 dark:ring-indigo-800'
                      : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-slate-900 dark:hover:text-white'
                  }`}
                >
                  <BookOpen className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                  <span className="hidden xs:inline">Dashboard</span>
                </Link>

                {/* Faculty Control Panel Link */}
                {profile.role === 'faculty' && (
                  <Link
                    href="/admin"
                    className={`flex items-center gap-1.5 rounded-full px-3 sm:px-4 py-1.5 sm:py-2 text-xs sm:text-sm font-semibold transition-all duration-200 ${
                      pathname === '/admin'
                        ? 'bg-rose-50 dark:bg-rose-950/60 text-rose-600 dark:text-rose-400 shadow-xs ring-1 ring-rose-200 dark:ring-rose-800'
                        : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-slate-900 dark:hover:text-white'
                    }`}
                  >
                    <ShieldAlert className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                    <span className="hidden md:inline">Faculty Control Panel</span>
                    <span className="md:hidden">Admin</span>
                  </Link>
                )}

                {/* Divider */}
                <div className="h-6 w-px bg-slate-200 dark:bg-slate-800 hidden sm:block" />

                {/* Profile Badge & Logout */}
                <div className="flex items-center gap-2 sm:gap-3">
                  {/* Avatar */}
                  <div className="flex h-8 w-8 items-center justify-center rounded-full bg-gradient-to-br from-indigo-500 to-indigo-600 text-xs font-bold uppercase text-white shadow-xs shrink-0">
                    {profile.full_name ? profile.full_name.charAt(0) : '?'}
                  </div>

                  {/* Name & Role */}
                  <div className="hidden lg:flex flex-col text-right">
                    <span className="text-xs font-bold leading-tight text-slate-900 dark:text-slate-100 max-w-[130px] truncate">
                      {profile.full_name}
                    </span>
                    <span className="text-[10px] leading-tight text-slate-500 dark:text-slate-400">
                      {getCohortLabel()}
                    </span>
                  </div>

                  {/* Logout Button */}
                  <button
                    onClick={handleLogout}
                    className="flex items-center gap-1 rounded-full border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-850 px-2.5 sm:px-3 py-1.5 text-xs font-medium text-slate-600 dark:text-slate-400 shadow-xs transition-all duration-200 hover:border-red-200 hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-950/40 cursor-pointer"
                    title="Sign Out"
                  >
                    <LogOut className="h-3.5 w-3.5" />
                    <span className="hidden sm:inline">Logout</span>
                  </button>
                </div>
              </>
            )}

            {/* Dark / Light Mode Switcher */}
            <ThemeToggle />

            {/* Not logged in – Sign In CTA */}
            {!profile && (
              <Link
                href="/login"
                className="flex items-center gap-1.5 rounded-full bg-indigo-600 hover:bg-indigo-700 px-4 sm:px-5 py-2 text-xs sm:text-sm font-semibold text-white shadow-md shadow-indigo-500/25 transition-all duration-200"
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
