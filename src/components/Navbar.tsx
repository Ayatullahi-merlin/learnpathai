import React from 'react';
import { auth } from '../firebase';
import { signInWithPopup, GoogleAuthProvider, signOut, User } from 'firebase/auth';
import { BookOpen, LogIn, LogOut, Award, Flame, GraduationCap, Compass } from 'lucide-react';
import { UserProfile } from '../types';

interface NavbarProps {
  user: User | null;
  profile: UserProfile | null;
  streak: number;
}

export default function Navbar({ user, profile, streak }: NavbarProps) {
  const loginWithGoogle = async () => {
    const provider = new GoogleAuthProvider();
    try {
      await signInWithPopup(auth, provider);
    } catch (err) {
      console.error('Google login error:', err);
    }
  };

  const logout = () => signOut(auth);

  return (
    <header className="sticky top-0 z-50 bg-white/80 backdrop-blur-md border-b border-slate-100 px-4 py-3 sm:px-6">
      <div className="max-w-7xl mx-auto flex items-center justify-between">
        {/* Branding */}
        <div className="flex items-center gap-2">
          <div className="bg-emerald-600 text-white p-2 rounded-xl flex items-center justify-center shadow-lg shadow-emerald-600/15">
            <GraduationCap className="h-6 w-6" id="logo-icon" />
          </div>
          <div>
            <h1 className="font-sans font-bold text-xl tracking-tight text-slate-800">
              LearnPath <span className="text-emerald-600">AI</span>
            </h1>
            <p className="text-[10px] uppercase tracking-wider font-mono text-slate-400">Nigeria Exam Copilot</p>
          </div>
        </div>

        {/* Action center */}
        <div className="flex items-center gap-3 sm:gap-6">
          {user ? (
            <>
              {/* Streak Counter */}
              <div className="flex items-center gap-1.5 px-3 py-1 bg-amber-50 text-amber-700 border border-amber-100 rounded-full font-sans font-medium text-xs sm:text-sm">
                <Flame className="h-4 w-4 fill-amber-500 text-amber-500 animate-pulse" />
                <span>{streak} Day {streak === 1 ? 'Streak' : 'Streaks'}</span>
              </div>

              {/* User info & Logout */}
              <div className="flex items-center gap-3">
                <div className="hidden md:block text-right">
                  <p className="font-sans text-xs font-semibold text-slate-700">{profile?.name || user.displayName}</p>
                  <p className="font-sans text-[10px] text-slate-400 font-medium">Preparing for {profile?.targetExam || 'WAEC'}</p>
                </div>
                {user.photoURL && (
                  <img
                    src={user.photoURL}
                    alt={user.displayName || 'Student'}
                    className="h-8 w-8 rounded-full border border-slate-200"
                    referrerPolicy="no-referrer"
                    id="profile-avatar"
                  />
                )}
                <button
                  onClick={logout}
                  className="flex items-center gap-1.5 px-3 py-1.5 text-xs text-rose-600 hover:bg-rose-50 rounded-lg transition-all duration-200 font-sans font-semibold border border-transparent hover:border-rose-100"
                  id="btn-logout"
                >
                  <LogOut className="h-4 w-4" />
                  <span className="hidden sm:inline">Logout</span>
                </button>
              </div>
            </>
          ) : (
            <button
              onClick={loginWithGoogle}
              className="flex items-center gap-2 bg-slate-900 text-white px-5 py-2 rounded-xl text-sm font-sans font-semibold shadow-lg shadow-slate-900/15 hover:bg-slate-800 hover:-translate-y-0.5 transition-all duration-200"
              id="btn-login"
            >
              <LogIn className="h-4 w-4" />
              <span>Sign in with Google</span>
            </button>
          )}
        </div>
      </div>
    </header>
  );
}
