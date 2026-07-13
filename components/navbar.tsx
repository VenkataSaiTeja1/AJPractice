'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter, usePathname } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { LogOut, BookOpen, User, ShieldAlert, GraduationCap } from 'lucide-react';

export default function Navbar() {
  const router = useRouter();
  const pathname = usePathname();
  const [profile, setProfile] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchSession() {
      const { data: { session } } = await supabase.auth.getSession();
      if (session?.user) {
        const { data: prof, error } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', session.user.id)
          .single();

        if (!error && prof) {
          setProfile(prof);
        }
      } else {
        setProfile(null);
      }
      setLoading(false);
    }

    fetchSession();

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (session?.user) {
        const { data: prof } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', session.user.id)
          .single();
        setProfile(prof);
      } else {
        setProfile(null);
      }
      setLoading(false);
    });

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  const handleLogout = async () => {
    await supabase.auth.signOut();
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

                {profile.role === 'teacher' && (
                  <Link
                    href="/admin"
                    className={`flex items-center gap-1.5 px-3 py-2 rounded-md text-sm font-medium transition-all ${
                      pathname === '/admin'
                        ? 'bg-red-500/10 text-red-400 border border-red-500/20'
                        : 'text-slate-300 hover:bg-slate-800/50 hover:text-white'
                    }`}
                  >
                    <ShieldAlert className="h-4 w-4" />
                    Admin Panel
                  </Link>
                )}

                {/* Profile Badge & Signout */}
                <div className="flex items-center gap-3 border-l border-slate-800 pl-4">
                  <div className="flex flex-col text-right hidden md:flex">
                    <span className="text-sm font-medium text-white">{profile.full_name}</span>
                    <span className="text-xs text-slate-400">
                      {profile.role === 'teacher' ? 'Teacher' : `Roll: ${profile.roll_number || 'N/A'}`}
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
            {!profile && !loading && (
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
