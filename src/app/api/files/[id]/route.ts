import { type NextRequest } from 'next/server';

import { mapError } from '@/lib/api/http';
import { requireAuthenticatedUser } from '@/lib/auth/policies';
import { requireRecordAccess } from '@/lib/auth/recordAccess';
import { getStorage } from '@/lib/storage';

/**
 * GET /api/files/[id] — streams a private document after authorization
 * (owner, admin, or a counterparty allowed by the workflow — see
 * `canViewDocument`). Files are never served from a public URL; every request
 * re-checks access, so a copied link is useless to anyone else.
 * 401 signed out · 403 not allowed · 404 unknown id.
 */
export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }): Promise<Response> {
  try {
    const { id } = await params;
    const account = await requireAuthenticatedUser(request);
    const doc = await requireRecordAccess(account, { kind: 'document', id });

    const file = await getStorage().get(doc.storageKey);
    const sensitive = doc.kind === 'license' || doc.kind === 'commercial_registration' || doc.kind === 'resume';
    return new Response(file.stream, {
      headers: {
        'Content-Type': doc.contentType,
        'Content-Length': String(file.size),
        // Registration documents and CVs are never kept in shared/disk caches.
        'Cache-Control': sensitive ? 'private, no-store' : 'private, max-age=300',
        // Stored type was detected server-side; never let the browser sniff.
        'X-Content-Type-Options': 'nosniff',
        'Content-Disposition': 'inline',
        'Referrer-Policy': 'no-referrer',
      },
    });
  } catch (error) {
    return mapError(error, 'files:get');
  }
}
