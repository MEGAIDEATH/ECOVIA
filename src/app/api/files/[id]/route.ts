import { type NextRequest } from 'next/server';

import { jsonError, mapError } from '@/lib/api/http';
import { getSessionUserFromRequest } from '@/lib/auth/session';
import { getStorage } from '@/lib/storage';
import { getDocumentById } from '@/repositories/documents';
import { isApprovedProfileOfKind } from '@/repositories/profiles';

/**
 * GET /api/files/[id]
 *
 * Serves protected document files:
 * 1. Owner can always view/download
 * 2. Admin can always view/download
 * 3. Approved organizations can view specialist resume/profilePic
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
): Promise<Response> {
  try {
    const { id } = await params;
    const user = await getSessionUserFromRequest(request);
    if (!user) return jsonError('غير مصرح بالوصول.', 401);

    const doc = await getDocumentById(id);
    if (!doc) return jsonError('الملف غير موجود.', 404);

    // Authorization checks
    const isOwner = doc.ownerUserId === user.id;
    const isAdmin = user.role === 'admin';
    let isAuthorized = isOwner || isAdmin;

    if (!isAuthorized) {
      // Check if caller is an approved organization viewing a specialist document
      if (doc.kind === 'resume' || doc.kind === 'profile_image') {
        const callerIsOrg = await isApprovedProfileOfKind(user.id, 'organizations');
        if (callerIsOrg) isAuthorized = true;
      }
    }

    if (!isAuthorized) {
      return jsonError('غير مصرح بالوصول إلى هذا الملف.', 403);
    }

    const storage = getStorage();
    const file = await storage.get(doc.storageKey);

    return new Response(file.stream, {
      headers: {
        'Content-Type': doc.contentType,
        'Content-Length': String(file.size),
        'Cache-Control': 'private, max-age=3600',
      },
    });
  } catch (error) {
    return mapError(error, 'files:get');
  }
}
