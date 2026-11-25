'use server';

import { cookies, headers } from 'next/headers';
import { redirect } from 'next/navigation';

import { getAuth } from '@/lib/auth';
import { ACTIVE_ROLE_COOKIE, homePathFor, ownedRoles, parseRole, profileFor } from '@/lib/auth/access';
import { getCurrentAccount } from '@/lib/auth/policies';

import { formString } from './result';

const SECURE = process.env.NODE_ENV === 'production';

/**
 * Switches between the facility and specialist profiles of ONE user. The
 * submitted role only selects among profiles the session user already owns;
 * it never grants anything — every page and action re-checks access.
 */
export async function switchAccountAction(formData: FormData): Promise<void> {
  const account = await getCurrentAccount();
  if (!account) redirect('/login');
  const role = parseRole(formString(formData, 'role'));
  const profile = role ? profileFor(account.facts, role) : null;
  if (!role || !profile || !ownedRoles(account.facts).includes(role)) {
    redirect('/dashboard');
  }
  const store = await cookies();
  store.set(ACTIVE_ROLE_COOKIE, role, {
    httpOnly: true,
    sameSite: 'lax',
    secure: SECURE,
    path: '/',
    maxAge: 60 * 60 * 24 * 365,
  });
  redirect(homePathFor(role, profile.status));
}

const AUTH_COOKIES = ['better-auth.session_token', 'better-auth.session_data', 'better-auth.dont_remember'];

/**
 * Signs out on the server (the Better Auth session row is deleted) and clears
 * the session cookies in this browser. Works for every account state,
 * including pending and rejected accounts.
 */
export async function logoutAction(): Promise<void> {
  try {
    await getAuth().api.signOut({ headers: await headers() });
  } catch (error) {
    // Already signed out / expired session: still clear the cookies below.
    console.warn('[logout] signOut failed:', error instanceof Error ? error.message : error);
  }
  const store = await cookies();
  for (const name of AUTH_COOKIES) {
    store.set(name, '', { maxAge: 0, path: '/', httpOnly: true, sameSite: 'lax' });
    store.set(`__Secure-${name}`, '', { maxAge: 0, path: '/', httpOnly: true, sameSite: 'lax', secure: true });
  }
  store.set(ACTIVE_ROLE_COOKIE, '', { maxAge: 0, path: '/' });
  redirect('/');
}
