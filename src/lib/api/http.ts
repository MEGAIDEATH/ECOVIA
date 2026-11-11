import 'server-only';

import { DatabaseConfigError } from '@/db';
import { ChatAccessError, ContractError } from '@/repositories/chat';
import { ApplicationError } from '@/repositories/applications';
import { ForbiddenError, UnauthorizedError } from '@/lib/auth/session';
import { OtpDeliveryUnavailableError } from '@/lib/auth/otp';
import { RateLimitError } from '@/lib/auth/rateLimit';

/** JSON error response helper (Arabic messages, explicit status). */
export function jsonError(message: string, status: number): Response {
  return Response.json({ error: message }, { status });
}

export function jsonOk<T>(payload: T, status = 200): Response {
  return Response.json(payload as Record<string, unknown>, { status });
}

/**
 * Maps domain errors to HTTP responses. Anything unrecognized is logged and
 * reported as a generic 500 so internals never leak to the browser.
 */
export function mapError(error: unknown, context: string): Response {
  if (error instanceof UnauthorizedError) return jsonError(error.message, 401);
  if (error instanceof ForbiddenError) return jsonError(error.message, 403);
  if (error instanceof ChatAccessError) return jsonError(error.message, 403);
  if (error instanceof ContractError) return jsonError(error.message, 400);
  if (error instanceof ApplicationError) return jsonError(error.message, 400);
  if (error instanceof RateLimitError) return jsonError(error.message, 429);
  if (error instanceof OtpDeliveryUnavailableError) {
    return jsonError(OTP_UNAVAILABLE_MESSAGE, 503);
  }
  if (error instanceof DatabaseConfigError) {
    console.error(`[${context}] DATABASE_URL is not configured.`);
    return jsonError('خدمة البيانات غير مهيأة حالياً.', 503);
  }
  console.error(`[${context}] request failed:`, error);
  return jsonError('تعذر تحميل البيانات، حاول مرة أخرى.', 500);
}

/** Reads a JSON body defensively (never throws on malformed input). */
export async function readJson(request: Request): Promise<Record<string, unknown> | null> {
  try {
    const body: unknown = await request.json();
    return body && typeof body === 'object' ? (body as Record<string, unknown>) : null;
  } catch {
    return null;
  }
}

export function asString(value: unknown, maxLength = 5000): string | null {
  if (typeof value !== 'string') return null;
  const trimmed = value.trim();
  if (!trimmed || trimmed.length > maxLength) return null;
  return trimmed;
}

/** Shown when a code would need a real SMS/email provider (none configured). */
export const OTP_UNAVAILABLE_MESSAGE =
  'خدمة إرسال رمز التحقق غير مفعّلة حالياً، والتحقق التجريبي متاح لحسابات العرض المعتمدة فقط.';

/**
 * Maps Better Auth OTP verification errors (an `APIError` with `body.code`)
 * to Arabic messages. Wrong codes keep the legacy 401 message; expired and
 * exhausted challenges tell the user to request a new code. Returns null for
 * anything that is not a Better Auth API error.
 */
export function otpVerificationError(error: unknown): Response | null {
  const apiError = error as { status?: unknown; body?: { code?: unknown } };
  if (apiError?.status === undefined) return null;
  switch (apiError.body?.code) {
    case 'OTP_EXPIRED':
    case 'OTP_NOT_FOUND':
      return jsonError('انتهت صلاحية رمز التحقق، اطلب رمزاً جديداً.', 401);
    case 'TOO_MANY_ATTEMPTS':
      return jsonError('تجاوزت عدد المحاولات المسموح بها، اطلب رمزاً جديداً.', 429);
    default:
      return jsonError('رمز التحقق غير صحيح!', 401);
  }
}
