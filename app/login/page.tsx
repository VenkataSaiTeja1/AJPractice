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
    <div className="flex min-h-screen items-center justify-center p-4">
      <div className="w-full max-w-md glass-card p-8 border border-indigo-500/10 shadow-2xl relative overflow-hidden">
        
        {/* Glow Element */}
        <div className="absolute -top-24 -left-24 h-48 w-48 rounded-full bg-indigo-600/20 blur-3xl" />
        <div className="absolute -bottom-24 -right-24 h-48 w-48 rounded-full bg-purple-600/20 blur-3xl" />

        <div className="relative">
          {/* Header */}
          <div className="flex flex-col items-center justify-center text-center mb-6">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-indigo-600/20 text-indigo-400 border border-indigo-500/20 mb-3 shadow-lg">
              <GraduationCap className="h-7 w-7" />
            </div>
            <h1 className="text-2xl font-bold tracking-tight text-white">
              Practice Portal By VVS
            </h1>
            <p className="text-sm text-slate-400 mt-1.5">
              Access scheduled curriculum exercises
            </p>
          </div>

          {/* Mode Switcher */}
          <div className="grid grid-cols-2 gap-2 p-1 bg-slate-950/80 rounded-lg border border-slate-900 mb-6">
            <button
              type="button"
              onClick={() => {
                setLoginMode('student');
                setErrorMessage('');
                setPassword('');
              }}
              className={`py-2 text-xs font-semibold rounded-md transition-all cursor-pointer ${
                loginMode === 'student'
                  ? 'bg-indigo-600 text-white shadow'
                  : 'text-slate-400 hover:text-slate-200'
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
              className={`py-2 text-xs font-semibold rounded-md transition-all cursor-pointer ${
                loginMode === 'faculty'
                  ? 'bg-indigo-600 text-white shadow'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              Faculty Portal
            </button>
          </div>

          {/* Messages */}
          {errorMessage && (
            <div className="mb-4 rounded-lg bg-red-500/10 border border-red-500/20 p-3.5 text-sm text-red-400">
              {errorMessage}
            </div>
          )}

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-4">
            
            {loginMode === 'student' ? (
              /* Student: Roll Number input */
              <div className="space-y-1.5">
                <label className="text-xs font-semibold uppercase tracking-wider text-slate-400">Roll Number</label>
                <input
                  type="text"
                  required
                  value={rollNumber}
                  onChange={(e) => setRollNumber(e.target.value)}
                  className="w-full glass-input"
                />
              </div>
            ) : (
              /* Faculty: Email input */
              <div className="space-y-1.5">
                <label className="text-xs font-semibold uppercase tracking-wider text-slate-400">Faculty Email</label>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full glass-input"
                />
              </div>
            )}

            {/* Password */}
            <div className="space-y-1.5">
              <label className="text-xs font-semibold uppercase tracking-wider text-slate-400">Password</label>
              <div className="relative">
                <input
                  type={showPassword ? "text" : "password"}
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full glass-input pr-10"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors cursor-pointer"
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
              className="w-full mt-2 flex items-center justify-center gap-2 rounded-lg bg-indigo-600 hover:bg-indigo-500 disabled:bg-indigo-600/50 py-3 text-sm font-semibold text-white transition-all shadow-lg glow-hover cursor-pointer"
            >
              {loading ? 'Authenticating...' : 'Sign In'}
              {!loading && <ArrowRight className="h-4 w-4" />}
            </button>
          </form>

          {/* Notice */}
          <div className="text-center mt-6 border-t border-slate-900 pt-4">
            <p className="text-[10px] text-slate-500 leading-normal">
              {loginMode === 'student' 
                ? 'Your account must be created by your faculty representative. Use the roll number assigned to you.'
                : 'Use your registered faculty administrator email and password.'}
            </p>
          </div>

        </div>
      </div>
    </div>
  );
}
