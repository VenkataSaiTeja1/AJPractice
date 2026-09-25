'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { supabase } from '@/lib/supabase';
import { GraduationCap, ArrowRight, Code, Cpu, Database, Server } from 'lucide-react';

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
    <div className="flex flex-col min-h-screen bg-white relative overflow-hidden font-[family-name:var(--font-geist-sans)]">

      {/* Soft decorative background gradients */}
      <div className="absolute top-[-120px] right-[-80px] h-[500px] w-[500px] rounded-full bg-indigo-100/70 blur-[100px] pointer-events-none" />
      <div className="absolute bottom-[-60px] left-[-60px] h-[400px] w-[400px] rounded-full bg-purple-100/60 blur-[90px] pointer-events-none" />
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 h-[600px] w-[600px] rounded-full bg-pink-50/50 blur-[120px] pointer-events-none" />

      {/* ─── Navbar ─── */}
      <header className="relative z-10 w-full border-b border-slate-100">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="h-9 w-9 rounded-lg bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center shadow-md shadow-indigo-200/50">
              <GraduationCap className="h-5 w-5 text-white" />
            </div>
            <span className="text-lg font-bold text-slate-900 tracking-tight">
              Practice Portal <span className="text-indigo-500 font-medium">By VVS</span>
            </span>
          </div>
          <nav className="hidden sm:flex items-center gap-6 text-sm font-medium text-slate-500">
            <a href="#features" className="hover:text-indigo-600 transition-colors">Features</a>
            <a href="#tech" className="hover:text-indigo-600 transition-colors">Tech Stack</a>
            {!loading && !session && (
              <Link
                href="/login"
                className="ml-2 px-4 py-2 rounded-lg bg-slate-100 text-slate-700 hover:bg-slate-200 transition-colors font-semibold text-sm"
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
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-indigo-50 border border-indigo-100 text-indigo-600 text-xs font-semibold uppercase tracking-wider">
              <GraduationCap className="h-3.5 w-3.5" />
              CS Hybrid Practice Platform
            </div>
          </div>

          {/* Headline */}
          <h1 className="text-4xl sm:text-5xl lg:text-6xl font-extrabold text-slate-900 tracking-tight leading-[1.1] max-w-4xl mx-auto">
            Master Advanced Java with{' '}
            <span className="bg-gradient-to-r from-indigo-600 via-purple-500 to-pink-500 bg-clip-text text-transparent">
              Live Compilation & Sandbox Labs
            </span>
          </h1>

          {/* Subheading */}
          <p className="mt-6 text-lg sm:text-xl text-slate-500 max-w-2xl mx-auto leading-relaxed font-normal">
            Practice JDBC database operations, J2EE/Servlet mechanics, and modern Spring MVC web architecture in an interactive, cloud-driven playground.
          </p>

          {/* CTA Buttons */}
          <div className="flex flex-col sm:flex-row gap-4 items-center justify-center mt-10">
            {loading ? (
              <div className="h-12 w-44 animate-pulse bg-slate-100 rounded-xl" />
            ) : session ? (
              <Link
                href="/dashboard"
                className="group flex items-center gap-2.5 rounded-xl bg-gradient-to-r from-indigo-600 to-indigo-500 hover:from-indigo-500 hover:to-indigo-400 text-white px-8 py-3.5 text-base font-semibold shadow-lg shadow-indigo-200/50 hover:shadow-xl hover:shadow-indigo-300/50 transition-all duration-300 hover:-translate-y-0.5"
              >
                Go to Workspace Dashboard
                <ArrowRight className="h-5 w-5 transition-transform duration-300 group-hover:translate-x-1" />
              </Link>
            ) : (
              <>
                <Link
                  href="/login"
                  className="group flex items-center gap-2.5 rounded-xl bg-gradient-to-r from-indigo-600 to-indigo-500 hover:from-indigo-500 hover:to-indigo-400 text-white px-8 py-3.5 text-base font-semibold shadow-lg shadow-indigo-200/50 hover:shadow-xl hover:shadow-indigo-300/50 transition-all duration-300 hover:-translate-y-0.5"
                >
                  Get Started Free
                  <ArrowRight className="h-5 w-5 transition-transform duration-300 group-hover:translate-x-1" />
                </Link>
                <Link
                  href="/login"
                  className="flex items-center gap-2 rounded-xl bg-white border border-slate-200 hover:border-indigo-200 hover:bg-indigo-50/50 text-slate-700 px-8 py-3.5 text-base font-semibold transition-all duration-300 hover:-translate-y-0.5 shadow-sm"
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
            <p className="text-sm font-semibold uppercase tracking-wider text-indigo-600 mb-2">Platform Modules</p>
            <h2 className="text-3xl sm:text-4xl font-bold text-slate-900 tracking-tight">
              Everything you need to practice Java
            </h2>
            <p className="mt-3 text-slate-500 max-w-xl mx-auto">
              Three integrated modules designed to build deep, practical understanding of enterprise Java technologies.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Module A */}
            <div className="group relative rounded-2xl bg-white border border-slate-200 p-7 shadow-sm hover:shadow-xl hover:shadow-indigo-100/50 hover:border-indigo-200 transition-all duration-300 hover:-translate-y-1">
              <div className="h-12 w-12 flex items-center justify-center rounded-xl bg-indigo-50 text-indigo-600 mb-5 group-hover:bg-indigo-100 transition-colors duration-300">
                <Code className="h-6 w-6" />
              </div>
              <h3 className="text-lg font-bold text-slate-900 mb-2">
                Module A: Quizzes & Debugging
              </h3>
              <p className="text-sm text-slate-500 leading-relaxed">
                Interactive matching tasks, servlet lifecycle checks, and &ldquo;Find the bug&rdquo; Java snippets with immediate feedback.
              </p>
              <div className="mt-5 flex items-center text-sm font-semibold text-indigo-600 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                Explore module <ArrowRight className="h-4 w-4 ml-1" />
              </div>
            </div>

            {/* Module B */}
            <div className="group relative rounded-2xl bg-white border border-slate-200 p-7 shadow-sm hover:shadow-xl hover:shadow-purple-100/50 hover:border-purple-200 transition-all duration-300 hover:-translate-y-1">
              <div className="h-12 w-12 flex items-center justify-center rounded-xl bg-purple-50 text-purple-600 mb-5 group-hover:bg-purple-100 transition-colors duration-300">
                <Cpu className="h-6 w-6" />
              </div>
              <h3 className="text-lg font-bold text-slate-900 mb-2">
                Module B: Sandbox Execution
              </h3>
              <p className="text-sm text-slate-500 leading-relaxed">
                Live compiler sandbox for coding JDBC statements, batch updates, and Spring beans with zero client setup.
              </p>
              <div className="mt-5 flex items-center text-sm font-semibold text-purple-600 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                Explore module <ArrowRight className="h-4 w-4 ml-1" />
              </div>
            </div>

            {/* Module C */}
            <div className="group relative rounded-2xl bg-white border border-slate-200 p-7 shadow-sm hover:shadow-xl hover:shadow-pink-100/50 hover:border-pink-200 transition-all duration-300 hover:-translate-y-1">
              <div className="h-12 w-12 flex items-center justify-center rounded-xl bg-pink-50 text-pink-600 mb-5 group-hover:bg-pink-100 transition-colors duration-300">
                <Server className="h-6 w-6" />
              </div>
              <h3 className="text-lg font-bold text-slate-900 mb-2">
                Module C: Cloud IDE Containers
              </h3>
              <p className="text-sm text-slate-500 leading-relaxed">
                GitHub Codespaces/Gitpod links for complex Tomcat servlets, web server settings, and JSTL views.
              </p>
              <div className="mt-5 flex items-center text-sm font-semibold text-pink-600 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                Explore module <ArrowRight className="h-4 w-4 ml-1" />
              </div>
            </div>
          </div>
        </section>

        {/* ─── Tech Stack Footer ─── */}
        <footer id="tech" className="relative z-10 border-t border-slate-100 bg-slate-50/80">
          <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
            <p className="text-xs font-semibold uppercase tracking-widest text-slate-400 text-center mb-6">
              Supported Technologies
            </p>
            <div className="flex flex-wrap justify-center gap-4">
              <div className="flex items-center gap-2 px-5 py-2.5 rounded-full bg-white border border-slate-200 text-sm font-medium text-slate-600 shadow-sm hover:shadow-md hover:border-indigo-200 transition-all duration-300">
                <Database className="h-4 w-4 text-indigo-500" />
                JDBC & MySQL
              </div>
              <div className="flex items-center gap-2 px-5 py-2.5 rounded-full bg-white border border-slate-200 text-sm font-medium text-slate-600 shadow-sm hover:shadow-md hover:border-purple-200 transition-all duration-300">
                <Server className="h-4 w-4 text-purple-500" />
                Tomcat J2EE
              </div>
              <div className="flex items-center gap-2 px-5 py-2.5 rounded-full bg-white border border-slate-200 text-sm font-medium text-slate-600 shadow-sm hover:shadow-md hover:border-pink-200 transition-all duration-300">
                <Cpu className="h-4 w-4 text-pink-500" />
                Spring Framework
              </div>
            </div>

            <div className="mt-10 pt-6 border-t border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-3">
              <div className="flex items-center gap-2 text-sm text-slate-400">
                <div className="h-6 w-6 rounded-md bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center">
                  <GraduationCap className="h-3.5 w-3.5 text-white" />
                </div>
                <span className="font-medium text-slate-500">Practice Portal By VVS</span>
              </div>
              <p className="text-xs text-slate-400">
                &copy; {new Date().getFullYear()} All rights reserved. Built for CS students.
              </p>
            </div>
          </div>
        </footer>
      </main>
    </div>
  );
}
