import 'server-only';

import { DatabaseConfigError } from '@/db';
import { ChatAccessError, ContractError } from '@/repositories/chat';
import { ApplicationError } from '@/repositories/applications';
import { ForbiddenError, UnauthorizedError } from '@/lib/auth/session';

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
