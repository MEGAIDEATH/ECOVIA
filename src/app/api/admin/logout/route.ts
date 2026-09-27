import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';

import { mapError } from '@/lib/api/http';
import { getAuth } from '@/lib/auth';

/**
 * POST /api/admin/logout
 */
export async function POST(request: NextRequest): Promise<Response> {
  try {
    await getAuth().api.signOut({ headers: request.headers, asResponse: true });
    const response = NextResponse.json({ ok: true });
    response.cookies.set('better-auth.session_token', '', {
      maxAge: 0,
      httpOnly: true,
      sameSite: 'lax',
      path: '/',
      secure: process.env.NODE_ENV === 'production',
    });
    return response;
  } catch (error) {
    return mapError(error, 'admin/logout');
  }
}
