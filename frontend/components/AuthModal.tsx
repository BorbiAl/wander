'use client';

import { useState } from 'react';
import { X, Mail, LogIn, Loader2, KeyRound } from 'lucide-react';

type Props = {
  onClose: () => void;
  onSuccess: (result: { email: string; userId: string; state: Record<string, unknown> | null }) => void;
};

export function AuthModal({ onClose, onSuccess }: Props) {
  const [step, setStep] = useState<'email' | 'code'>('email');
  const [email, setEmail] = useState('');
  const [code, setCode] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleSendCode(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const res = await fetch('/api/auth/otp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'send', email }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? 'Failed to send code');
        return;
      }
      setStep('code');
    } catch {
      setError('Network error — please try again');
    } finally {
      setLoading(false);
    }
  }

  async function handleVerifyCode(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const res = await fetch('/api/auth/otp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'verify', email, code }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? 'Verification failed');
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

        {step === 'email' ? (
          <>
            <div className="mb-6">
              <h2 className="text-[#1A2E1C] text-xl font-bold tracking-tight">Sign in</h2>
              <p className="text-[#1A2E1C]/50 text-sm mt-1">
                Enter your email — we&apos;ll send you a 6-digit code
              </p>
            </div>

            <form onSubmit={handleSendCode} className="space-y-4">
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 text-[#1A2E1C]/30 w-4 h-4" />
                <input
                  type="email"
                  placeholder="Email address"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  required
                  autoFocus
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
                ) : (
                  <><Mail className="w-4 h-4" /> Send code</>
                )}
              </button>
            </form>
          </>
        ) : (
          <>
            <div className="mb-6">
              <h2 className="text-[#1A2E1C] text-xl font-bold tracking-tight">Enter code</h2>
              <p className="text-[#1A2E1C]/50 text-sm mt-1">
                We sent a 6-digit code to <span className="font-medium text-[#1A2E1C]/70">{email}</span>
              </p>
            </div>

            <form onSubmit={handleVerifyCode} className="space-y-4">
              <div className="relative">
                <KeyRound className="absolute left-3 top-1/2 -translate-y-1/2 text-[#1A2E1C]/30 w-4 h-4" />
                <input
                  type="text"
                  inputMode="numeric"
                  pattern="\d{6}"
                  maxLength={6}
                  placeholder="000000"
                  value={code}
                  onChange={e => setCode(e.target.value.replace(/\D/g, ''))}
                  required
                  autoFocus
                  className="w-full pl-9 pr-4 py-2.5 rounded-xl border border-[#D6DCCD] bg-white text-[#1A2E1C] text-sm tracking-widest placeholder:text-[#1A2E1C]/30 focus:outline-none focus:ring-2 focus:ring-[#0B6E2A]/30 focus:border-[#0B6E2A] transition"
                />
              </div>

              {error && (
                <p className="text-red-600 text-xs bg-red-50 border border-red-200 rounded-lg px-3 py-2">
                  {error}
                </p>
              )}

              <button
                type="submit"
                disabled={loading || code.length !== 6}
                className="w-full flex items-center justify-center gap-2 bg-[#0B6E2A] text-white text-sm font-semibold py-2.5 rounded-xl hover:bg-[#095A22] transition-colors disabled:opacity-60 disabled:cursor-not-allowed shadow-md shadow-[#0B6E2A]/20"
              >
                {loading ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <><LogIn className="w-4 h-4" /> Verify &amp; sign in</>
                )}
              </button>
            </form>

            <div className="mt-4 text-center">
              <button
                onClick={() => { setStep('email'); setCode(''); setError(''); }}
                className="text-xs text-[#1A2E1C]/50 hover:text-[#0B6E2A] transition-colors"
              >
                Use a different email
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
