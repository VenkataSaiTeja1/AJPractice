'use client';

import React, { useEffect, useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { getCurrentSession, logoutUser } from '@/lib/supabase';
import { ShieldAlert, Maximize } from 'lucide-react';

export default function FullscreenEnforcer({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const [isStudent, setIsStudent] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);

  useEffect(() => {
    // Determine if user is a student
    const session = getCurrentSession();
    if (session && session.role === 'student') {
      setIsStudent(true);
      
      // Check current fullscreen state
      setIsFullscreen(!!document.fullscreenElement);
    } else {
      setIsStudent(false);
    }
  }, [pathname]);

  useEffect(() => {
    if (!isStudent) return;

    const handleViolation = () => {
      // Trigger logout immediately
      logoutUser();
      alert('Academic Integrity Protocol: You have been logged out for exiting fullscreen mode or switching tabs.');
      router.push('/login');
    };

    const handleFullscreenChange = () => {
      const active = !!document.fullscreenElement;
      setIsFullscreen(active);
      
      // If student exits fullscreen, log them out immediately
      if (!active) {
        handleViolation();
      }
    };

    const handleVisibilityChange = () => {
      if (document.visibilityState === 'hidden') {
        handleViolation();
      }
    };

    // Bind event listeners
    document.addEventListener('fullscreenchange', handleFullscreenChange);
    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      document.removeEventListener('fullscreenchange', handleFullscreenChange);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [isStudent, router]);

  const enterFullscreen = async () => {
    try {
      const elem = document.documentElement;
      if (elem.requestFullscreen) {
        await elem.requestFullscreen();
      }
      setIsFullscreen(true);
    } catch (err: any) {
      alert(`Could not enable Fullscreen: ${err.message}. Please use a modern desktop browser.`);
    }
  };

  // If user is a student and not in fullscreen mode, block screen with overlay
  if (isStudent && !isFullscreen) {
    return (
      <div className="fixed inset-0 z-[9999] bg-slate-950 flex items-center justify-center p-4">
        <div className="w-full max-w-md glass-card p-8 border border-red-500/20 shadow-2xl text-center space-y-6 relative overflow-hidden">
          <div className="absolute -top-24 -left-24 h-48 w-48 bg-red-600/10 blur-3xl rounded-full" />
          
          <div className="relative space-y-5">
            <div className="h-14 w-14 rounded-full bg-red-500/10 border border-red-500/20 flex items-center justify-center text-rose-400 mx-auto shadow-lg animate-pulse">
              <ShieldAlert className="h-7 w-7" />
            </div>

            <div className="space-y-2">
              <h2 className="text-xl font-extrabold text-white tracking-tight">Fullscreen Workspace Active</h2>
              <p className="text-xs text-slate-400 leading-relaxed font-light">
                To prevent academic dishonesty, this portal only operates in fullscreen mode. 
                Exiting fullscreen, switching tabs, or clicking outside will log you out immediately.
              </p>
            </div>

            <button
              onClick={enterFullscreen}
              type="button"
              className="w-full flex items-center justify-center gap-2 rounded bg-indigo-600 hover:bg-indigo-500 py-3 text-sm font-bold text-white transition-all shadow-lg glow-hover cursor-pointer"
            >
              <Maximize className="h-4.5 w-4.5" />
              Enter Fullscreen Workspace
            </button>
          </div>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}
