'use server';

import { revalidatePath } from 'next/cache';

import { parseRole } from '@/lib/auth/access';
import { requireRole } from '@/lib/auth/policies';
import { parseOrganizationProfileInput } from '@/lib/validation/profile';
import { isOwnDocumentOfKind } from '@/repositories/documents';
import { transitionAccountReview, updateOrganizationProfile } from '@/repositories/profiles';

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

/**
 * A rejected account owner resubmits for review after correcting their
 * CV / facility profile: rejected → pending (audited as account.resubmitted).
 * The profile stays unapproved; the previous rejection remains in history.
 */
export async function resubmitForReviewAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  try {
    const role = parseRole(formString(formData, 'role'));
    if (!role) return failure('نوع الحساب غير صالح.');
    const { account, profile } = await requireRole(role);
    if (profile.status !== 'rejected') return failure('يمكن إعادة الإرسال للحسابات المرفوضة فقط.');
    const result = await transitionAccountReview(
      role === 'spec' ? 'specialists' : 'organizations',
      profile.id,
      'resubmit',
      account.user.id,
      formString(formData, 'note').trim().slice(0, 500) || undefined,
    );
    if (result !== 'ok') return failure('تعذر إعادة الإرسال، حدّث الصفحة.');
    revalidatePath(role === 'spec' ? '/specialist' : '/organization', 'layout');
    return success('أُعيد إرسال الحساب للمراجعة.');
  } catch (error) {
    return toFailure(error, 'account.resubmit');
  }
}
