'use client';

import * as React from 'react';
import { useActionState } from 'react';
import { signIn } from '../actions';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

export default function LoginPage() {
  const [state, formAction, isPending] = useActionState(signIn, null);

  return (
    <main className="min-h-screen flex items-center justify-center bg-canvas-light px-4 py-12 dark:bg-canvas-dark">
      <div className="w-full max-w-sm border border-border-light bg-surface-light p-8 rounded-md shadow-sm dark:border-border-dark dark:bg-surface-dark">
        <div className="mb-6 text-center">
          <h1 className="text-xl font-semibold tracking-tight text-primaryText-light dark:text-primaryText-dark">
            Personal Planner
          </h1>
          <p className="mt-1 text-xs text-mutedText-light dark:text-mutedText-dark">
            Sign in to access your personal plan
          </p>
        </div>

        {state?.error && (
          <div
            data-testid="auth-error"
            className="mb-4 rounded border border-red-200 bg-red-50 p-2.5 text-xs text-red-700 dark:border-red-900/50 dark:bg-red-950/30 dark:text-red-300"
          >
            {state.error}
          </div>
        )}

        <form action={formAction} className="space-y-4">
          <div>
            <label
              htmlFor="email"
              className="block text-xs font-medium text-primaryText-light dark:text-primaryText-dark"
            >
              Email address
            </label>
            <Input
              id="email"
              name="email"
              type="email"
              autoComplete="email"
              required
              placeholder="owner@example.com"
              className="mt-1"
            />
          </div>

          <div>
            <label
              htmlFor="password"
              className="block text-xs font-medium text-primaryText-light dark:text-primaryText-dark"
            >
              Password
            </label>
            <Input
              id="password"
              name="password"
              type="password"
              autoComplete="current-password"
              required
              placeholder="••••••••"
              className="mt-1"
            />
          </div>

          <Button
            type="submit"
            disabled={isPending}
            className="w-full mt-2"
          >
            {isPending ? 'Signing in...' : 'Sign in'}
          </Button>
        </form>
      </div>
    </main>
  );
}
