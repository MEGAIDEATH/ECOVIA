import { getAuth } from '@/lib/auth';

/**
 * Better Auth catch-all handler. Everything under `/api/auth/*` (sign-in with
 * code, password sign-in, session refresh, sign-out) is served by Better Auth
 * against PostgreSQL.
 */
export async function GET(request: Request): Promise<Response> {
  return getAuth().handler(request);
}

export async function POST(request: Request): Promise<Response> {
  return getAuth().handler(request);
}
