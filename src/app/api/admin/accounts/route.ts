import type { NextRequest } from 'next/server';

import { isAdminAuthenticated, jsonError } from '@/lib/admin/apiAuth';
import { FirebaseAdminConfigError, getAdminDb } from '@/lib/firebase/admin';
import { organizationCollectionPath, specialistCollectionPath } from '@/lib/firestore/paths';
import type { AdminAccounts } from '@/features/admin/adminRepository';

/**
 * GET /api/admin/accounts — lists specialists and organizations for the
 * approval tables. Requires a valid admin session cookie; data is read with
 * the server-only Admin SDK.
 */
export async function GET(request: NextRequest): Promise<Response> {
  if (!isAdminAuthenticated(request)) {
    return jsonError('غير مصرح بالوصول.', 401);
  }

  try {
    const db = getAdminDb();
    const [specialistsSnap, organizationsSnap] = await Promise.all([
      db.collection(specialistCollectionPath).get(),
      db.collection(organizationCollectionPath).get(),
    ]);

    const accounts: AdminAccounts = {
      specialists: specialistsSnap.docs.map((d) => {
        const data = d.data();
        return {
          id: d.id,
          name: typeof data.fullName === 'string' ? data.fullName : '-',
          status: data.status === 'approved' ? 'approved' : 'pending',
        };
      }),
      organizations: organizationsSnap.docs.map((d) => {
        const data = d.data();
        return {
          id: d.id,
          name: typeof data.orgName === 'string' ? data.orgName : '-',
          status: data.status === 'approved' ? 'approved' : 'pending',
        };
      }),
    };

    return Response.json(accounts);
  } catch (error) {
    if (error instanceof FirebaseAdminConfigError) {
      console.error('[admin/accounts] admin credentials are not configured.');
      return jsonError('خدمة البيانات غير مهيأة حالياً.', 503);
    }
    console.error('[admin/accounts] failed to load accounts:', error);
    return jsonError('تعذر تحميل البيانات، حاول مرة أخرى.', 500);
  }
}
