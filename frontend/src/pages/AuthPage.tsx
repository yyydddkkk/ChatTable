import { useMemo, useState } from 'react';
import {
  ArrowRight,
  Building2,
  KeyRound,
  Loader2,
  Lock,
  UserRound,
} from 'lucide-react';

import { useAuthStore } from '../stores/authStore';

type AuthMode = 'login' | 'register';

export default function AuthPage() {
  const { error, isLoading, login, register, clearError } = useAuthStore();
  const [mode, setMode] = useState<AuthMode>('login');
  const [tenantId, setTenantId] = useState('local');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [successMessage, setSuccessMessage] = useState('');

  const submitLabel = useMemo(
    () => (mode === 'login' ? 'Sign In' : 'Create Account'),
    [mode],
  );

  const switchMode = (nextMode: AuthMode) => {
    setMode(nextMode);
    setSuccessMessage('');
    clearError();
  };

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setSuccessMessage('');
    clearError();

    if (mode === 'login') {
      await login({
        tenant_id: tenantId,
        username,
        password,
      });
      return;
    }

    const success = await register({
      tenant_id: tenantId,
      username,
      password,
    });
    if (success) {
      setSuccessMessage('Registration succeeded. You can sign in now.');
      setMode('login');
    }
  };

  return (
    <div
      className="min-h-screen w-full flex items-center justify-center px-4 py-10"
      style={{
        background:
          'radial-gradient(1200px 700px at 8% 8%, rgba(234,120,80,0.14), transparent 55%), radial-gradient(1000px 600px at 92% 92%, rgba(90,142,232,0.12), transparent 55%), var(--color-background)',
      }}
    >
      <div
        className="w-full max-w-5xl rounded-3xl overflow-hidden border"
        style={{
          background: 'var(--color-surface)',
          borderColor: 'var(--color-border)',
          boxShadow: '0 22px 50px rgba(30, 25, 20, 0.12)',
        }}
      >
        <div className="grid grid-cols-1 md:grid-cols-[1.08fr_1fr]">
          <section
            className="relative p-8 md:p-10"
            style={{
              background:
                'linear-gradient(160deg, #FFF8F4 0%, #FFEFE8 45%, #F7F2ED 100%)',
            }}
          >
            <div className="absolute -top-10 -right-16 w-56 h-56 rounded-full bg-[--color-primary]/15 blur-2xl" />
            <div className="absolute -bottom-12 -left-10 w-52 h-52 rounded-full bg-[--color-secondary]/15 blur-2xl" />

            <div className="relative z-10">
              <div
                className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-xs tracking-wide uppercase"
                style={{
                  color: 'var(--color-primary)',
                  background: 'var(--color-primary-light)',
                  border: '1px solid rgba(234,120,80,0.25)',
                }}
              >
                <KeyRound size={14} />
                ChatTable Workspace
              </div>

              <h1
                className="mt-6 text-3xl md:text-4xl font-semibold leading-tight"
                style={{ color: 'var(--color-text)' }}
              >
                Tenant-aware sign in for team chat control
              </h1>
              <p
                className="mt-4 leading-7 text-sm md:text-base max-w-md"
                style={{ color: 'var(--color-text-muted)' }}
              >
                Use your tenant, username, and password to access isolated
                agents, conversations, and settings.
              </p>

              <div className="mt-10 space-y-3 text-sm">
                <FeatureRow text="Multi-tenant isolation with X-Tenant-Id" />
                <FeatureRow text="JWT authorization for API calls" />
                <FeatureRow text="Route guard and 401 redirect protection" />
              </div>
            </div>
          </section>

          <section className="p-8 md:p-10">
            <div
              className="flex items-center gap-2 rounded-xl p-1 mb-6"
              style={{ background: 'var(--color-surface-elevated)' }}
            >
              <AuthTab
                active={mode === 'login'}
                label="Login"
                onClick={() => switchMode('login')}
              />
              <AuthTab
                active={mode === 'register'}
                label="Register"
                onClick={() => switchMode('register')}
              />
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              <LabeledInput
                autoComplete="organization"
                icon={Building2}
                label="Tenant ID"
                onChange={setTenantId}
                placeholder="team-a"
                value={tenantId}
              />
              <LabeledInput
                autoComplete="username"
                icon={UserRound}
                label="Username"
                onChange={setUsername}
                placeholder="alice"
                value={username}
              />
              <LabeledInput
                autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
                icon={Lock}
                label="Password"
                onChange={setPassword}
                placeholder="At least 6 characters"
                type="password"
                value={password}
              />

              {error && (
                <p className="text-sm text-red-600 bg-red-50 border border-red-100 px-3 py-2 rounded-lg">
                  {error}
                </p>
              )}
              {successMessage && (
                <p className="text-sm text-emerald-700 bg-emerald-50 border border-emerald-100 px-3 py-2 rounded-lg">
                  {successMessage}
                </p>
              )}

              <button
                className="w-full min-h-[46px] rounded-xl text-white font-medium transition-all duration-200 flex items-center justify-center gap-2 disabled:opacity-60"
                disabled={
                  isLoading ||
                  !tenantId.trim() ||
                  !username.trim() ||
                  !password.trim()
                }
                style={{
                  background:
                    'linear-gradient(135deg, #EA7850 0%, #E86848 100%)',
                  boxShadow: '0 8px 20px rgba(234,120,80,0.32)',
                }}
                type="submit"
              >
                {isLoading ? (
                  <>
                    <Loader2 className="animate-spin" size={16} />
                    Working...
                  </>
                ) : (
                  <>
                    {submitLabel}
                    <ArrowRight size={16} />
                  </>
                )}
              </button>
            </form>
          </section>
        </div>
      </div>
    </div>
  );
}

function FeatureRow({ text }: { text: string }) {
  return (
    <div className="flex items-start gap-2" style={{ color: 'var(--color-text)' }}>
      <span className="mt-1 inline-block w-2 h-2 rounded-full bg-[--color-primary]" />
      <p>{text}</p>
    </div>
  );
}

function AuthTab({
  active,
  label,
  onClick,
}: {
  active: boolean;
  label: string;
  onClick: () => void;
}) {
  return (
    <button
      className="flex-1 min-h-[42px] rounded-lg text-sm font-medium transition-all duration-200"
      onClick={onClick}
      style={{
        background: active ? 'var(--color-surface)' : 'transparent',
        color: active ? 'var(--color-text)' : 'var(--color-text-muted)',
        boxShadow: active ? '0 2px 10px rgba(0,0,0,0.08)' : 'none',
      }}
      type="button"
    >
      {label}
    </button>
  );
}

function LabeledInput({
  autoComplete,
  icon: Icon,
  label,
  onChange,
  placeholder,
  type = 'text',
  value,
}: {
  autoComplete: string;
  icon: typeof Building2;
  label: string;
  onChange: (value: string) => void;
  placeholder: string;
  type?: 'password' | 'text';
  value: string;
}) {
  return (
    <label className="block">
      <span className="text-sm font-medium text-[--color-text]">{label}</span>
      <div className="mt-1.5 relative">
        <Icon
          className="absolute left-3 top-1/2 -translate-y-1/2 text-[--color-text-muted]"
          size={17}
        />
        <input
          autoComplete={autoComplete}
          className="w-full min-h-[44px] rounded-xl pl-10 pr-3 outline-none transition-all"
          onChange={(event) => onChange(event.target.value)}
          placeholder={placeholder}
          type={type}
          value={value}
          style={{
            border: '1px solid var(--color-border-light)',
            background: 'var(--color-surface)',
            color: 'var(--color-text)',
          }}
        />
      </div>
    </label>
  );
}
