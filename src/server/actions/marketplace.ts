'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';

import { requireApprovedUser, type SpecialistContext } from '@/lib/auth/policies';
import { DomainError } from '@/lib/marketplace/errors';
import { isOpenForOffers, specialistCanView, SPECIALIST_PROGRESS } from '@/lib/marketplace/rules';
import type { NoticeKey } from '@/lib/notices';
import { isUuid } from '@/lib/utils/ids';
import {
  parseContractInput,
  parseOfferInput,
  parseServiceRequestInput,
  parseSignature,
} from '@/lib/validation/marketplace';
import {
  cancelRequest,
  declineOffer,
  getOwnOffer,
  prepareContract,
  signContract,
  submitOffer,
  withdrawContract,
  withdrawOffer,
} from '@/repositories/marketplace';
import {
  createServiceRequest,
  declineServiceRequest,
  getPrivateRequestTarget,
  getRequestWithFacts,
  transitionServiceRequest,
  undoDeclineServiceRequest,
} from '@/repositories/serviceRequests';
import type { ServiceRequestStatus } from '@/types';

import { failure, formString, success, toFailure, type ActionState } from './result';

/**
 * Marketplace Server Actions. Each one re-derives the actor from the session
 * (`requireApprovedUser`), validates its input on the server and delegates to
 * the transactional repository functions. Client-supplied ids only select
 * WHICH record to act on; ownership and state are re-checked in the database.
 */

const orgRequestPath = (id: string) => `/organization/requests/${id}`;
const specRequestPath = (id: string) => `/specialist/requests/${id}`;
const withNotice = (path: string, notice: NoticeKey) => `${path}?notice=${notice}`;

/** Re-render the facility's request page with a confirmation (or just confirm when the id is unusable). */
function afterOrgAction(requestId: string, notice: NoticeKey, fallback: string): ActionState {
  if (!isUuid(requestId)) return success(fallback);
  revalidatePath(orgRequestPath(requestId));
  redirect(withNotice(orgRequestPath(requestId), notice));
}

/* ---------------------------------------------------------------- facility */

export async function createServiceRequestAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  let createdId: string;
  try {
    const { account, profile } = await requireApprovedUser('org');
    const parsed = parseServiceRequestInput({
      serviceTypes: formData.getAll('serviceTypes'),
      activityDescription: formString(formData, 'activityDescription'),
      notes: formString(formData, 'notes'),
      region: formString(formData, 'region'),
      city: formString(formData, 'city'),
      targetSpecialistId: formString(formData, 'targetSpecialistId'),
    });
    if (!parsed.ok) return failure(parsed.error, parsed.fieldErrors);

    let target = null;
    if (parsed.data.targetSpecialistId) {
      target = await getPrivateRequestTarget(parsed.data.targetSpecialistId, account.user.id);
      if (!target) return failure('الأخصائي المحدد غير متاح لاستقبال طلب خاص.', { targetSpecialistId: 'اختر أخصائياً معتمداً.' });
    }
    const { request } = await createServiceRequest(
      {
        organizationId: profile.id,
        organizationUserId: account.user.id,
        organizationName: profile.orgName,
        target,
      },
      parsed.data,
    );
    createdId = request.id;
  } catch (error) {
    return toFailure(error, 'request.create');
  }
  revalidatePath('/organization/requests');
  redirect(`${orgRequestPath(createdId)}?created=1`);
}

export async function cancelServiceRequestAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const requestId = formString(formData, 'requestId');
  try {
    const { account, profile } = await requireApprovedUser('org');
    await cancelRequest(requestId, { id: profile.id, userId: account.user.id, name: profile.orgName });
  } catch (error) {
    return toFailure(error, 'request.cancel');
  }
  revalidatePath(orgRequestPath(requestId));
  redirect(withNotice(orgRequestPath(requestId), 'request_cancelled'));
}

export async function declineOfferAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const offerId = formString(formData, 'offerId');
  const requestId = formString(formData, 'requestId');
  try {
    const { account, profile } = await requireApprovedUser('org');
    await declineOffer(offerId, { id: profile.id, userId: account.user.id, name: profile.orgName });
  } catch (error) {
    return toFailure(error, 'offer.decline');
  }
  return afterOrgAction(requestId, 'offer_declined', 'تم الاعتذار عن العرض.');
}

export async function prepareContractAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const offerId = formString(formData, 'offerId');
  const requestId = formString(formData, 'requestId');
  try {
    const { account, profile } = await requireApprovedUser('org');
    const parsed = parseContractInput({
      title: formString(formData, 'title'),
      value: formString(formData, 'value'),
      organizationSignature: formString(formData, 'organizationSignature'),
    });
    if (!parsed.ok) return failure(parsed.error, parsed.fieldErrors);
    await prepareContract(offerId, { id: profile.id, userId: account.user.id, name: profile.orgName }, parsed.data);
  } catch (error) {
    return toFailure(error, 'contract.prepare');
  }
  return afterOrgAction(requestId, 'contract_prepared', 'تم إعداد العقد وإرساله للأخصائي للتوقيع.');
}

export async function withdrawContractAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const contractId = formString(formData, 'contractId');
  const requestId = formString(formData, 'requestId');
  try {
    const { account, profile } = await requireApprovedUser('org');
    await withdrawContract(contractId, { id: profile.id, userId: account.user.id, name: profile.orgName });
  } catch (error) {
    return toFailure(error, 'contract.withdraw');
  }
  if (isUuid(contractId)) revalidatePath(`/contracts/${contractId}`);
  return afterOrgAction(requestId, 'contract_withdrawn', 'تم سحب العقد.');
}

/* -------------------------------------------------------------- specialist */

function actingSpecialist(context: SpecialistContext) {
  return {
    id: context.profile.id,
    userId: context.account.user.id,
    fullName: context.profile.fullName,
    approved: true,
  };
}

export async function submitOfferAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const requestId = formString(formData, 'requestId');
  try {
    const context = await requireApprovedUser('spec');
    const parsed = parseOfferInput({
      durationValue: formString(formData, 'durationValue'),
      durationUnit: formString(formData, 'durationUnit'),
      message: formString(formData, 'message'),
    });
    if (!parsed.ok) return failure(parsed.error, parsed.fieldErrors);
    const { created } = await submitOffer(requestId, actingSpecialist(context), parsed.data);
    revalidatePath(specRequestPath(requestId));
    return success(created ? 'تم إرسال عرضك إلى المنشأة.' : 'تم تحديث عرضك.');
  } catch (error) {
    return toFailure(error, 'offer.submit');
  }
}

export async function withdrawOfferAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const requestId = formString(formData, 'requestId');
  try {
    const context = await requireApprovedUser('spec');
    await withdrawOffer(requestId, actingSpecialist(context));
  } catch (error) {
    return toFailure(error, 'offer.withdraw');
  }
  revalidatePath(specRequestPath(requestId));
  redirect(withNotice(specRequestPath(requestId), 'offer_withdrawn'));
}

export async function signContractAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const contractId = formString(formData, 'contractId');
  let serviceRequestId: string | null;
  try {
    const context = await requireApprovedUser('spec');
    const signature = parseSignature(formString(formData, 'signature'));
    if (!signature) return failure('اكتب اسمك الكامل للتوقيع.', { signature: 'اكتب اسمك الكامل (حرفان على الأقل).' });
    ({ serviceRequestId } = await signContract(contractId, actingSpecialist(context), signature));
  } catch (error) {
    return toFailure(error, 'contract.sign');
  }
  const target = serviceRequestId ? specRequestPath(serviceRequestId) : `/contracts/${contractId}`;
  revalidatePath(target);
  redirect(withNotice(target, 'contract_signed'));
}

/** "Not for me": hides an open request from this specialist only. */
export async function declineRequestAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const requestId = formString(formData, 'requestId');
  const reason = formString(formData, 'reason').trim();
  try {
    const context = await requireApprovedUser('spec');
    if (!reason || reason.length > 1000) return failure('اكتب سبب الاعتذار (حتى 1000 حرف).', { reason: 'السبب مطلوب.' });
    const found = await getRequestWithFacts(requestId);
    const specialist = actingSpecialist(context);
    const offer = found ? await getOwnOffer(found.request.id, specialist.id) : null;
    if (!found || !specialistCanView(found.facts, specialist, Boolean(offer))) throw new DomainError('الطلب غير موجود.', 404);
    if (!isOpenForOffers(found.facts)) throw new DomainError('الطلب مغلق.');
    if (offer && (offer.status === 'submitted' || offer.status === 'selected')) {
      throw new DomainError('اسحب عرضك أولاً قبل الاعتذار عن الطلب.');
    }
    await declineServiceRequest(found.request.id, specialist.id, reason);
  } catch (error) {
    return toFailure(error, 'request.decline');
  }
  revalidatePath(specRequestPath(requestId));
  redirect(withNotice(specRequestPath(requestId), 'request_declined'));
}

export async function undoDeclineAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const requestId = formString(formData, 'requestId');
  try {
    const context = await requireApprovedUser('spec');
    if (!isUuid(requestId)) throw new DomainError('الطلب غير موجود.', 404);
    await undoDeclineServiceRequest(requestId, context.profile.id);
  } catch (error) {
    return toFailure(error, 'request.undo-decline');
  }
  revalidatePath(specRequestPath(requestId));
  redirect(withNotice(specRequestPath(requestId), 'decline_undone'));
}

/** The contracted specialist reports progress: accepted → in_progress → completed. */
export async function advanceRequestStatusAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const requestId = formString(formData, 'requestId');
  const next = formString(formData, 'status') as ServiceRequestStatus;
  try {
    const context = await requireApprovedUser('spec');
    const found = await getRequestWithFacts(requestId);
    if (!found || found.facts.specialistId !== context.profile.id) throw new DomainError('الطلب غير موجود.', 404);
    if (SPECIALIST_PROGRESS[found.facts.status] !== next) throw new DomainError('انتقال غير مسموح.');
    const updated = await transitionServiceRequest(found.request.id, context.profile.id, found.facts.status, next);
    if (!updated) throw new DomainError('تغيرت حالة الطلب، حدّث الصفحة.');
  } catch (error) {
    return toFailure(error, 'request.advance');
  }
  revalidatePath(specRequestPath(requestId));
  redirect(withNotice(specRequestPath(requestId), next === 'completed' ? 'status_completed' : 'status_in_progress'));
}
