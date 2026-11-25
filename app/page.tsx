'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { supabase } from '@/lib/supabase';
import { GraduationCap, ArrowRight, Code, Cpu, Database, Server } from 'lucide-react';
import ThemeToggle from '@/components/theme-toggle';

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
    <div className="flex flex-col min-h-screen bg-white dark:bg-[#0a0a0a] relative overflow-hidden font-[family-name:var(--font-geist-sans)]">

      {/* Soft decorative background */}
      <div className="absolute top-[-120px] right-[-80px] h-[500px] w-[500px] rounded-full bg-slate-100/70 dark:bg-[#1a1a1a]/30 blur-[100px] pointer-events-none" />
      <div className="absolute bottom-[-60px] left-[-60px] h-[400px] w-[400px] rounded-full bg-slate-100/60 dark:bg-[#1a1a1a]/25 blur-[90px] pointer-events-none" />
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 h-[600px] w-[600px] rounded-full bg-slate-50/50 dark:bg-[#111111]/20 blur-[120px] pointer-events-none" />

      {/* ─── Navbar ─── */}
      <header className="relative z-10 w-full border-b border-slate-100 dark:border-[#2a2a2a] bg-white dark:bg-[#0a0a0a]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="h-9 w-9 rounded-lg bg-slate-900 dark:bg-white flex items-center justify-center shadow-md">
              <GraduationCap className="h-5 w-5 text-white dark:text-slate-900" />
            </div>
            <span className="text-lg font-bold text-slate-900 dark:text-white tracking-tight">
              Practice Portal <span className="text-slate-500 dark:text-slate-400 font-medium">by VVS</span>
            </span>
          </div>
          <nav className="flex items-center gap-3 sm:gap-6 text-sm font-medium text-slate-500 dark:text-slate-400">
            <ThemeToggle />
            <div className="hidden sm:flex items-center gap-6">
              <a href="#features" className="hover:text-slate-900 dark:hover:text-white transition-colors">Features</a>
              <a href="#learning-tools" className="hover:text-slate-900 dark:hover:text-white transition-colors">Learning Tools</a>
            </div>
            {!loading && !session && (
              <Link
                href="/login"
                className="ml-1 sm:ml-2 px-3 sm:px-4 py-2 rounded-lg bg-slate-900 dark:bg-white text-white dark:text-slate-900 hover:bg-slate-700 dark:hover:bg-slate-200 transition-colors font-semibold text-sm"
              >
                Sign In
              </Link>
            )}
          </nav>
        </div>
      </header>

      {/* ─── Hero Section ─── */}
      <main className="flex-1 relative z-10">
        <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-20 sm:pt-28 pb-16 text-center">

          {/* Badge */}
          <div className="flex justify-center mb-8">
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-slate-100 dark:bg-[#1a1a1a] border border-slate-200 dark:border-[#2a2a2a] text-slate-600 dark:text-slate-300 text-xs font-semibold uppercase tracking-wider">
              <GraduationCap className="h-3.5 w-3.5" />
              Student Programming Practice Platform
            </div>
          </div>

          {/* Headline */}
          <h1 className="text-4xl sm:text-5xl lg:text-6xl font-extrabold text-slate-900 dark:text-white tracking-tight leading-[1.1] max-w-4xl mx-auto">
            Learn by practicing and building{' '}
            <span className="text-slate-600 dark:text-slate-300">
              real programming skills
            </span>
          </h1>

          {/* Subheading */}
          <p className="mt-6 text-lg sm:text-xl text-slate-500 dark:text-slate-400 max-w-2xl mx-auto leading-relaxed font-normal">
            Work through scheduled coding exercises, quizzes, compiler practice, and cloud labs across your curriculum, with feedback and progress tracking.
          </p>

          {/* CTA Buttons */}
          <div className="flex flex-col sm:flex-row gap-4 items-center justify-center mt-10">
            {loading ? (
              <div className="h-12 w-44 animate-pulse bg-slate-100 dark:bg-[#1a1a1a] rounded-xl" />
            ) : session ? (
              <Link
                href="/dashboard"
                className="group flex items-center gap-2.5 rounded-xl bg-slate-900 dark:bg-white hover:bg-slate-700 dark:hover:bg-slate-200 text-white dark:text-slate-900 px-8 py-3.5 text-base font-semibold shadow-lg transition-all duration-300 hover:-translate-y-0.5"
              >
                Go to Workspace Dashboard
                <ArrowRight className="h-5 w-5 transition-transform duration-300 group-hover:translate-x-1" />
              </Link>
            ) : (
              <>
                <Link
                  href="/login"
                  className="group flex items-center gap-2.5 rounded-xl bg-slate-900 dark:bg-white hover:bg-slate-700 dark:hover:bg-slate-200 text-white dark:text-slate-900 px-8 py-3.5 text-base font-semibold shadow-lg transition-all duration-300 hover:-translate-y-0.5"
                >
                  Get Started Free
                  <ArrowRight className="h-5 w-5 transition-transform duration-300 group-hover:translate-x-1" />
                </Link>
                <Link
                  href="/login"
                  className="flex items-center gap-2 rounded-xl bg-white dark:bg-[#1a1a1a] border border-slate-200 dark:border-[#2a2a2a] hover:border-slate-400 dark:hover:border-[#404040] text-slate-700 dark:text-slate-200 px-8 py-3.5 text-base font-semibold transition-all duration-300 hover:-translate-y-0.5 shadow-sm"
                >
                  Sign In As Faculty
                </Link>
              </>
            )}
          </div>
        </section>

        {/* ─── Features Grid ─── */}
        <section id="features" className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-20">
          <div className="text-center mb-14">
            <p className="text-sm font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-2">Platform Modules</p>
            <h2 className="text-3xl sm:text-4xl font-bold text-slate-900 dark:text-white tracking-tight">
              Practice tools for every step of learning
            </h2>
            <p className="mt-3 text-slate-500 dark:text-slate-400 max-w-xl mx-auto">
              Build confidence with interactive quizzes, coding exercises, instant compiler feedback, and cloud-based project work.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Module A */}
            <div className="group relative rounded-2xl bg-white dark:bg-[#111111] border border-slate-200 dark:border-[#2a2a2a] p-7 shadow-sm hover:shadow-lg hover:border-slate-400 dark:hover:border-[#404040] transition-all duration-300 hover:-translate-y-1">
              <div className="h-12 w-12 flex items-center justify-center rounded-xl bg-slate-100 dark:bg-[#1a1a1a] text-slate-700 dark:text-slate-200 mb-5 group-hover:bg-slate-200 dark:group-hover:bg-[#222222] transition-colors duration-300">
                <Code className="h-6 w-6" />
              </div>
              <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-2">
                Module A: Quizzes &amp; Debugging
              </h3>
              <p className="text-sm text-slate-500 dark:text-slate-400 leading-relaxed">
                Strengthen problem-solving with interactive quizzes, debugging challenges, and code-reading exercises.
              </p>
              <div className="mt-5 flex items-center text-sm font-semibold text-slate-700 dark:text-slate-200 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                Explore module <ArrowRight className="h-4 w-4 ml-1" />
              </div>
            </div>

            {/* Module B */}
            <div className="group relative rounded-2xl bg-white dark:bg-[#111111] border border-slate-200 dark:border-[#2a2a2a] p-7 shadow-sm hover:shadow-lg hover:border-slate-400 dark:hover:border-[#404040] transition-all duration-300 hover:-translate-y-1">
              <div className="h-12 w-12 flex items-center justify-center rounded-xl bg-slate-100 dark:bg-[#1a1a1a] text-slate-700 dark:text-slate-200 mb-5 group-hover:bg-slate-200 dark:group-hover:bg-[#222222] transition-colors duration-300">
                <Cpu className="h-6 w-6" />
              </div>
              <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-2">
                Module B: Sandbox Execution
              </h3>
              <p className="text-sm text-slate-500 dark:text-slate-400 leading-relaxed">
                Write and run programs in the browser, then use immediate feedback to test and improve your solutions.
              </p>
              <div className="mt-5 flex items-center text-sm font-semibold text-slate-700 dark:text-slate-200 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                Explore module <ArrowRight className="h-4 w-4 ml-1" />
              </div>
            </div>

            {/* Module C */}
            <div className="group relative rounded-2xl bg-white dark:bg-[#111111] border border-slate-200 dark:border-[#2a2a2a] p-7 shadow-sm hover:shadow-lg hover:border-slate-400 dark:hover:border-[#404040] transition-all duration-300 hover:-translate-y-1">
              <div className="h-12 w-12 flex items-center justify-center rounded-xl bg-slate-100 dark:bg-[#1a1a1a] text-slate-700 dark:text-slate-200 mb-5 group-hover:bg-slate-200 dark:group-hover:bg-[#222222] transition-colors duration-300">
                <Server className="h-6 w-6" />
              </div>
              <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-2">
                Module C: Cloud IDE Containers
              </h3>
              <p className="text-sm text-slate-500 dark:text-slate-400 leading-relaxed">
                Open a cloud development environment for larger assignments and submit project links for faculty review.
              </p>
              <div className="mt-5 flex items-center text-sm font-semibold text-slate-700 dark:text-slate-200 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                Explore module <ArrowRight className="h-4 w-4 ml-1" />
              </div>
            </div>
          </div>
        </section>

        {/* ─── Tech Stack Footer ─── */}
        <footer id="learning-tools" className="relative z-10 border-t border-slate-100 dark:border-[#2a2a2a] bg-slate-50/80 dark:bg-[#111111]/80">
          <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
            <p className="text-xs font-semibold uppercase tracking-widest text-slate-400 dark:text-slate-500 text-center mb-6">
              Learning Tools
            </p>
            <div className="flex flex-wrap justify-center gap-4">
              <div className="flex items-center gap-2 px-5 py-2.5 rounded-full bg-white dark:bg-[#1a1a1a] border border-slate-200 dark:border-[#2a2a2a] text-sm font-medium text-slate-600 dark:text-slate-300 shadow-sm hover:shadow-md hover:border-slate-400 dark:hover:border-[#404040] transition-all duration-300">
                <Database className="h-4 w-4 text-slate-500 dark:text-slate-400" />
                C &amp; Java Practice
              </div>
              <div className="flex items-center gap-2 px-5 py-2.5 rounded-full bg-white dark:bg-[#1a1a1a] border border-slate-200 dark:border-[#2a2a2a] text-sm font-medium text-slate-600 dark:text-slate-300 shadow-sm hover:shadow-md hover:border-slate-400 dark:hover:border-[#404040] transition-all duration-300">
                <Server className="h-4 w-4 text-slate-500 dark:text-slate-400" />
                Live Compiler
              </div>
              <div className="flex items-center gap-2 px-5 py-2.5 rounded-full bg-white dark:bg-[#1a1a1a] border border-slate-200 dark:border-[#2a2a2a] text-sm font-medium text-slate-600 dark:text-slate-300 shadow-sm hover:shadow-md hover:border-slate-400 dark:hover:border-[#404040] transition-all duration-300">
                <Cpu className="h-4 w-4 text-slate-500 dark:text-slate-400" />
                Cloud Labs
              </div>
            </div>

            <div className="mt-10 pt-6 border-t border-slate-200 dark:border-[#2a2a2a] flex flex-col sm:flex-row items-center justify-between gap-3">
              <div className="flex items-center gap-2 text-sm text-slate-400 dark:text-slate-500">
                <div className="h-6 w-6 rounded-md bg-slate-900 dark:bg-white flex items-center justify-center">
                  <GraduationCap className="h-3.5 w-3.5 text-white dark:text-slate-900" />
                </div>
                <span className="font-medium text-slate-500 dark:text-slate-400">Practice Portal by VVS</span>
              </div>
              <p className="text-xs text-slate-400 dark:text-slate-500">
                &copy; {new Date().getFullYear()} All rights reserved. Built for CS students.
              </p>
            </div>
          </div>
        </footer>
      </main>
    </div>
  );
}
