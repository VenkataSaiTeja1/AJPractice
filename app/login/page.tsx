'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { loginStudent, loginFaculty, getCurrentSession } from '@/lib/supabase';
import { GraduationCap, ArrowRight, Eye, EyeOff, Code2, ArrowLeftRight, Binary, Cpu } from 'lucide-react';
import ThemeToggle from '@/components/theme-toggle';
import MatrixBackground from '@/components/matrix-background';

// Floating badges for background
const FLOATING_CHIPS = [
  { text: 'void swap(int *a, int *b)', top: '6%', left: '8%', delay: '0s', dur: '16s' },
  { text: 'temp = *a; *a = *b; *b = temp;', top: '16%', right: '10%', delay: '2s', dur: '14s' },
  { text: 'int arr[] = { 64, 34, 25, 12 };', bottom: '14%', left: '6%', delay: '1s', dur: '18s' },
  { text: 'struct Node *next = malloc(...);', bottom: '8%', right: '8%', delay: '3s', dur: '15s' },
  { text: 'arr[i] ^= arr[j] ^= arr[i] ^= arr[j];', top: '48%', left: '3%', delay: '4s', dur: '20s' },
  { text: 'if (arr[j] > arr[j+1]) swap();', top: '42%', right: '4%', delay: '2.5s', dur: '17s' },
  { text: 'printf("Memory: 0x%08x\\n", &arr);', bottom: '26%', right: '14%', delay: '0.5s', dur: '19s' },
  { text: 'int *ptr = &arr[0]; *(ptr+1) = 99;', top: '28%', left: '12%', delay: '3.5s', dur: '15s' }
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

  // Blinking terminal cursor
  const [cursorOn, setCursorOn] = useState(true);

  // Live Array Swap Simulation
  const [arrayData, setArrayData] = useState<number[]>([42, 17, 89, 23, 56, 31]);
  const [swappingPair, setSwappingPair] = useState<[number, number]>([1, 3]);
  const [swapCount, setSwapCount] = useState(1);
  const [lastSwapDesc, setLastSwapDesc] = useState('arr[1] (17) ⇄ arr[3] (23)');

  // Linked list node highlight
  const [activeNode, setActiveNode] = useState(1);

  useEffect(() => {
    const curInterval = setInterval(() => setCursorOn(v => !v), 530);
    return () => clearInterval(curInterval);
  }, []);

  // Interval for live array value swapping simulation
  useEffect(() => {
    const swapInterval = setInterval(() => {
      setArrayData(prev => {
        const next = [...prev];
        const i = Math.floor(Math.random() * next.length);
        let j = Math.floor(Math.random() * next.length);
        while (j === i) {
          j = Math.floor(Math.random() * next.length);
        }
        const valI = next[i];
        const valJ = next[j];
        next[i] = valJ;
        next[j] = valI;
        setSwappingPair([i, j]);
        setLastSwapDesc(`arr[${i}] (${valI}) ⇄ arr[${j}] (${valJ})`);
        setSwapCount(c => c + 1);
        return next;
      });
      setActiveNode(n => (n + 1) % 4);
    }, 2400);

    return () => clearInterval(swapInterval);
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
        await loginStudent(rollNumber, password);
        router.push('/dashboard');
      } else {
        await loginFaculty(email, password);
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
      {/* ── Keyframe Animations ─────────────────────────────────── */}
      <style>{`
        @keyframes floatCard {
          0%, 100% { transform: translateY(0px) rotate(0deg); }
          50%       { transform: translateY(-12px) rotate(0.5deg); }
        }
        @keyframes floatReverse {
          0%, 100% { transform: translateY(0px) rotate(0deg); }
          50%       { transform: translateY(14px) rotate(-0.5deg); }
        }
        @keyframes pulseGlow {
          0%, 100% { opacity: 0.6; filter: drop-shadow(0 0 10px rgba(0,255,136,0.3)); }
          50%       { opacity: 1; filter: drop-shadow(0 0 20px rgba(0,212,255,0.6)); }
        }
        @keyframes swapHighlight {
          0%, 100% { transform: scale(1); }
          50%       { transform: scale(1.08); }
        }
        @keyframes matrixScroll {
          0%   { background-position: 0 0; }
          100% { background-position: 50px 50px; }
        }
        @keyframes neonLinePulse {
          0%, 100% { opacity: 0.9; }
          50%       { opacity: 0.4; }
        }
        .animate-float-slow {
          animation: floatCard 12s ease-in-out infinite;
        }
        .animate-float-reverse {
          animation: floatReverse 14s ease-in-out infinite;
        }
        .animate-neon-pulse {
          animation: neonLinePulse 3s ease-in-out infinite;
        }
      `}</style>

      {/* ── Fullscreen Interactive Viewport ─────────────────────── */}
      <div
        className="relative flex min-h-screen items-center justify-center p-4 overflow-hidden select-none"
        style={{
          backgroundColor: '#070b14',
        }}
      >
        {/* Dynamic Falling Green 0 and 1 Matrix Rain + Cyber Ring */}
        <MatrixBackground opacity={0.75} showCenterRing={true} />
        {/* Subtle Ambient Light Orbs */}
        <div
          className="pointer-events-none absolute -top-40 -left-40 h-[600px] w-[600px] rounded-full"
          style={{
            background: 'radial-gradient(circle, rgba(0,255,136,0.18) 0%, transparent 65%)',
            filter: 'blur(70px)',
          }}
        />
        <div
          className="pointer-events-none absolute -bottom-40 -right-40 h-[600px] w-[600px] rounded-full"
          style={{
            background: 'radial-gradient(circle, rgba(0,212,255,0.18) 0%, transparent 65%)',
            filter: 'blur(70px)',
          }}
        />
        <div
          className="pointer-events-none absolute top-1/4 right-1/4 h-[350px] w-[350px] rounded-full"
          style={{
            background: 'radial-gradient(circle, rgba(99,102,241,0.15) 0%, transparent 70%)',
            filter: 'blur(80px)',
          }}
        />

        {/* ═════════════════════════════════════════════════════════ */}
        {/* ── BACKGROUND WIDGET 1: LIVE ARRAY VALUE SWAPPER (TOP-LEFT) ── */}
        {/* ═════════════════════════════════════════════════════════ */}
        <div
          className="animate-float-slow pointer-events-none absolute top-6 left-6 hidden xl:block w-[390px] rounded-2xl border border-emerald-500/30 bg-[#0b1326]/85 backdrop-blur-md p-4.5 shadow-2xl text-slate-200 z-0"
          style={{
            boxShadow: '0 0 30px rgba(0,255,136,0.12), inset 0 0 20px rgba(0,255,136,0.03)',
          }}
        >
          {/* Card Header */}
          <div className="flex items-center justify-between border-b border-emerald-500/20 pb-2.5 mb-3">
            <div className="flex items-center gap-2">
              <span className="flex h-2 w-2 rounded-full bg-emerald-400 animate-ping" />
              <span className="text-[11px] font-mono font-bold tracking-wider text-emerald-400 flex items-center gap-1.5 uppercase">
                <ArrowLeftRight className="h-3.5 w-3.5" />
                Live Array Swap Visualizer
              </span>
            </div>
            <span className="text-[10px] font-mono text-cyan-400 bg-cyan-950/60 border border-cyan-500/30 px-2 py-0.5 rounded">
              cycle #{swapCount}
            </span>
          </div>

          {/* Visual Array Cells with Swapping Animation */}
          <div className="space-y-1.5 mb-3">
            <div className="flex items-center justify-between text-[10px] font-mono text-slate-400 px-1">
              <span>Memory buffer: int arr[6]</span>
              <span className="text-emerald-400 font-semibold">{lastSwapDesc}</span>
            </div>

            <div className="grid grid-cols-6 gap-1.5 pt-1">
              {arrayData.map((val, idx) => {
                const isSwapping = swappingPair.includes(idx);
                return (
                  <div
                    key={idx}
                    className={`relative flex flex-col items-center justify-center p-2 rounded-xl border font-mono transition-all duration-500 ${
                      isSwapping
                        ? 'border-emerald-400 bg-emerald-500/20 text-emerald-300 shadow-[0_0_15px_rgba(0,255,136,0.4)] scale-105'
                        : 'border-slate-800 bg-[#0f1b33] text-slate-300'
                    }`}
                  >
                    <span className="text-[9px] text-slate-500">[{idx}]</span>
                    <span className="text-base font-extrabold tracking-tight mt-0.5">{val}</span>
                    {isSwapping && (
                      <span className="absolute -top-1 -right-1 flex h-2 w-2">
                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-cyan-400 opacity-75" />
                        <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500" />
                      </span>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {/* C Code Snippet for Current Swap */}
          <div className="rounded-xl border border-slate-800 bg-[#070d1a] p-2.5 font-mono text-[11px] leading-relaxed">
            <div className="text-slate-500">// Real-time in-place pointer swap</div>
            <div>
              <span className="text-purple-400">void</span> <span className="text-blue-400">swap</span>(
              <span className="text-cyan-300">int</span> <span className="text-emerald-400">*a</span>,{' '}
              <span className="text-cyan-300">int</span> <span className="text-emerald-400">*b</span>) &#123;
            </div>
            <div className="pl-3.5 text-slate-300">
              <span className="text-cyan-300">int</span> temp = <span className="text-emerald-400">*a</span>;
            </div>
            <div className="pl-3.5 text-slate-300">
              <span className="text-emerald-400">*a</span> = <span className="text-emerald-400">*b</span>;
            </div>
            <div className="pl-3.5 text-slate-300">
              <span className="text-emerald-400">*b</span> = temp;
            </div>
            <div>&#125;</div>
          </div>
        </div>

        {/* ═════════════════════════════════════════════════════════ */}
        {/* ── BACKGROUND WIDGET 2: C FUNCTION POINTER CARD (TOP-RIGHT) ── */}
        {/* ═════════════════════════════════════════════════════════ */}
        <div
          className="animate-float-reverse pointer-events-none absolute top-6 right-6 hidden xl:block w-[370px] rounded-2xl border border-cyan-500/30 bg-[#0b1326]/85 backdrop-blur-md p-4.5 shadow-2xl text-slate-200 z-0"
          style={{
            boxShadow: '0 0 30px rgba(0,212,255,0.12), inset 0 0 20px rgba(0,212,255,0.03)',
          }}
        >
          {/* Header */}
          <div className="flex items-center justify-between border-b border-cyan-500/20 pb-2 mb-3">
            <div className="flex items-center gap-2">
              <Code2 className="h-4 w-4 text-cyan-400" />
              <span className="text-[11px] font-mono font-bold tracking-wider text-cyan-400 uppercase">
                core_algorithm.c
              </span>
            </div>
            <span className="text-[10px] font-mono text-emerald-400 bg-emerald-950/60 border border-emerald-500/30 px-2 py-0.5 rounded">
              GCC 13.2 -O2
            </span>
          </div>

          {/* Syntax Highlighted C Function */}
          <div className="rounded-xl border border-slate-800 bg-[#070d1a] p-3 font-mono text-[11px] leading-relaxed space-y-1">
            <div className="text-slate-500">// Partition function for QuickSort</div>
            <div>
              <span className="text-purple-400">int</span> <span className="text-blue-400">partition</span>(
              <span className="text-cyan-300">int</span> arr[], <span className="text-cyan-300">int</span> low,{' '}
              <span className="text-cyan-300">int</span> high) &#123;
            </div>
            <div className="pl-3.5 text-slate-300">
              <span className="text-cyan-300">int</span> pivot = arr[high];
            </div>
            <div className="pl-3.5 text-slate-300">
              <span className="text-cyan-300">int</span> i = (low - <span className="text-amber-400">1</span>);
            </div>
            <div className="pl-3.5 text-slate-300">
              <span className="text-purple-400">for</span> (<span className="text-cyan-300">int</span> j = low; j &lt; high; j++) &#123;
            </div>
            <div className="pl-7 text-slate-300">
              <span className="text-purple-400">if</span> (arr[j] &lt; pivot) &#123;
            </div>
            <div className="pl-10 text-emerald-400">
              i++; swap(&amp;arr[i], &amp;arr[j]);
            </div>
            <div className="pl-7 text-slate-300">&#125;</div>
            <div className="pl-3.5 text-slate-300">&#125;</div>
            <div className="pl-3.5 text-emerald-400">
              swap(&amp;arr[i + <span className="text-amber-400">1</span>], &amp;arr[high]);
            </div>
            <div className="pl-3.5 text-slate-300">
              <span className="text-purple-400">return</span> (i + <span className="text-amber-400">1</span>);
            </div>
            <div>&#125;</div>
          </div>

          <div className="flex items-center justify-between text-[10px] font-mono text-slate-400 mt-2.5 px-1">
            <span>Stack Frame: 0x7ffe42</span>
            <span className="text-cyan-400">Complexity: O(n log n)</span>
          </div>
        </div>

        {/* ═════════════════════════════════════════════════════════ */}
        {/* ── BACKGROUND WIDGET 3: LINKED LIST POINTERS (BOTTOM-LEFT) ── */}
        {/* ═════════════════════════════════════════════════════════ */}
        <div
          className="animate-float-reverse pointer-events-none absolute bottom-6 left-6 hidden lg:block w-[410px] rounded-2xl border border-indigo-500/30 bg-[#0b1326]/85 backdrop-blur-md p-4 shadow-2xl text-slate-200 z-0"
          style={{
            boxShadow: '0 0 30px rgba(99,102,241,0.12), inset 0 0 20px rgba(99,102,241,0.03)',
          }}
        >
          <div className="flex items-center justify-between border-b border-indigo-500/20 pb-2 mb-2.5">
            <span className="text-[11px] font-mono font-bold tracking-wider text-indigo-400 flex items-center gap-1.5 uppercase">
              <Cpu className="h-3.5 w-3.5" />
              Singly Linked List Nodes &amp; Pointers
            </span>
            <span className="text-[10px] font-mono text-slate-400">heap: malloc()</span>
          </div>

          {/* Node chain graphic */}
          <div className="flex items-center gap-2 overflow-x-auto py-1">
            {[10, 25, 42, 88].map((val, idx) => (
              <React.Fragment key={idx}>
                <div
                  className={`flex items-center rounded-xl border p-1.5 font-mono text-xs transition-all duration-300 ${
                    activeNode === idx
                      ? 'border-indigo-400 bg-indigo-500/20 text-indigo-200 shadow-[0_0_12px_rgba(99,102,241,0.5)]'
                      : 'border-slate-800 bg-[#0f1b33] text-slate-300'
                  }`}
                >
                  <span className="px-2 font-bold text-white">{val}</span>
                  <span className="border-l border-slate-700 pl-1.5 pr-1 text-[10px] text-indigo-400">●next</span>
                </div>
                {idx < 3 ? (
                  <span className="text-cyan-400 font-bold text-xs">➔</span>
                ) : (
                  <span className="text-[10px] font-mono text-rose-400 border border-rose-500/30 bg-rose-950/40 px-1.5 py-0.5 rounded">
                    NULL
                  </span>
                )}
              </React.Fragment>
            ))}
          </div>

          <div className="mt-2.5 rounded-lg border border-slate-800 bg-[#070d1a] px-2.5 py-1.5 font-mono text-[10.5px] text-slate-400 flex items-center justify-between">
            <span>struct Node *head = malloc(sizeof(Node));</span>
            <span className="text-emerald-400">head-&gt;data = 10;</span>
          </div>
        </div>

        {/* ═════════════════════════════════════════════════════════ */}
        {/* ── BACKGROUND WIDGET 4: XOR VALUE SWAP TRICK (BOTTOM-RIGHT) ── */}
        {/* ═════════════════════════════════════════════════════════ */}
        <div
          className="animate-float-slow pointer-events-none absolute bottom-6 right-6 hidden lg:block w-[360px] rounded-2xl border border-amber-500/30 bg-[#0b1326]/85 backdrop-blur-md p-4 shadow-2xl text-slate-200 z-0"
          style={{
            boxShadow: '0 0 30px rgba(245,158,11,0.12), inset 0 0 20px rgba(245,158,11,0.03)',
          }}
        >
          <div className="flex items-center justify-between border-b border-amber-500/20 pb-2 mb-2.5">
            <span className="text-[11px] font-mono font-bold tracking-wider text-amber-400 flex items-center gap-1.5 uppercase">
              <Binary className="h-3.5 w-3.5" />
              Bitwise XOR Swap (Zero Temp Memory)
            </span>
            <span className="text-[10px] font-mono text-emerald-400">O(1) Aux Space</span>
          </div>

          <div className="rounded-xl border border-slate-800 bg-[#070d1a] p-2.5 font-mono text-[11px] leading-relaxed space-y-1">
            <div className="text-slate-400">
              <span className="text-cyan-300">int</span> x = <span className="text-amber-400">15</span>, y = <span className="text-amber-400">27</span>;
            </div>
            <div className="text-emerald-400 pl-2">x = x ^ y; <span className="text-slate-600">// Step 1: XOR combo</span></div>
            <div className="text-cyan-400 pl-2">y = x ^ y; <span className="text-slate-600">// Step 2: y gets original x</span></div>
            <div className="text-indigo-400 pl-2">x = x ^ y; <span className="text-slate-600">// Step 3: x gets original y</span></div>
            <div className="text-[10.5px] text-slate-400 pt-1 border-t border-slate-800/80 flex items-center justify-between">
              <span>Result: x == 27, y == 15</span>
              <span className="text-emerald-400 font-bold">✓ Swapped</span>
            </div>
          </div>
        </div>

        {/* ── Additional floating C syntax badges ─────────────────── */}
        {FLOATING_CHIPS.map((chip, i) => (
          <div
            key={i}
            className="pointer-events-none select-none absolute hidden md:flex items-center gap-1.5 px-3 py-1.5 rounded-full border border-slate-800/80 bg-[#091122]/70 backdrop-blur-sm text-[11px] font-mono text-slate-300 shadow-lg z-0"
            style={{
              top: chip.top,
              left: chip.left,
              right: chip.right,
              bottom: chip.bottom,
              animation: `floatCard ${chip.dur} ease-in-out ${chip.delay} infinite`,
            }}
          >
            <span className="h-1.5 w-1.5 rounded-full bg-cyan-400/80" />
            <span>{chip.text}</span>
          </div>
        ))}

        {/* ═════════════════════════════════════════════════════════ */}
        {/* ── CENTRAL LOGIN CARD (FOREGROUND - Z-20) ─────────────── */}
        {/* ═════════════════════════════════════════════════════════ */}
        <div className="w-full max-w-md relative z-20 my-auto">
          <div
            className="relative rounded-3xl overflow-hidden border border-cyan-500/40 bg-[#0a1224]/92 backdrop-blur-2xl shadow-2xl"
            style={{
              boxShadow: '0 0 50px rgba(0, 255, 136, 0.15), 0 0 100px rgba(0, 212, 255, 0.1), inset 0 0 30px rgba(0, 255, 136, 0.04)',
            }}
          >
            {/* Glowing neon top stripe */}
            <div
              className="animate-neon-pulse absolute top-0 inset-x-0 h-[3px]"
              style={{
                background: 'linear-gradient(90deg, #00ff88 0%, #00d4ff 50%, #6366f1 100%)',
              }}
            />

            {/* Top Right Theme Toggle */}
            <div className="absolute right-4 top-4 z-30">
              <ThemeToggle />
            </div>

            <div className="px-7 sm:px-9 pt-8 pb-7">
              {/* Header Branding */}
              <div className="flex flex-col items-center text-center mb-7 pt-1">
                <div
                  className="mb-3.5 flex h-16 w-16 items-center justify-center rounded-2xl border border-emerald-500/40 bg-[#070e1c] shadow-[0_0_25px_rgba(0,255,136,0.25)]"
                >
                  <GraduationCap className="h-8 w-8 text-emerald-400" />
                </div>

                <h1 className="text-2xl font-black tracking-tight text-white font-mono flex items-center justify-center gap-1.5">
                  <span className="text-emerald-400">&gt;_</span>
                  <span>AJ Practice Portal</span>
                  <span
                    className="inline-block w-[3px] h-5 bg-emerald-400 ml-0.5 align-middle"
                    style={{ opacity: cursorOn ? 1 : 0, transition: 'opacity 0.1s' }}
                  />
                </h1>

                <div className="mt-2 inline-flex items-center gap-2 px-3 py-1 rounded-full border border-cyan-500/30 bg-cyan-950/40 text-[11px] font-mono text-cyan-300">
                  <span className="h-1.5 w-1.5 rounded-full bg-cyan-400 animate-pulse" />
                  C Programming &amp; Data Structures Arena
                </div>
              </div>

              {/* Mode Switcher Tabs */}
              <div className="grid grid-cols-2 gap-1.5 p-1 bg-[#050a14] rounded-xl border border-slate-800 mb-6">
                {(['student', 'faculty'] as const).map(mode => {
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
                      className="py-2.5 text-xs font-bold rounded-lg transition-all duration-300 cursor-pointer font-mono uppercase tracking-wider flex items-center justify-center gap-1.5"
                      style={
                        active
                          ? {
                              background: 'linear-gradient(135deg, rgba(0,255,136,0.2), rgba(0,212,255,0.15))',
                              border: '1px solid rgba(0,255,136,0.5)',
                              color: '#00ff88',
                              boxShadow: '0 0 16px rgba(0,255,136,0.25)',
                            }
                          : {
                              border: '1px solid transparent',
                              color: '#64748b',
                            }
                      }
                    >
                      <span>{mode === 'student' ? '// Student' : '/* Faculty */'}</span>
                    </button>
                  );
                })}
              </div>

              {/* Error Message */}
              {errorMessage && (
                <div
                  className="mb-5 rounded-xl p-3.5 text-xs font-mono flex items-start gap-2 bg-red-950/40 border border-red-500/40 text-red-300 shadow-[0_0_15px_rgba(239,68,68,0.2)]"
                >
                  <span className="font-bold text-red-400">ERR_AUTH:</span>
                  <span>{errorMessage}</span>
                </div>
              )}

              {/* Form */}
              <form onSubmit={handleSubmit} className="space-y-4.5">
                {loginMode === 'student' ? (
                  <div className="space-y-1.5">
                    <label className="flex items-center justify-between text-[11px] font-bold uppercase tracking-wider text-cyan-300 font-mono">
                      <span className="flex items-center gap-1.5">
                        <span className="text-emerald-400">&gt;</span> Roll Number
                      </span>
                      <span className="text-[10px] text-slate-500 font-normal">e.g. 26FE1A4351</span>
                    </label>
                    <input
                      type="text"
                      required
                      value={rollNumber}
                      onChange={e => setRollNumber(e.target.value)}
                      placeholder="Enter registered roll number"
                      className="w-full rounded-xl border border-slate-700 bg-[#070e1c] px-4 py-3 text-sm font-mono text-slate-100 placeholder-slate-500 outline-none transition-all duration-200 focus:border-emerald-400 focus:ring-2 focus:ring-emerald-400/20"
                    />
                  </div>
                ) : (
                  <div className="space-y-1.5">
                    <label className="flex items-center justify-between text-[11px] font-bold uppercase tracking-wider text-cyan-300 font-mono">
                      <span className="flex items-center gap-1.5">
                        <span className="text-emerald-400">&gt;</span> Faculty Email
                      </span>
                      <span className="text-[10px] text-slate-500 font-normal">administrator</span>
                    </label>
                    <input
                      type="email"
                      required
                      value={email}
                      onChange={e => setEmail(e.target.value)}
                      placeholder="Enter faculty email"
                      className="w-full rounded-xl border border-slate-700 bg-[#070e1c] px-4 py-3 text-sm font-mono text-slate-100 placeholder-slate-500 outline-none transition-all duration-200 focus:border-emerald-400 focus:ring-2 focus:ring-emerald-400/20"
                    />
                  </div>
                )}

                {/* Password Input */}
                <div className="space-y-1.5">
                  <label className="flex items-center justify-between text-[11px] font-bold uppercase tracking-wider text-cyan-300 font-mono">
                    <span className="flex items-center gap-1.5">
                      <span className="text-emerald-400">&gt;</span> Security Password
                    </span>
                  </label>
                  <div className="relative">
                    <input
                      type={showPassword ? 'text' : 'password'}
                      required
                      value={password}
                      onChange={e => setPassword(e.target.value)}
                      placeholder="Enter account password"
                      className="w-full rounded-xl border border-slate-700 bg-[#070e1c] px-4 py-3 pr-12 text-sm font-mono text-slate-100 placeholder-slate-500 outline-none transition-all duration-200 focus:border-emerald-400 focus:ring-2 focus:ring-emerald-400/20"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-emerald-400 transition-colors cursor-pointer"
                    >
                      {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                </div>

                {/* Submit Action Button */}
                <button
                  type="submit"
                  disabled={loading}
                  className="w-full mt-3 flex items-center justify-center gap-2 rounded-xl py-3.5 text-sm font-extrabold font-mono tracking-wider transition-all duration-300 cursor-pointer active:scale-[0.98] disabled:opacity-60 shadow-lg"
                  style={{
                    background: 'linear-gradient(90deg, #00ff88 0%, #00d4ff 50%, #6366f1 100%)',
                    color: '#050a14',
                    boxShadow: '0 0 25px rgba(0,255,136,0.35)',
                  }}
                  onMouseEnter={e => {
                    (e.currentTarget as HTMLButtonElement).style.boxShadow =
                      '0 0 35px rgba(0,255,136,0.6), 0 0 60px rgba(0,212,255,0.4)';
                  }}
                  onMouseLeave={e => {
                    (e.currentTarget as HTMLButtonElement).style.boxShadow = '0 0 25px rgba(0,255,136,0.35)';
                  }}
                >
                  {loading ? (
                    <>
                      <svg className="animate-spin h-4 w-4 text-[#050a14]" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                      </svg>
                      <span>Authenticating Credentials...</span>
                    </>
                  ) : (
                    <>
                      <span>EXECUTE &amp; ENTER ARENA</span>
                      <ArrowRight className="h-4 w-4" />
                    </>
                  )}
                </button>
              </form>

              {/* Terminal Tip */}
              <div className="mt-6 border-t border-slate-800/80 pt-4 text-center">
                <p className="text-[11px] text-slate-500 font-mono leading-relaxed">
                  {loginMode === 'student'
                    ? '/* Default password is your roll number unless updated */'
                    : '// Authorized faculty access portal only.'}
                </p>
              </div>
            </div>
          </div>

          {/* Attribution Tag */}
          <div className="flex items-center justify-center gap-3 mt-4 text-[10px] font-mono text-slate-500">
            <span>Portal By VVS</span>
            <span>&bull;</span>
            <span className="text-emerald-400/80">C &amp; DS Core Engine</span>
            <span>&bull;</span>
            <span>GCC Native</span>
          </div>
        </div>
      </div>
    </>
  );
}
