import { NextResponse, type NextRequest } from 'next/server';
import { getAdminAuth, getAdminDb, getAdminStorage, FirebaseAdminConfigError } from '@/lib/firebase/admin';
import { organizationCollectionPath, organizationDocPath, specialistCollectionPath, specialistDocPath } from '@/lib/firestore/paths';
import { maskNationalIdForOrganization } from '@/lib/utils/cv';
import type { OrganizationDirectoryEntry, PublicSpecialist } from '@/types';

function jsonError(message: string, status: number): Response {
  return Response.json({ error: message }, { status });
}

function publicSpecialist(
  id: string,
  data: Record<string, unknown>,
  storage: ReturnType<typeof getAdminStorage> | null,
): Promise<PublicSpecialist> {
  const rawId = typeof data.nationalId === 'string' ? data.nationalId : '';
  const profilePic = typeof data.profilePic === 'string' ? data.profilePic : null;
  const resumeFile = typeof data.resumeFile === 'string' ? data.resumeFile : null;
  const signedAsset = async (value: string | null, legacyPrefix: string | null) => {
    if (!value) return null;
    if (legacyPrefix && value.startsWith(legacyPrefix)) return value;
    if (value.startsWith('data:application/pdf')) return value;
    if (!storage || !value.startsWith('https://')) return null;
    const marker = '/o/';
    const markerIndex = value.indexOf(marker);
    if (markerIndex < 0) return null;
    const rawPath = value.slice(markerIndex + marker.length).split('?')[0];
    let path: string;
    try {
      path = decodeURIComponent(rawPath);
    } catch {
      return null;
    }
    if (!path.startsWith(`specialists/${id}/`)) return null;
    const [signedUrl] = await storage
      .bucket()
      .file(path)
      .getSignedUrl({ action: 'read', expires: Date.now() + 15 * 60 * 1000 });
    return signedUrl;
  };

  return Promise.all([signedAsset(profilePic, 'data:image/'), signedAsset(resumeFile, null)]).then(
    ([safeProfilePic, safeResumeFile]) => ({
      id,
      status: 'approved',
      fullName: typeof data.fullName === 'string' ? data.fullName : '',
      nationalId: maskNationalIdForOrganization(rawId),
      email: typeof data.email === 'string' ? data.email : '',
      phone: typeof data.phone === 'string' ? data.phone : '',
      license: typeof data.license === 'string' ? data.license : '',
      edu: typeof data.edu === 'string' ? data.edu : null,
      years: typeof data.years === 'string' || typeof data.years === 'number' ? data.years : null,
      exp: typeof data.exp === 'string' ? data.exp : null,
      portfolio: typeof data.portfolio === 'string' ? data.portfolio : null,
      profilePic: safeProfilePic,
      resumeFile: safeResumeFile,
    }),
  );
}

function publicOrganization(id: string, data: Record<string, unknown>): OrganizationDirectoryEntry {
  return { id, orgName: typeof data.orgName === 'string' ? data.orgName : '' };
}

export async function GET(request: NextRequest): Promise<Response> {
  const authHeader = request.headers.get('authorization');
  if (!authHeader?.startsWith('Bearer ')) return jsonError('غير مصرح بال الوصول.', 401);

  try {
    const decoded = await getAdminAuth().verifyIdToken(authHeader.slice(7));
    const db = getAdminDb();
    const kind = request.nextUrl.searchParams.get('kind');
    const requestedUid = request.nextUrl.searchParams.get('uid');
    if (kind !== 'specialists' && kind !== 'organizations') return jsonError('طلب غير صالح.', 400);

    const storage = kind === 'specialists' && requestedUid ? getAdminStorage() : null;
    if (kind === 'specialists') {
      const callerOrg = await db.doc(organizationDocPath(decoded.uid)).get();
      if (callerOrg.data()?.status !== 'approved') return jsonError('غير مصرح بالوصول.', 403);
      if (requestedUid) {
        const snapshot = await db.doc(specialistDocPath(requestedUid)).get();
        if (!snapshot.exists || snapshot.data()?.status !== 'approved') return jsonError('غير موجود.', 404);
        return NextResponse.json(await publicSpecialist(snapshot.id, snapshot.data() as Record<string, unknown>, storage));
      }
      const snapshot = await db.collection(specialistCollectionPath).where('status', '==', 'approved').limit(500).get();
      return NextResponse.json(
        snapshot.docs.map((d) => ({
          id: d.id,
          status: 'approved' as const,
          fullName: typeof d.data().fullName === 'string' ? d.data().fullName : '',
          edu: typeof d.data().edu === 'string' ? d.data().edu : null,
        })),
      );
    }

    const callerSpec = await db.doc(specialistDocPath(decoded.uid)).get();
    if (callerSpec.data()?.status !== 'approved') return jsonError('غير مصرح بالوصول.', 403);
    if (requestedUid) {
      const snapshot = await db.doc(organizationDocPath(requestedUid)).get();
      if (!snapshot.exists || snapshot.data()?.status !== 'approved') return jsonError('غير موجود.', 404);
      return NextResponse.json(publicOrganization(snapshot.id, snapshot.data() as Record<string, unknown>));
    }
    const snapshot = await db.collection(organizationCollectionPath).where('status', '==', 'approved').limit(500).get();
    return NextResponse.json(
      snapshot.docs.map((d) => ({ id: d.id, orgName: typeof d.data().orgName === 'string' ? d.data().orgName : '' })),
    );
  } catch (error) {
    if (error instanceof FirebaseAdminConfigError) return jsonError('خدمة البيانات غير مهيأة حالياً.', 503);
    console.error('[directory] request failed:', error);
    return jsonError('تعذر تحميل البيانات، حاول مرة أخرى.', 500);
  }
}
