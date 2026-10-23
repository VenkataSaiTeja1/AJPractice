'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { loginStudent, loginFaculty, getCurrentSession } from '@/lib/supabase';
import { GraduationCap, ArrowRight, Eye, EyeOff } from 'lucide-react';
import ThemeToggle from '@/components/theme-toggle';

const CODE_SNIPPETS = [
  { text: 'int main() {',         top: '8%',  left: '3%',  duration: '14s', delay: '0s',   opacity: 0.09, size: '13px' },
  { text: 'struct Node *next;',   top: '18%', left: '78%', duration: '18s', delay: '2s',   opacity: 0.07, size: '12px' },
  { text: 'for(i=0;i<n;i++)',     top: '32%', left: '88%', duration: '12s', delay: '1s',   opacity: 0.10, size: '14px' },
  { text: 'malloc(sizeof(Node))', top: '55%', left: '5%',  duration: '16s', delay: '3s',   opacity: 0.08, size: '12px' },
  { text: 'printf("%d", arr[i])', top: '70%', left: '82%', duration: '20s', delay: '0.5s', opacity: 0.07, size: '13px' },
  { text: 'int arr[100];',        top: '82%', left: '10%', duration: '11s', delay: '4s',   opacity: 0.09, size: '14px' },
  { text: 'void swap(int *a, int *b)', top: '12%', left: '55%', duration: '15s', delay: '2.5s', opacity: 0.06, size: '11px' },
  { text: '*ptr = &var;',         top: '45%', left: '72%', duration: '13s', delay: '1.5s', opacity: 0.10, size: '13px' },
  { text: 'scanf("%d",&n);',      top: '90%', left: '60%', duration: '17s', delay: '0s',   opacity: 0.08, size: '12px' },
  { text: 'return 0;',            top: '62%', left: '40%', duration: '9s',  delay: '3.5s', opacity: 0.12, size: '15px' },
  { text: '#include <stdio.h>',   top: '3%',  left: '38%', duration: '19s', delay: '1s',   opacity: 0.07, size: '12px' },
  { text: 'stack.push(x);',       top: '76%', left: '28%', duration: '10s', delay: '2s',   opacity: 0.09, size: '13px' },
];

export default function LoginPage() {
  const router = useRouter();

  // Tab states
  const [loginMode, setLoginMode] = useState<'student' | 'faculty'>('student');

  // Form states
  const [email, setEmail] = useState('');
  const [rollNumber, setRollNumber] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  // Status states
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  // Blinking cursor state
  const [cursorOn, setCursorOn] = useState(true);

  useEffect(() => {
    const interval = setInterval(() => setCursorOn(v => !v), 530);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    // If user is already logged in, redirect based on role
    const session = getCurrentSession();
    if (session) {
      if (session.role === 'faculty') {
        router.push('/admin');
      } else {
        router.push('/dashboard');
      }
    }
  }, [router]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setErrorMessage('');

    try {
      if (loginMode === 'student') {
        const profile = await loginStudent(rollNumber, password);
        router.push('/dashboard');
      } else {
        const profile = await loginFaculty(email, password);
        router.push('/admin');
      }
    } catch (err: any) {
      setErrorMessage(err.message || 'Authentication failed. Please check your credentials.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      {/* ── Keyframe animations ────────────────────────────────── */}
      <style>{`
        @keyframes floatSnippet {
          0%   { transform: translateY(0px) translateX(0px); opacity: var(--op); }
          33%  { transform: translateY(-18px) translateX(8px); opacity: calc(var(--op) * 1.3); }
          66%  { transform: translateY(10px) translateX(-6px); opacity: calc(var(--op) * 0.7); }
          100% { transform: translateY(0px) translateX(0px); opacity: var(--op); }
        }
        @keyframes pulseOrb {
          0%, 100% { transform: scale(1); opacity: 0.55; }
          50%       { transform: scale(1.12); opacity: 0.75; }
        }
        @keyframes neonPulse {
          0%, 100% { opacity: 1; }
          50%       { opacity: 0.6; }
        }
        @keyframes scanline {
          0%   { background-position: 0 0; }
          100% { background-position: 0 100%; }
        }
        .neon-top-border {
          background: linear-gradient(90deg, #00ff88, #00d4ff, #6366f1);
          animation: neonPulse 3s ease-in-out infinite;
        }
        .snippet-float {
          animation: floatSnippet var(--dur) ease-in-out var(--delay) infinite;
        }
        .orb-pulse {
          animation: pulseOrb 6s ease-in-out infinite;
        }
      `}</style>

      {/* ── Full-screen background ─────────────────────────────── */}
      <div
        className="relative flex min-h-screen items-center justify-center p-4 overflow-hidden"
        style={{
          backgroundColor: '#0a0f1e',
          backgroundImage: `
            linear-gradient(rgba(0,255,136,0.03) 1px, transparent 1px),
            linear-gradient(90deg, rgba(0,255,136,0.03) 1px, transparent 1px)
          `,
          backgroundSize: '40px 40px',
        }}
      >
        {/* Light-mode overlay */}
        <div className="absolute inset-0 bg-blue-50/90 dark:bg-transparent transition-colors duration-500 pointer-events-none" />

        {/* Glowing orbs */}
        <div
          className="orb-pulse pointer-events-none absolute -top-40 -left-40 h-[520px] w-[520px] rounded-full"
          style={{
            background: 'radial-gradient(circle, rgba(0,255,136,0.18) 0%, transparent 70%)',
            filter: 'blur(60px)',
          }}
        />
        <div
          className="orb-pulse pointer-events-none absolute -bottom-40 -right-40 h-[480px] w-[480px] rounded-full"
          style={{
            background: 'radial-gradient(circle, rgba(0,212,255,0.15) 0%, transparent 70%)',
            filter: 'blur(60px)',
            animationDelay: '2s',
          }}
        />
        <div
          className="orb-pulse pointer-events-none absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 h-[300px] w-[300px] rounded-full"
          style={{
            background: 'radial-gradient(circle, rgba(99,102,241,0.12) 0%, transparent 70%)',
            filter: 'blur(80px)',
            animationDelay: '4s',
          }}
        />

        {/* ── Floating code snippets ─────────────────────────── */}
        {CODE_SNIPPETS.map((s, i) => (
          <span
            key={i}
            className="snippet-float pointer-events-none select-none absolute font-mono dark:text-[#00ff88] text-indigo-700 dark:opacity-100"
            style={{
              top: s.top,
              left: s.left,
              fontSize: s.size,
              opacity: s.opacity,
              '--op': s.opacity,
              '--dur': s.duration,
              '--delay': s.delay,
              whiteSpace: 'nowrap',
              letterSpacing: '0.04em',
            } as React.CSSProperties}
          >
            {s.text}
          </span>
        ))}

        {/* ── Central card ──────────────────────────────────────── */}
        <div className="w-full max-w-md relative z-10">
          <div
            className="relative rounded-2xl overflow-hidden border dark:border-[#1e3a5f]/60 border-blue-200/80 dark:bg-[#0d1b2a]/90 bg-white/80 backdrop-blur-xl shadow-2xl"
            style={{ boxShadow: '0 0 60px rgba(0,255,136,0.08), 0 0 120px rgba(0,212,255,0.05)' }}
          >
            {/* Neon top border */}
            <div className="neon-top-border absolute top-0 inset-x-0 h-[2px]" />

            {/* ThemeToggle */}
            <div className="absolute right-4 top-4 z-20">
              <ThemeToggle />
            </div>

            <div className="px-8 pt-8 pb-7">
              {/* ── Logo / Branding ──────────────────────────── */}
              <div className="flex flex-col items-center text-center mb-8 pt-1">
                {/* Terminal icon */}
                <div
                  className="mb-4 flex h-16 w-16 items-center justify-center rounded-2xl border dark:border-[#00ff88]/30 border-indigo-300/60 dark:bg-[#0a1628] bg-indigo-50"
                  style={{ boxShadow: '0 0 20px rgba(0,255,136,0.15)' }}
                >
                  <GraduationCap className="h-8 w-8 dark:text-[#00ff88] text-indigo-600" />
                </div>

                {/* Title with blinking cursor */}
                <h1 className="text-xl font-bold tracking-tight dark:text-white text-slate-900 font-mono flex items-center gap-1">
                  <span className="dark:text-[#00ff88] text-indigo-500 mr-1">&gt;_</span>
                  AJ Practice Portal
                  <span
                    className="inline-block w-[2px] h-5 dark:bg-[#00ff88] bg-indigo-500 ml-1 align-middle"
                    style={{ opacity: cursorOn ? 1 : 0, transition: 'opacity 0.1s' }}
                  />
                </h1>
                <p className="text-xs dark:text-[#00d4ff]/70 text-indigo-500/80 mt-2 font-mono tracking-widest uppercase">
                  C Programming &amp; Data Structures Lab
                </p>
              </div>

              {/* ── Mode Switcher ────────────────────────────── */}
              <div className="grid grid-cols-2 gap-1.5 p-1 dark:bg-[#060e1c] bg-slate-100 rounded-xl border dark:border-[#1e3a5f]/50 border-slate-200 mb-6">
                {(['student', 'faculty'] as const).map((mode) => {
                  const active = loginMode === mode;
                  return (
                    <button
                      key={mode}
                      type="button"
                      onClick={() => {
                        setLoginMode(mode);
                        setErrorMessage('');
                        setPassword('');
                      }}
                      className="relative py-2.5 text-xs font-semibold rounded-lg transition-all duration-300 cursor-pointer font-mono uppercase tracking-wider"
                      style={
                        active
                          ? {
                              background: 'linear-gradient(135deg, rgba(0,255,136,0.12), rgba(0,212,255,0.10))',
                              border: '1px solid rgba(0,255,136,0.35)',
                              color: '#00ff88',
                              boxShadow: '0 0 12px rgba(0,255,136,0.15)',
                            }
                          : {
                              border: '1px solid transparent',
                              color: undefined,
                            }
                      }
                    >
                      <span className={active ? '' : 'dark:text-slate-500 text-slate-400 hover:dark:text-slate-300 hover:text-slate-600'}>
                        {mode === 'student' ? '// Student' : '/* Faculty */'}
                      </span>
                    </button>
                  );
                })}
              </div>

              {/* ── Error message ────────────────────────────── */}
              {errorMessage && (
                <div
                  className="mb-5 rounded-xl p-3.5 text-sm font-mono flex items-start gap-2 dark:bg-red-950/30 bg-red-50 dark:border-red-900/50 border border-red-200"
                  style={{ color: '#ff6b6b' }}
                >
                  <span className="mt-0.5 shrink-0 text-[10px] opacity-70">ERR!</span>
                  {errorMessage}
                </div>
              )}

              {/* ── Form ─────────────────────────────────────── */}
              <form onSubmit={handleSubmit} className="space-y-5">

                {loginMode === 'student' ? (
                  <div className="space-y-1.5">
                    <label className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-widest dark:text-[#00d4ff]/70 text-indigo-500 font-mono">
                      <span className="dark:text-[#00ff88] text-indigo-400">&gt;</span> Roll Number
                    </label>
                    <input
                      type="text"
                      required
                      value={rollNumber}
                      onChange={(e) => setRollNumber(e.target.value)}
                      placeholder="Enter your roll number"
                      className="w-full rounded-xl border dark:border-[#1e3a5f] border-slate-300 dark:bg-[#0a1628] bg-slate-50 px-4 py-3 text-sm font-mono dark:text-slate-100 text-slate-900 dark:placeholder-slate-600 placeholder-slate-400 outline-none transition-all duration-200 dark:focus:border-[#00ff88] focus:border-indigo-400 dark:focus:ring-1 dark:focus:ring-[#00ff88]/30 focus:ring-2 focus:ring-indigo-100"
                    />
                  </div>
                ) : (
                  <div className="space-y-1.5">
                    <label className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-widest dark:text-[#00d4ff]/70 text-indigo-500 font-mono">
                      <span className="dark:text-[#00ff88] text-indigo-400">&gt;</span> Faculty Email
                    </label>
                    <input
                      type="email"
                      required
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="Enter your email address"
                      className="w-full rounded-xl border dark:border-[#1e3a5f] border-slate-300 dark:bg-[#0a1628] bg-slate-50 px-4 py-3 text-sm font-mono dark:text-slate-100 text-slate-900 dark:placeholder-slate-600 placeholder-slate-400 outline-none transition-all duration-200 dark:focus:border-[#00ff88] focus:border-indigo-400 dark:focus:ring-1 dark:focus:ring-[#00ff88]/30 focus:ring-2 focus:ring-indigo-100"
                    />
                  </div>
                )}

                {/* Password */}
                <div className="space-y-1.5">
                  <label className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-widest dark:text-[#00d4ff]/70 text-indigo-500 font-mono">
                    <span className="dark:text-[#00ff88] text-indigo-400">&gt;</span> Password
                  </label>
                  <div className="relative">
                    <input
                      type={showPassword ? 'text' : 'password'}
                      required
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="Enter your password"
                      className="w-full rounded-xl border dark:border-[#1e3a5f] border-slate-300 dark:bg-[#0a1628] bg-slate-50 px-4 py-3 pr-12 text-sm font-mono dark:text-slate-100 text-slate-900 dark:placeholder-slate-600 placeholder-slate-400 outline-none transition-all duration-200 dark:focus:border-[#00ff88] focus:border-indigo-400 dark:focus:ring-1 dark:focus:ring-[#00ff88]/30 focus:ring-2 focus:ring-indigo-100"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3.5 top-1/2 -translate-y-1/2 dark:text-slate-500 text-slate-400 dark:hover:text-[#00ff88] hover:text-indigo-500 transition-colors duration-150 cursor-pointer"
                    >
                      {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                </div>

                {/* Submit */}
                <button
                  type="submit"
                  disabled={loading}
                  className="w-full mt-2 flex items-center justify-center gap-2 rounded-xl py-3.5 text-sm font-bold font-mono tracking-wider transition-all duration-300 cursor-pointer active:scale-[0.98] disabled:opacity-60 disabled:cursor-not-allowed"
                  style={{
                    background: loading
                      ? 'linear-gradient(90deg, #00cc70, #00aad4, #4f52d4)'
                      : 'linear-gradient(90deg, #00ff88, #00d4ff, #6366f1)',
                    color: '#0a0f1e',
                    boxShadow: loading ? 'none' : '0 0 0 rgba(0,255,136,0)',
                  }}
                  onMouseEnter={e => {
                    (e.currentTarget as HTMLButtonElement).style.boxShadow = '0 0 24px rgba(0,255,136,0.4), 0 0 48px rgba(0,212,255,0.2)';
                  }}
                  onMouseLeave={e => {
                    (e.currentTarget as HTMLButtonElement).style.boxShadow = '0 0 0 rgba(0,255,136,0)';
                  }}
                >
                  {loading ? (
                    <>
                      <svg className="animate-spin h-4 w-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                      </svg>
                      Authenticating...
                    </>
                  ) : (
                    <>
                      ./login --exec
                      <ArrowRight className="h-4 w-4" />
                    </>
                  )}
                </button>
              </form>

              {/* ── Footer hint ──────────────────────────────── */}
              <div className="mt-7 border-t dark:border-[#1e3a5f]/50 border-slate-200 pt-5 text-center">
                <p className="text-[11px] dark:text-slate-600 text-slate-400 font-mono leading-relaxed">
                  {loginMode === 'student'
                    ? '/* Account provisioned by faculty. Use assigned roll number. */'
                    : '// Use your registered faculty administrator email.'}
                </p>
              </div>
            </div>
          </div>

          {/* Attribution */}
          <p className="text-center text-[10px] dark:text-slate-700 text-slate-400 mt-5 font-mono tracking-widest">
            Portal By VVS &middot; Secure Login &middot; <span className="dark:text-[#00ff88]/40 text-indigo-400/60">v2.0</span>
          </p>
        </div>
      </div>
    </>
  );
}
