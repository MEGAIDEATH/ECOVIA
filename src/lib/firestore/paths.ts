import { DATA_APP_ID } from '@/lib/config/env';

/**
 * Firestore path helpers preserving the legacy structure:
 *   artifacts/{appId}/public/data/{collection}/{id}
 */
export const DATA_ROOT = `artifacts/${DATA_APP_ID}/public/data`;

export const specialistCollectionPath = `${DATA_ROOT}/specialists`;
export const organizationCollectionPath = `${DATA_ROOT}/organizations`;
export const messageCollectionPath = `${DATA_ROOT}/messages`;
export const conversationCollectionPath = `${DATA_ROOT}/chats`;
export const applicationCollectionPath = `${DATA_ROOT}/applications`;

export function specialistDocPath(uid: string): string {
  return `${specialistCollectionPath}/${uid}`;
}

export function organizationDocPath(uid: string): string {
  return `${organizationCollectionPath}/${uid}`;
}
