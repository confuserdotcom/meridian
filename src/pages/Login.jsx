import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { login, register } from '../lib/auth';

function MeridianMark() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.25">
      <circle cx="12" cy="12" r="10" />
      <line x1="12" y1="0" x2="12" y2="24" />
    </svg>
  );
}

export default function Login() {
  const navigate = useNavigate();
  const [mode, setMode] = useState('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      if (mode === 'login') {
        await login(email, password);
      } else {
        await register(email, password, name);
      }
      navigate('/');
    } catch (err) {
      setError(err.message || 'Something went wrong.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-paper dark:bg-ink text-ink dark:text-paper flex items-center justify-center">
      <div className="w-full max-w-sm border border-line p-8">
        {/* Mark + wordmark */}
        <div className="flex flex-col items-center gap-1.5 mb-8">
          <MeridianMark />
          <span className="font-mono text-[10px] tracking-[0.28em] text-muted uppercase">MERIDIAN</span>
        </div>

        {/* Heading */}
        <h1 className="font-display italic text-[32px] leading-tight mb-6">
          {mode === 'login' ? 'Welcome back.' : 'Create account.'}
        </h1>

        <form onSubmit={handleSubmit} className="flex flex-col gap-3">
          {mode === 'register' && (
            <input
              type="text"
              placeholder="Name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              className="w-full border border-line rounded-none py-2 px-3 text-sm font-sans bg-transparent text-ink dark:text-paper placeholder:text-muted focus:outline-none focus:ring-1 focus:ring-accent"
            />
          )}
          <input
            type="email"
            placeholder="Email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            className="w-full border border-line rounded-none py-2 px-3 text-sm font-sans bg-transparent text-ink dark:text-paper placeholder:text-muted focus:outline-none focus:ring-1 focus:ring-accent"
          />
          <input
            type="password"
            placeholder="Password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            className="w-full border border-line rounded-none py-2 px-3 text-sm font-sans bg-transparent text-ink dark:text-paper placeholder:text-muted focus:outline-none focus:ring-1 focus:ring-accent"
          />

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-ink dark:bg-paper text-paper dark:text-ink py-2 rounded-sm font-mono text-[10px] tracking-[0.18em] uppercase mt-1 disabled:opacity-50"
          >
            {loading ? '...' : mode === 'login' ? 'SIGN IN' : 'REGISTER'}
          </button>

          {error && <p className="text-red-500 text-xs">{error}</p>}
        </form>

        {/* Mode toggle */}
        <p className="mt-5 text-xs font-mono text-muted">
          {mode === 'login' ? (
            <>
              No account?{' '}
              <span
                className="text-accent cursor-pointer"
                onClick={() => { setMode('register'); setError(''); }}
              >
                Register →
              </span>
            </>
          ) : (
            <>
              Have an account?{' '}
              <span
                className="text-accent cursor-pointer"
                onClick={() => { setMode('login'); setError(''); }}
              >
                Sign in →
              </span>
            </>
          )}
        </p>
      </div>
    </div>
  );
}
