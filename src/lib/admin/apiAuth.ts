import type { NextRequest, NextResponse } from 'next/server';

import {
  ADMIN_SESSION_COOKIE,
  ADMIN_SESSION_MAX_AGE_SECONDS,
  verifyAdminSessionToken,
} from '@/lib/admin/session';

/** Reads and verifies the admin session cookie from a request. */
export function isAdminAuthenticated(request: NextRequest): boolean {
  return verifyAdminSessionToken(request.cookies.get(ADMIN_SESSION_COOKIE)?.value);
}

/** Session cookie options shared by login/logout handlers. */
export function sessionCookieOptions() {
  return {
    name: ADMIN_SESSION_COOKIE,
    maxAge: ADMIN_SESSION_MAX_AGE_SECONDS,
    httpOnly: true,
    sameSite: 'lax' as const,
    secure: process.env.NODE_ENV === 'production',
    path: '/',
  };
}

/** Helper for JSON responses with an explicit status. */
export function jsonError(message: string, status: number): Response {
  return Response.json({ error: message }, { status });
}

/** Helper for typing route-handler response objects in handlers. */
export type ApiHandlerResponse = Response | NextResponse;
