import { readFileSync } from 'node:fs';
import path from 'node:path';

import { expect, test, type Page } from '@playwright/test';

/**
 * Regression coverage for duplicate-registration handling and the demo-only
 * session reset:
 *  - an already-registered (pending) account resumes the waiting room as a
 *    normal state — no exception, no React error overlay, no console error;
 *  - the demo control starts a fresh anonymous UID and registration proceeds
 *    again from scratch (the old document is never touched).
 */

interface AuthCacheRecord {
  fbase_key?: string;
  key?: string;
  value?: {
    uid?: string;
    stsTokenManager?: { accessToken?: string };
  };
}

interface AuthState {
  uid: string | null;
  accessToken: string | null;
}

function readLocalEnv(): Record<string, string> {
  const text = readFileSync(path.join(process.cwd(), '.env.local'), 'utf8');
  const env: Record<string, string> = {};
  for (const line of text.split('\n')) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const separator = trimmed.indexOf('=');
    if (separator > 0) env[trimmed.slice(0, separator)] = trimmed.slice(separator + 1);
  }
  return env;
}

/** Reads the anonymous auth session (IndexedDB/localStorage caches) from the page. */
async function readAuthState(page: Page): Promise<AuthState> {
  try {
    return await page.evaluate(async (): Promise<AuthState> => {
      const readIdb = async (): Promise<AuthCacheRecord[]> => {
        const db = await new Promise<IDBDatabase>((resolve, reject) => {
          const open = indexedDB.open('firebaseLocalStorageDb');
          open.onsuccess = () => resolve(open.result);
          open.onerror = () => reject(open.error);
        });
        const store = db
          .transaction('firebaseLocalStorage', 'readonly')
          .objectStore('firebaseLocalStorage');
        return new Promise<AuthCacheRecord[]>((resolve, reject) => {
          const all = store.getAll();
          all.onsuccess = () => resolve(all.result as AuthCacheRecord[]);
          all.onerror = () => reject(all.error);
        });
      };

      let records: AuthCacheRecord[] = [];
      try {
        records = await readIdb();
      } catch {
        records = [];
      }
      for (let index = 0; index < localStorage.length; index += 1) {
        const key = localStorage.key(index);
        if (!key?.startsWith('firebase:authUser')) continue;
        try {
          records.push({
            fbase_key: key,
            value: JSON.parse(localStorage.getItem(key) ?? '') as AuthCacheRecord['value'],
          });
        } catch {
          /* ignore malformed cache entries */
        }
      }

      const record = records.find((item) =>
        String(item.fbase_key ?? item.key ?? '').startsWith('firebase:authUser'),
      );
      return {
        uid: record?.value?.uid ?? null,
        accessToken: record?.value?.stsTokenManager?.accessToken ?? null,
      };
    });
  } catch {
    // The execution context can disappear mid-reload — callers poll instead.
    return { uid: null, accessToken: null };
  }
}

interface FlowEvidence {
  adminRequests: string[];
  consoleErrors: string[];
  pageErrors: string[];
}

function watch(page: Page): FlowEvidence {
  const evidence: FlowEvidence = { adminRequests: [], consoleErrors: [], pageErrors: [] };
  page.on('request', (request) => {
    if (request.url().includes('/api/admin')) evidence.adminRequests.push(request.url());
  });
  page.on('console', (message) => {
    if (message.type() === 'error') evidence.consoleErrors.push(message.text());
  });
  page.on('pageerror', (error) => evidence.pageErrors.push(error.message));
  return evidence;
}

const DUPLICATE_MESSAGE = 'هذا الحساب مسجل مسبقاً.';

async function completeSpecialistRegistration(page: Page): Promise<void> {
  await page.goto('/register/specialist/step-1');
  await expect(page.getByTestId('splash-screen')).toBeHidden({ timeout: 10_000 });

  await page.getByLabel('الاسم الثلاثي').fill('خالد سعيد عبدالله');
  await page.getByLabel('رقم الهوية').fill('1098765432');
  await page.getByLabel('البريد الإلكتروني').fill('khaled@example.com');
  await page.getByLabel('رقم الجوال').fill('0512345678');
  await page.getByRole('button', { name: /المتابعة/ }).click();

  await expect(page).toHaveURL(/\/register\/specialist\/step-2/);
  await page.getByLabel('رقم المعاملة / الترخيص').fill('ELESL-2023-1234');
  await page.getByRole('button', { name: /المتابعة للتحقق/ }).click();

  await expect(page).toHaveURL(/\/register\/specialist\/verify/);
  const boxes = page.getByLabel(/^خانة الرمز /);
  const code = '123456';
  for (let i = 0; i < code.length; i += 1) {
    await boxes.nth(i).fill(code[i]);
  }
  await page.getByRole('button', { name: 'تأكيد الدخول' }).click();
}

test.describe('duplicate registration + demo session reset', () => {
  test('existing pending account resumes the waiting room without an exception', async ({
    page,
  }) => {
    test
      .skip(test.info().project.name !== 'desktop-chromium', 'real Firebase flow once per run');
    const evidence = watch(page);

    // First attempt on this fresh browser session: creates the account.
    await completeSpecialistRegistration(page);
    await expect(page).toHaveURL(/\/waiting\?role=spec/, { timeout: 30_000 });
    await expect(page.getByText('جاري التحقق من الاعتماد')).toBeVisible();

    // Second attempt with the SAME anonymous UID: must be handled as a normal
    // state — resume the waiting room, never throw.
    await completeSpecialistRegistration(page);
    await expect(page).toHaveURL(/\/waiting\?role=spec/, { timeout: 30_000 });
    await expect(
      page.getByText('هذا الحساب مسجل مسبقاً، سيتم فتح حالة التحقق الحالية.'),
    ).toBeVisible();

    expect(evidence.adminRequests).toEqual([]);
    // No uncaught exception / React error overlay.
    expect(evidence.pageErrors).toEqual([]);
    // The old bug logged the duplicate state as a console error.
    expect(evidence.consoleErrors.filter((text) => text.includes(DUPLICATE_MESSAGE))).toEqual([]);
    expect(evidence.consoleErrors.filter((text) => text.includes('OTP submit failed'))).toEqual([]);
  });

  test('demo session reset starts a fresh anonymous UID and registration proceeds again', async ({
    page,
    request,
  }) => {
    test
      .skip(test.info().project.name !== 'desktop-chromium', 'real Firebase flow once per run');
    const evidence = watch(page);

    await page.goto('/');
    await expect(page.getByTestId('splash-screen')).toBeHidden({ timeout: 10_000 });
    const before = await readAuthState(page);
    expect(before.uid).toBeTruthy();

    // Demo-only control (visible because NEXT_PUBLIC_DEMO_SESSION_RESET=true).
    await page.getByTestId('demo-session-reset').click();

    // Wait until the reload has produced a DIFFERENT anonymous UID.
    await expect
      .poll(
        async () => {
          const state = await readAuthState(page);
          return Boolean(state.uid && state.uid !== before.uid);
        },
        { timeout: 30_000 },
      )
      .toBe(true);
    await expect(page.getByTestId('splash-screen')).toBeHidden({ timeout: 10_000 });

    const after = await readAuthState(page);
    expect(after.uid).toBeTruthy();
    expect(after.uid).not.toBe(before.uid);

    // The fresh session must be able to register from scratch.
    await completeSpecialistRegistration(page);
    await expect(page).toHaveURL(/\/waiting\?role=spec/, { timeout: 30_000 });
    await expect(page.getByText('جاري التحقق من الاعتماد')).toBeVisible();

    expect(evidence.adminRequests).toEqual([]);
    expect(evidence.pageErrors).toEqual([]);
    expect(evidence.consoleErrors.filter((text) => text.includes(DUPLICATE_MESSAGE))).toEqual([]);

    // The new UID has its own pending specialist document — the old account
    // stays untouched under the previous UID.
    const env = readLocalEnv();
    const projectId = env.NEXT_PUBLIC_FIREBASE_PROJECT_ID;
    const dataAppId = env.NEXT_PUBLIC_DATA_APP_ID || 'default-app-id';
    expect(projectId).toBeTruthy();
    expect(after.accessToken).toBeTruthy();

    const documentPath =
      `projects/${projectId}/databases/(default)/documents` +
      `/artifacts/${dataAppId}/public/data/specialists/${after.uid}`;
    const documentResponse = await request.get(
      `https://firestore.googleapis.com/v1/${documentPath}`,
      { headers: { Authorization: `Bearer ${after.accessToken}` } },
    );
    expect(documentResponse.status()).toBe(200);
    const document = (await documentResponse.json()) as {
      fields?: Record<string, { stringValue?: string }>;
    };
    expect(document.fields?.status?.stringValue).toBe('pending');
  });
});

