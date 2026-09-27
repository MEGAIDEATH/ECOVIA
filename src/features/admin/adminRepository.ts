import type { AccountStatus } from '@/types';

export interface AdminSpecialistRow {
  id: string;
  name: string;
  status: AccountStatus;
}

export interface AdminOrganizationRow {
  id: string;
  name: string;
  status: AccountStatus;
}

export interface AdminAccounts {
  specialists: AdminSpecialistRow[];
  organizations: AdminOrganizationRow[];
}

export type AdminAccountCollection = 'specialists' | 'organizations';

async function request<T>(url: string, init?: RequestInit): Promise<T> {
  const method = init?.method ?? 'GET';
  console.info(`[ADMIN] request ${method} ${url}`);
  const response = await fetch(url, {
    headers: { 'Content-Type': 'application/json' },
    ...init,
  });

  let body: unknown = null;
  try {
    body = await response.json();
  } catch {
    /* non-JSON error body */
  }

  if (!response.ok) {
    const message =
      body && typeof body === 'object' && 'error' in body && typeof body.error === 'string'
        ? body.error
        : 'حدث خطأ في الاتصال';
    throw new Error(message);
  }

  return body as T;
}

/**
 * Signs the administrator in through Better Auth (email + password).
 * Authorization (`role === 'admin'`) is checked server-side; this client only
 * forwards the credentials.
 */
export async function adminLogin(email: string, password: string): Promise<void> {
  await request<{ ok: boolean }>('/api/admin/login', {
    method: 'POST',
    body: JSON.stringify({ email, password }),
  });
}

export async function adminLogout(): Promise<void> {
  await request<{ ok: boolean }>('/api/admin/logout', { method: 'POST' });
}

export async function isAdminAuthenticated(): Promise<boolean> {
  try {
    const result = await request<{ authenticated: boolean }>('/api/admin/session');
    return result.authenticated;
  } catch {
    return false;
  }
}

export async function getAdminAccounts(): Promise<AdminAccounts> {
  return request<AdminAccounts>('/api/admin/accounts');
}

export async function approveAccount(
  target: AdminAccountCollection,
  id: string,
): Promise<void> {
  await request<{ ok: boolean }>('/api/admin/accounts/approve', {
    method: 'POST',
    body: JSON.stringify({ collection: target, id }),
  });
}
