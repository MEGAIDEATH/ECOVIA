import type { UserRole } from '@/types';

/**
 * Chat ids keep the legacy format: `chat_{organizationUid}_{specialistUid}`.
 */
export function buildChatId(orgId: string, specId: string): string {
  return `chat_${orgId}_${specId}`;
}

export interface ParsedChatId {
  orgId: string;
  specId: string;
}

export function parseChatId(chatId: string): ParsedChatId | null {
  const parts = chatId.split('_');
  if (parts.length !== 3 || parts[0] !== 'chat' || !parts[1] || !parts[2]) return null;
  return { orgId: parts[1], specId: parts[2] };
}

/**
 * The counterpart of the current user inside a chat.
 * NOTE: the legacy loader had an off-by-one here (`isSpec ? parts[2] : parts[1]`
 * resolved to the current user's own id), so names never resolved and every
 * conversation showed "مستخدم". The corrected behavior shows the real name.
 */
export function getOtherParticipantId(chatId: string, role: UserRole): string | null {
  const parsed = parseChatId(chatId);
  if (!parsed) return null;
  return role === 'spec' ? parsed.orgId : parsed.specId;
}

/**
 * Participants in legacy chatId order: [organizationUid, specialistUid].
 * Stored on messages/conversations so Firestore can run constrained queries.
 */
export function buildParticipants(chatId: string): [string, string] | null {
  const parsed = parseChatId(chatId);
  if (!parsed) return null;
  return [parsed.orgId, parsed.specId];
}
