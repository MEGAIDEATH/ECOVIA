import type { NextRequest } from 'next/server';

import { jsonOk, mapError } from '@/lib/api/http';
import { requireUser } from '@/lib/auth/session';
import { getDb } from '@/db';
import { account } from '@/db/schema';
import { eq } from 'drizzle-orm';

export async function GET(request: NextRequest): Promise<Response> {
  try {
    const user = await requireUser(request);
    const db = getDb();
    const rows = await db
      .select({ password: account.password })
      .from(account)
      .where(eq(account.userId, user.id));
    const hasPassword = rows.some((row) => Boolean(row.password));
    return jsonOk({ hasPassword });
  } catch (error) {
    return mapError(error, 'account/password-status');
  }
}
