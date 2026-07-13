import { createClient } from '@/utils/supabase/client';

export const supabase = createClient();

// Custom Table-Based Authentication Helpers (Bypassing Supabase Auth)
const SESSION_KEY = 'java_hybrid_portal_session';

export async function loginStudent(rollNumber: string, password: string) {
  const { data: profile, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('roll_number', rollNumber.trim())
    .eq('role', 'student')
    .single();

  if (error || !profile) {
    throw new Error('No student account found with that Roll Number.');
  }

  // Plaintext password comparison as requested
  if (profile.password !== password) {
    throw new Error('Incorrect password. Please try again.');
  }

  if (typeof window !== 'undefined') {
    localStorage.setItem(SESSION_KEY, JSON.stringify(profile));
  }

  return profile;
}

export async function loginFaculty(email: string, password: string) {
  const { data: profile, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('email', email.trim())
    .eq('role', 'faculty')
    .single();

  if (error || !profile) {
    throw new Error('No faculty account found with that email address.');
  }

  if (profile.password !== password) {
    throw new Error('Incorrect password. Please try again.');
  }

  if (typeof window !== 'undefined') {
    localStorage.setItem(SESSION_KEY, JSON.stringify(profile));
  }

  return profile;
}

export function logoutUser() {
  if (typeof window !== 'undefined') {
    localStorage.removeItem(SESSION_KEY);
  }
}

export function getCurrentSession() {
  if (typeof window !== 'undefined') {
    const session = localStorage.getItem(SESSION_KEY);
    return session ? JSON.parse(session) : null;
  }
  return null;
}

export function updateLocalSession(profile: any) {
  if (typeof window !== 'undefined') {
    localStorage.setItem(SESSION_KEY, JSON.stringify(profile));
  }
}
