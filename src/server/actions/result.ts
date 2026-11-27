import 'server-only';

import { ForbiddenError, NotFoundError, UnauthorizedError } from '@/lib/auth/session';
import { RateLimitError } from '@/lib/auth/rateLimit';
import { DomainError } from '@/lib/marketplace/errors';
import type { ActionState } from '@/lib/actionState';
import type { FieldErrors } from '@/lib/validation/marketplace';

/**
 * Helpers for form Server Actions. Results are serializable and carry only
 * user-facing Arabic messages — never raw errors or database rows.
 */
export type { ActionState } from '@/lib/actionState';

export function success(message: string): ActionState {
  return { status: 'success', message };
}

export function failure(message: string, fieldErrors?: FieldErrors): ActionState {
  return { status: 'error', message, fieldErrors };
}

/** Maps expected failures to messages; unexpected ones are logged and reported generically. */
export function toFailure(error: unknown, context: string): ActionState {
  if (error instanceof UnauthorizedError) return failure('انتهت الجلسة، سجّل الدخول مرة أخرى.');
  if (error instanceof ForbiddenError || error instanceof NotFoundError || error instanceof DomainError) {
    return failure(error.message);
  }
  if (error instanceof RateLimitError) return failure(error.message);
  console.error(`[action:${context}] failed:`, error);
  return failure('تعذر إتمام العملية، حاول مرة أخرى.');
}

export function formString(formData: FormData, key: string): string {
  const value = formData.get(key);
  return typeof value === 'string' ? value : '';
}
