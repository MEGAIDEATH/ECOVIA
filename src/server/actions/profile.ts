'use server';

import { revalidatePath } from 'next/cache';

import { requireRole } from '@/lib/auth/policies';
import { parseOrganizationProfileInput } from '@/lib/validation/profile';
import { isOwnDocumentOfKind } from '@/repositories/documents';
import { updateOrganizationProfile } from '@/repositories/profiles';

import { failure, formString, success, toFailure, type ActionState } from './result';

/**
 * Facility profile (logo, fields of business, description, website, contact
 * phone). Allowed for pending facilities too. The registered name and CR
 * number are not editable here: they were verified at registration.
 */
export async function updateOrganizationProfileAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  try {
    const { account } = await requireRole('org');
    const parsed = parseOrganizationProfileInput({
      phone: formString(formData, 'phone'),
      orgDesc: formString(formData, 'orgDesc'),
      businessFields: formData.getAll('businessFields'),
      website: formString(formData, 'website'),
      profileImageId: formString(formData, 'profileImageId'),
    });
    if (!parsed.ok) return failure(parsed.error, parsed.fieldErrors);
    const { image, ...fields } = parsed.data;
    if (image.kind === 'set' && !(await isOwnDocumentOfKind(image.id, account.user.id, 'profile_image'))) {
      return failure('تعذر استخدام الصورة المرفوعة.', { profileImageId: 'ارفع الصورة مرة أخرى.' });
    }
    await updateOrganizationProfile(account.user.id, {
      ...fields,
      ...(image.kind === 'set' ? { profileImageId: image.id } : image.kind === 'remove' ? { profileImageId: null } : {}),
    });
    revalidatePath('/organization', 'layout');
    return success('تم حفظ ملف المنشأة.');
  } catch (error) {
    return toFailure(error, 'organization.profile');
  }
}
