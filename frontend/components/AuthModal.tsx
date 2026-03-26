'use client';

import { useState } from 'react';
import { X, Mail, Lock, LogIn, UserPlus, Loader2 } from 'lucide-react';

type Props = {
  onClose: () => void;
  onSuccess: (result: { email: string; userId: string; state: Record<string, unknown> | null }) => void;
};

export function AuthModal({ onClose, onSuccess }: Props) {
  const [mode, setMode] = useState<'login' | 'register'>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const res = await fetch('/api/auth', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: mode, email, password }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? 'Something went wrong');
        return;
      }
      onSuccess({ email, userId: data.userId as string, state: data.state as Record<string, unknown> | null });
    } catch {
      setError('Network error — please try again');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
      <div className="relative bg-[#F5F7F2] rounded-2xl shadow-2xl w-full max-w-sm p-7 border border-[#D6DCCD]">
        <button
          onClick={onClose}
          aria-label="Close auth dialog"
          title="Close"
          className="absolute top-4 right-4 text-[#1A2E1C]/40 hover:text-[#1A2E1C] transition-colors"
        >
          <X size={18} />
        </button>

        <div className="mb-6">
          <h2 className="text-[#1A2E1C] text-xl font-bold tracking-tight">
            {mode === 'login' ? 'Welcome back' : 'Create account'}
          </h2>
          <p className="text-[#1A2E1C]/50 text-sm mt-1">
            {mode === 'login'
              ? 'Log in to restore your saved journey'
              : 'Save your journey and access it anywhere'}
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="relative">
            <Mail className="absolute left-3 top-1/2 -translate-y-1/2 text-[#1A2E1C]/30 w-4 h-4" />
            <input
              type="email"
              placeholder="Email address"
              value={email}
              onChange={e => setEmail(e.target.value)}
              required
              className="w-full pl-9 pr-4 py-2.5 rounded-xl border border-[#D6DCCD] bg-white text-[#1A2E1C] text-sm placeholder:text-[#1A2E1C]/30 focus:outline-none focus:ring-2 focus:ring-[#0B6E2A]/30 focus:border-[#0B6E2A] transition"
            />
          </div>

          <div className="relative">
            <Lock className="absolute left-3 top-1/2 -translate-y-1/2 text-[#1A2E1C]/30 w-4 h-4" />
            <input
              type="password"
              placeholder="Password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              required
              minLength={6}
              className="w-full pl-9 pr-4 py-2.5 rounded-xl border border-[#D6DCCD] bg-white text-[#1A2E1C] text-sm placeholder:text-[#1A2E1C]/30 focus:outline-none focus:ring-2 focus:ring-[#0B6E2A]/30 focus:border-[#0B6E2A] transition"
            />
          </div>

          {error && (
            <p className="text-red-600 text-xs bg-red-50 border border-red-200 rounded-lg px-3 py-2">
              {error}
            </p>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full flex items-center justify-center gap-2 bg-[#0B6E2A] text-white text-sm font-semibold py-2.5 rounded-xl hover:bg-[#095A22] transition-colors disabled:opacity-60 disabled:cursor-not-allowed shadow-md shadow-[#0B6E2A]/20"
          >
            {loading ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : mode === 'login' ? (
              <><LogIn className="w-4 h-4" /> Log in</>
            ) : (
              <><UserPlus className="w-4 h-4" /> Create account</>
            )}
          </button>
        </form>

        <div className="mt-5 text-center">
          <button
            onClick={() => { setMode(m => m === 'login' ? 'register' : 'login'); setError(''); }}
            className="text-xs text-[#1A2E1C]/50 hover:text-[#0B6E2A] transition-colors"
          >
            {mode === 'login' ? "Don't have an account? Sign up" : 'Already have an account? Log in'}
          </button>
        </div>
      </div>
    </div>
  );
}
