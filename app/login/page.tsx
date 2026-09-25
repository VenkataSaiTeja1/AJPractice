'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { loginStudent, loginFaculty, getCurrentSession } from '@/lib/supabase';
import { GraduationCap, ArrowRight, Eye, EyeOff } from 'lucide-react';

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
    <div className="flex min-h-screen items-center justify-center p-4 bg-gradient-to-br from-slate-100 via-white to-indigo-50 relative overflow-hidden">

      {/* Decorative gradient blobs */}
      <div className="pointer-events-none absolute -top-32 -left-32 h-[420px] w-[420px] rounded-full bg-indigo-200/50 blur-[100px]" />
      <div className="pointer-events-none absolute -bottom-40 -right-40 h-[480px] w-[480px] rounded-full bg-purple-200/40 blur-[120px]" />
      <div className="pointer-events-none absolute top-1/3 right-1/4 h-[260px] w-[260px] rounded-full bg-sky-200/30 blur-[90px]" />

      <div className="w-full max-w-md relative">
        {/* Card */}
        <div className="rounded-2xl bg-white border border-slate-200 shadow-xl shadow-slate-200/60 p-8 relative overflow-hidden">

          {/* Subtle top accent bar */}
          <div className="absolute top-0 inset-x-0 h-1 bg-gradient-to-r from-indigo-500 via-purple-500 to-indigo-500" />

          {/* Header / Branding */}
          <div className="flex flex-col items-center justify-center text-center mb-8 pt-2">
            <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-indigo-50 text-indigo-600 border border-indigo-100 mb-4 shadow-sm">
              <GraduationCap className="h-8 w-8" />
            </div>
            <h1 className="text-2xl font-bold tracking-tight text-slate-900">
              Practice Portal By VVS
            </h1>
            <p className="text-sm text-slate-500 mt-1.5">
              Access scheduled curriculum exercises
            </p>
          </div>

          {/* Mode Switcher */}
          <div className="grid grid-cols-2 gap-1.5 p-1.5 bg-slate-100 rounded-xl border border-slate-200 mb-6">
            <button
              type="button"
              onClick={() => {
                setLoginMode('student');
                setErrorMessage('');
                setPassword('');
              }}
              className={`py-2.5 text-xs font-semibold rounded-lg transition-all duration-200 cursor-pointer ${
                loginMode === 'student'
                  ? 'bg-white text-indigo-700 shadow-sm border border-slate-200'
                  : 'text-slate-500 hover:text-slate-700 border border-transparent'
              }`}
            >
              Student Portal
            </button>
            <button
              type="button"
              onClick={() => {
                setLoginMode('faculty');
                setErrorMessage('');
                setPassword('');
              }}
              className={`py-2.5 text-xs font-semibold rounded-lg transition-all duration-200 cursor-pointer ${
                loginMode === 'faculty'
                  ? 'bg-white text-indigo-700 shadow-sm border border-slate-200'
                  : 'text-slate-500 hover:text-slate-700 border border-transparent'
              }`}
            >
              Faculty Portal
            </button>
          </div>

          {/* Messages */}
          {errorMessage && (
            <div className="mb-5 rounded-xl bg-red-50 border border-red-200 p-3.5 text-sm text-red-600 flex items-start gap-2">
              <span className="mt-0.5 shrink-0 inline-block h-1.5 w-1.5 rounded-full bg-red-500" />
              {errorMessage}
            </div>
          )}

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-5">
            
            {loginMode === 'student' ? (
              /* Student: Roll Number input */
              <div className="space-y-2">
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500">
                  Roll Number
                </label>
                <input
                  type="text"
                  required
                  value={rollNumber}
                  onChange={(e) => setRollNumber(e.target.value)}
                  placeholder="Enter your roll number"
                  className="w-full rounded-xl border border-slate-300 bg-slate-50 px-4 py-3 text-sm text-slate-900 placeholder-slate-400 outline-none transition-all duration-200 focus:border-indigo-400 focus:bg-white focus:ring-2 focus:ring-indigo-100"
                />
              </div>
            ) : (
              /* Faculty: Email input */
              <div className="space-y-2">
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500">
                  Faculty Email
                </label>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="Enter your email address"
                  className="w-full rounded-xl border border-slate-300 bg-slate-50 px-4 py-3 text-sm text-slate-900 placeholder-slate-400 outline-none transition-all duration-200 focus:border-indigo-400 focus:bg-white focus:ring-2 focus:ring-indigo-100"
                />
              </div>
            )}

            {/* Password */}
            <div className="space-y-2">
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500">
                Password
              </label>
              <div className="relative">
                <input
                  type={showPassword ? "text" : "password"}
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Enter your password"
                  className="w-full rounded-xl border border-slate-300 bg-slate-50 px-4 py-3 pr-11 text-sm text-slate-900 placeholder-slate-400 outline-none transition-all duration-200 focus:border-indigo-400 focus:bg-white focus:ring-2 focus:ring-indigo-100"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-indigo-500 transition-colors duration-150 cursor-pointer"
                >
                  {showPassword ? (
                    <EyeOff className="h-4 w-4" />
                  ) : (
                    <Eye className="h-4 w-4" />
                  )}
                </button>
              </div>
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={loading}
              className="w-full mt-2 flex items-center justify-center gap-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 disabled:bg-indigo-400 disabled:cursor-not-allowed py-3 text-sm font-semibold text-white transition-all duration-200 shadow-md shadow-indigo-200 hover:shadow-lg hover:shadow-indigo-300 cursor-pointer active:scale-[0.98]"
            >
              {loading ? (
                <>
                  <svg className="animate-spin h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                  </svg>
                  Authenticating...
                </>
              ) : (
                <>
                  Sign In
                  <ArrowRight className="h-4 w-4" />
                </>
              )}
            </button>
          </form>

          {/* Notice */}
          <div className="text-center mt-8 border-t border-slate-100 pt-5">
            <p className="text-[11px] text-slate-400 leading-relaxed">
              {loginMode === 'student' 
                ? 'Your account must be created by your faculty representative. Use the roll number assigned to you.'
                : 'Use your registered faculty administrator email and password.'}
            </p>
          </div>

        </div>

        {/* Bottom attribution */}
        <p className="text-center text-[10px] text-slate-400 mt-6">
          Advanced Java Practice Portal &middot; Secure Login
        </p>
      </div>
    </div>
  );
}
