import { useState } from 'react';
import { API_URL } from '../lib/api';
import { ThemeToggle } from '../components/layout/ThemeToggle';
import { DitLogo } from '../components/DitLogo';

type LoginPageProps = {
  onSuccess: (token: string) => void;
};

export function LoginPage({ onSuccess }: LoginPageProps) {
  const [email, setEmail] = useState('admin@dit.ac.tz');
  const [password, setPassword] = useState('password123');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setError('');
    setLoading(true);

    try {
      const response = await fetch(`${API_URL}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });

      if (!response.ok) {
        throw new Error(
          response.status === 401
            ? 'Invalid email or password.'
            : `Login failed with status ${response.status}.`,
        );
      }

      const result = await response.json();
      if (!result.accessToken) {
        throw new Error('Login response did not include an access token.');
      }

      onSuccess(result.accessToken);
    } catch (err) {
      setError(
        err instanceof TypeError
          ? `Cannot reach API at ${API_URL}. Start the NestJS API first.`
          : err instanceof Error
            ? err.message
            : 'Login failed.',
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="login-page">
      <div className="login-theme-toggle">
        <ThemeToggle />
      </div>

      <form className="login-panel" onSubmit={handleSubmit}>
        <div className="login-brand">
          <DitLogo size={72} className="login-logo" />
          <p className="login-institution">Dar es Salaam Institute of Technology</p>
          <h1>AC Control Center</h1>
          <p className="login-lead">
            Facilities login for live air conditioner monitoring and control.
          </p>
        </div>

        <label className="field">
          <span>Email</span>
          <input
            type="email"
            autoComplete="username"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            required
          />
        </label>

        <label className="field">
          <span>Password</span>
          <input
            type="password"
            autoComplete="current-password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            required
          />
        </label>

        {error && (
          <div className="error-box" role="alert">
            {error}
          </div>
        )}

        <button type="submit" className="btn-primary" disabled={loading}>
          {loading ? 'Signing in…' : 'Sign in'}
        </button>
      </form>
    </main>
  );
}
