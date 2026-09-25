import type { NextRequest } from 'next/server';

import { isAdminAuthenticated } from '@/lib/admin/apiAuth';

/** GET /api/admin/session — tells the client whether an admin session exists. */
export async function GET(request: NextRequest): Promise<Response> {
  return Response.json({ authenticated: isAdminAuthenticated(request) });
}
