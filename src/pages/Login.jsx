import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

function MeridianMark({ size = 24 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.25" aria-hidden="true">
      <circle cx="12" cy="12" r="10" />
      <line x1="12" y1="0" x2="12" y2="24" />
    </svg>
  );
}

export default function Login() {
  const { login, register } = useAuth();
  const navigate = useNavigate();
  const [mode, setMode] = useState('login'); // 'login' | 'register'
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      if (mode === 'login') {
        await login(email, password);
      } else {
        if (!name.trim()) { setError('Name required'); setLoading(false); return; }
        await register(name, email, password);
      }
      navigate('/', { replace: true });
    } catch (err) {
      setError(err.message ?? 'Something went wrong');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-paper dark:bg-ink flex items-center justify-center px-6">
      <div className="w-full max-w-xs">
        <div className="flex flex-col items-center gap-3 mb-10">
          <MeridianMark size={28} />
          <span className="font-mono text-[11px] tracking-[0.28em] text-ink dark:text-paper">MERIDIAN</span>
        </div>

        <form onSubmit={handleSubmit} className="flex flex-col gap-3">
          {mode === 'register' && (
            <div className="flex flex-col gap-1">
              <label htmlFor="name" className="sr-only">Name</label>
              <input
                id="name"
                type="text"
                placeholder="Name"
                value={name}
                onChange={(e) => { setName(e.target.value); setError(''); }}
                autoComplete="name"
                required
                className="w-full border border-line dark:border-[#222] bg-transparent px-3 py-2 text-sm font-sans text-ink dark:text-paper placeholder:text-muted focus:outline-none focus:border-accent rounded-sm"
              />
            </div>
          )}
          <div className="flex flex-col gap-1">
            <label htmlFor="email" className="sr-only">Email</label>
            <input
              id="email"
              type="email"
              placeholder="Email"
              value={email}
              onChange={(e) => { setEmail(e.target.value); setError(''); }}
              autoComplete="email"
              required
              className="w-full border border-line dark:border-[#222] bg-transparent px-3 py-2 text-sm font-sans text-ink dark:text-paper placeholder:text-muted focus:outline-none focus:border-accent rounded-sm"
            />
          </div>
          <div className="flex flex-col gap-1">
            <label htmlFor="password" className="sr-only">Password</label>
            <input
              id="password"
              type="password"
              placeholder="Password"
              value={password}
              onChange={(e) => { setPassword(e.target.value); setError(''); }}
              autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
              required
              minLength={8}
              className="w-full border border-line dark:border-[#222] bg-transparent px-3 py-2 text-sm font-sans text-ink dark:text-paper placeholder:text-muted focus:outline-none focus:border-accent rounded-sm"
            />
          </div>

          {error && (
            <p className="text-[11px] font-mono text-muted">{error}</p>
          )}

          <button
            type="submit"
            disabled={loading}
            aria-busy={loading}
            className="w-full bg-ink dark:bg-paper text-paper dark:text-ink font-mono text-[10px] uppercase tracking-[0.18em] py-2.5 rounded-sm disabled:opacity-50 transition-opacity"
          >
            {loading
              ? mode === 'login' ? 'Signing in...' : 'Creating account...'
              : mode === 'login' ? 'Sign in' : 'Create account'}
          </button>
        </form>

        <button
          onClick={() => { setMode(m => m === 'login' ? 'register' : 'login'); setError(''); }}
          className="mt-4 w-full text-center font-mono text-[10px] text-muted hover:text-ink dark:hover:text-paper transition-colors"
        >
          {mode === 'login' ? 'No account? Register' : 'Have account? Sign in'}
        </button>
      </div>
    </div>
  );
}
