import { readFileSync } from 'node:fs';
import path from 'node:path';

import { expect, test } from '@playwright/test';

interface AuthCacheRecord {
  fbase_key?: string;
  key?: string;
  value?: {
    uid?: string;
    stsTokenManager?: { accessToken?: string };
  };
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

test.describe('specialist registration flow', () => {
  test('step 1 validates required fields with Arabic messages', async ({ page }) => {
    await page.goto('/register/specialist/step-1');
    await expect(page.getByTestId('splash-screen')).toBeHidden({ timeout: 8_000 });

    await page.getByRole('button', { name: /المتابعة/ }).click();
    await expect(page.getByText('الاسم الثلاثي مطلوب')).toBeVisible();
    await expect(page.getByText('رقم الهوية مطلوب')).toBeVisible();
    await expect(page.getByText('البريد الإلكتروني مطلوب')).toBeVisible();
    await expect(page.getByText('رقم الجوال مطلوب')).toBeVisible();
    await expect(page).toHaveURL(/step-1/);
  });

  test('valid step 1 proceeds to step 2, then to the OTP screen with the demo hint', async ({
    page,
  }) => {
    await page.goto('/register/specialist/step-1');
    await expect(page.getByTestId('splash-screen')).toBeHidden({ timeout: 8_000 });

    await page.getByLabel('الاسم الثلاثي').fill('خالد سعيد عبدالله');
    await page.getByLabel('رقم الهوية').fill('1098765432');
    await page.getByLabel('البريد الإلكتروني').fill('khaled@example.com');
    await page.getByLabel('رقم الجوال').fill('0512345678');
    await page.getByRole('button', { name: /المتابعة/ }).click();

    await expect(page).toHaveURL(/\/register\/specialist\/step-2/);
    await expect(page.getByText('ارفع الترخيص البيئي')).toBeVisible();
    await expect(page.getByLabel('رقم المعاملة / الترخيص')).toBeVisible();

    await page.getByLabel('رقم المعاملة / الترخيص').fill('ELESL-2023-1234');
    await page.getByRole('button', { name: /المتابعة للتحقق/ }).click();

    await expect(page).toHaveURL(/\/register\/specialist\/verify/);
    // Legacy demo hint toast.
    await expect(page.getByText('استخدم 123456 للتجربة')).toBeVisible();
    await expect(page.getByText('للتجربة: استخدم 123456')).toBeVisible();
  });

  test('wrong demo OTP shows the Arabic error without registering', async ({ page }) => {
    await page.goto('/register/specialist/verify');
    await expect(page.getByTestId('splash-screen')).toBeHidden({ timeout: 8_000 });

    const boxes = page.getByLabel(/^خانة الرمز /);
    const code = '999999';
    for (let i = 0; i < code.length; i += 1) {
      await boxes.nth(i).fill(code[i]);
    }
    await page.getByRole('button', { name: 'تأكيد الدخول' }).click();

    await expect(page.getByText('رمز التحقق غير صحيح!')).toBeVisible();
    await expect(page).toHaveURL(/\/register\/specialist\/verify/);
  });

  test('completes signup end-to-end without any Admin SDK configuration', async ({
    page,
    request,
  }) => {
    // The real Firebase write only needs to be proven once per run.
    test.skip(test.info().project.name !== 'desktop-chromium', 'real Firebase write runs once');
    test.setTimeout(90_000);

    // Regression test for the real failure: the OTP step used to POST to a
    // server route that required Firebase Admin credentials and failed with
    // 503. This exercises the real anonymous session + Firestore rules write,
    // so it must not mock the network. It creates one pending account document.
    const adminRequests: string[] = [];
    const adminConsoleErrors: string[] = [];
    const pageErrors: string[] = [];
    page.on('request', (req) => {
      if (req.url().includes('/api/admin')) adminRequests.push(req.url());
    });
    page.on('console', (message) => {
      if (
        message.type() === 'error' &&
        (message.text().includes('[admin]') ||
          message.text().includes('خدمة البيانات غير مهيأة'))
      ) {
        adminConsoleErrors.push(message.text());
      }
    });
    page.on('pageerror', (error) => pageErrors.push(error.message));

    await page.goto('/register/specialist/step-1');
    await expect(page.getByTestId('splash-screen')).toBeHidden({ timeout: 8_000 });

    await page.getByLabel('الاسم الثلاثي').fill('خالد سعيد عبدالله');
    await page.getByLabel('رقم الهوية').fill('1098765432');
    await page.getByLabel('البريد الإلكتروني').fill(`khaled${Date.now()}@example.com`);
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

    await expect(page).toHaveURL(/\/waiting\?role=spec/, { timeout: 30_000 });
    await expect(page.getByText('جاري التحقق من الاعتماد')).toBeVisible();

    // The public signup flow must be completely free of admin activity.
    expect(adminRequests).toEqual([]);
    expect(adminConsoleErrors).toEqual([]);
    expect(pageErrors).toEqual([]);

    // Prove the Firestore document exists and is pending by reading it back
    // with the anonymous account's own ID token (rules allow owner reads).
    const env = readLocalEnv();
    const projectId = env.NEXT_PUBLIC_FIREBASE_PROJECT_ID;
    const dataAppId = env.NEXT_PUBLIC_DATA_APP_ID || 'default-app-id';
    expect(projectId).toBeTruthy();

    const authState = await page.evaluate(async () => {
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

    expect(authState.uid).toBeTruthy();
    expect(authState.accessToken).toBeTruthy();

    const documentPath =
      `projects/${projectId}/databases/(default)/documents` +
      `/artifacts/${dataAppId}/public/data/specialists/${authState.uid}`;
    const documentResponse = await request.get(
      `https://firestore.googleapis.com/v1/${documentPath}`,
      { headers: { Authorization: `Bearer ${authState.accessToken}` } },
    );
    expect(documentResponse.status()).toBe(200);
    const document = (await documentResponse.json()) as {
      fields?: Record<string, { stringValue?: string }>;
    };
    expect(document.fields?.status?.stringValue).toBe('pending');
  });
});