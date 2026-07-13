'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { supabase } from '@/lib/supabase';
import { GraduationCap, ArrowRight, Code, ShieldAlert, Cpu, Database, Server } from 'lucide-react';

export default function Home() {
  const [session, setSession] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setLoading(false);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      setLoading(false);
    });

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  return (
    <div className="flex flex-col min-h-screen relative overflow-hidden">
      
      {/* Background Decorative Glows */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 h-[500px] w-[500px] rounded-full bg-indigo-600/10 blur-[120px] pointer-events-none" />
      <div className="absolute bottom-10 left-10 h-[300px] w-[300px] rounded-full bg-purple-600/10 blur-[80px] pointer-events-none" />

      {/* Main Section */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 flex flex-col justify-center py-20 z-10">
        
        {/* Logo Badge */}
        <div className="flex justify-center mb-6">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 text-xs font-semibold uppercase tracking-wider">
            <GraduationCap className="h-4 w-4" />
            CS Hybrid Practice Platform
          </div>
        </div>

        {/* Hero Headline */}
        <div className="text-center max-w-4xl mx-auto mb-10">
          <h1 className="text-4xl sm:text-6xl font-extrabold text-white tracking-tight leading-tight">
            Master Advanced Java with <br />
            <span className="bg-gradient-to-r from-indigo-400 via-purple-400 to-pink-400 bg-clip-text text-transparent">
              Live Compilation & Sandbox Labs
            </span>
          </h1>
          <p className="text-lg sm:text-xl text-slate-400 mt-6 max-w-2xl mx-auto font-light leading-relaxed">
            Practice JDBC database operations, J2EE/Servlet mechanics, and modern Spring MVC web architecture in an interactive, cloud-driven playground.
          </p>
        </div>

        {/* CTA Actions */}
        <div className="flex flex-col sm:flex-row gap-4 items-center justify-center mb-20">
          {loading ? (
            <div className="h-12 w-40 animate-pulse bg-slate-800 rounded-lg" />
          ) : session ? (
            <Link
              href="/dashboard"
              className="flex items-center gap-2 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white px-8 py-3.5 text-base font-semibold shadow-lg transition-all glow-hover cursor-pointer"
            >
              Go to Workspace Dashboard
              <ArrowRight className="h-5 w-5" />
            </Link>
          ) : (
            <>
              <Link
                href="/login"
                className="flex items-center gap-2 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white px-8 py-3.5 text-base font-semibold shadow-lg transition-all glow-hover cursor-pointer"
              >
                Get Started Free
                <ArrowRight className="h-5 w-5" />
              </Link>
              <Link
                href="/login"
                className="flex items-center gap-2 rounded-lg bg-slate-900 border border-slate-800 hover:bg-slate-850 text-slate-300 px-8 py-3.5 text-base font-semibold transition-all cursor-pointer"
              >
                Sign In As Teacher
              </Link>
            </>
          )}
        </div>

        {/* Features Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-5xl mx-auto">
          {/* Feature 1 */}
          <div className="glass-card p-6 border border-slate-800 hover:border-indigo-500/30 transition-all hover:scale-[1.01] duration-300">
            <div className="h-10 w-10 flex items-center justify-center rounded-lg bg-indigo-600/10 text-indigo-400 border border-indigo-500/20 mb-4">
              <Code className="h-5 w-5" />
            </div>
            <h3 className="text-lg font-semibold text-white mb-2">Module A: Quizzes & Debugging</h3>
            <p className="text-sm text-slate-400 leading-relaxed font-light">
              Interactive matching tasks, servlet lifecycle checks, and "Find the bug" Java snippets with immediate feedback.
            </p>
          </div>

          {/* Feature 2 */}
          <div className="glass-card p-6 border border-slate-800 hover:border-indigo-500/30 transition-all hover:scale-[1.01] duration-300">
            <div className="h-10 w-10 flex items-center justify-center rounded-lg bg-purple-600/10 text-purple-400 border border-purple-500/20 mb-4">
              <Cpu className="h-5 w-5" />
            </div>
            <h3 className="text-lg font-semibold text-white mb-2">Module B: Piston Execution</h3>
            <p className="text-sm text-slate-400 leading-relaxed font-light">
              Live compiler sandbox for coding JDBC statements, batch updates, and Spring beans with zero client setup.
            </p>
          </div>

          {/* Feature 3 */}
          <div className="glass-card p-6 border border-slate-800 hover:border-indigo-500/30 transition-all hover:scale-[1.01] duration-300">
            <div className="h-10 w-10 flex items-center justify-center rounded-lg bg-pink-600/10 text-pink-400 border border-pink-500/20 mb-4">
              <Server className="h-5 w-5" />
            </div>
            <h3 className="text-lg font-semibold text-white mb-2">Module C: Cloud IDE Containers</h3>
            <p className="text-sm text-slate-400 leading-relaxed font-light">
              GitHub Codespaces/Gitpod links for complex Tomcat servlets, web server settings, and JSTL views.
            </p>
          </div>
        </div>

        {/* Tech Stack Badge Section */}
        <div className="mt-20 border-t border-slate-800/80 pt-10 text-center">
          <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">Supported Technologies</p>
          <div className="flex flex-wrap justify-center gap-6 mt-4 text-sm text-slate-400">
            <div className="flex items-center gap-1.5"><Database className="h-4 w-4 text-indigo-400" /> JDBC & MySQL</div>
            <div className="flex items-center gap-1.5"><Server className="h-4 w-4 text-purple-400" /> Tomcat J2EE</div>
            <div className="flex items-center gap-1.5"><Cpu className="h-4 w-4 text-pink-400" /> Spring Framework</div>
          </div>
        </div>

      </main>
    </div>
  );
}

