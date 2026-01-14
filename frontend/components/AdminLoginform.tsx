'use client';

import { useState } from 'react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Field, FieldGroup, FieldLabel } from '@/components/ui/field';
import { Input } from '@/components/ui/input';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { adminLogin } from '@/lib/auth';
import { jwtDecode } from 'jwt-decode';

interface APIError {
  response?: {
    data?: {
      message?: string;
    };
  };
  message?: string;
}

export function AdminLoginForm({ className, ...props }: React.ComponentProps<'div'>) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const router = useRouter();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const res = await adminLogin(email, password);

      if (!res.success) {
        setError(res.message || 'Login failed');
        toast.error(res.message || 'Login failed');
        return;
      }

      toast.success('Login successful');

      localStorage.setItem('accessToken', res.accessToken);
      document.cookie = `accessToken=${res.accessToken}; path=/; max-age=86400; SameSite=Strict`;

      const decoded = jwtDecode<{ role: string }>(res.accessToken);
      const role = decoded.role;

      if (role === 'ADMIN') {
        router.push('/admin/dashboard');
      } else if (role === 'HR') {
        router.push('/hr/dashboard');
      } else {
        router.push('/admin/dashboard');
      }
    } catch (err: unknown) {
      let errorMessage = 'Login failed';

      if (err && typeof err === 'object' && 'response' in err) {
        const apiError = err as APIError;
        errorMessage = apiError.response?.data?.message ?? errorMessage;
      } else if (err instanceof Error) {
        errorMessage = err.message;
      }

      setError(errorMessage);
      toast.error(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className={cn('flex flex-col gap-6', className)} {...props}>
      <h1 className="text-3xl font-bold text-primary drop-shadow-sm">Xerocare</h1>

      <form onSubmit={handleSubmit}>
        <FieldGroup>
          <div className="flex flex-col items-center text-center">
            <h1 className="text-xl text-muted-foreground">Admin Login</h1>
          </div>

          <Field>
            <FieldLabel htmlFor="email">Email</FieldLabel>
            <Input
              id="email"
              type="email"
              placeholder="admin@example.com"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </Field>

          <Field>
            <FieldLabel htmlFor="password">Password</FieldLabel>
            <Input
              id="password"
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </Field>

          {error && <p className="text-sm text-red-500 text-center">{error}</p>}

          <Field>
            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? 'Logging in...' : 'Login'}
            </Button>
          </Field>
        </FieldGroup>
      </form>
    </div>
  );
}
