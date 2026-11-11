import { expect, test } from '@playwright/test';
import { Pool } from 'pg';

import { loadLocalEnv } from '../src/db/env';

// The Playwright runner does not load `.env.local` the way Next.js does.
loadLocalEnv();

/**
 * Reads an account straight out of PostgreSQL so the assertions cover the real
 * backend (Better Auth session -> `user` row -> profile row), not just the DOM.
 */
async function findProfile(
  table: 'specialists' | 'organizations',
  column: 'full_name' | 'org_name',
  joinColumn: 'u.email' | 'p.cr_number' | 'p.phone',
  key: string,
) {
  const pool = new Pool({ connectionString: process.env.DATABASE_URL });
  try {
    const result = await pool.query(
      `select p.status, p.${column}
         from ${table} p
         join "user" u on u.id = p.user_id
        where ${joinColumn} = $1
        order by p.created_at desc
        limit 1`,
      [key],
    );
    return (result.rows[0] as { status: string } & Record<string, string>) ?? null;
  } finally {
    await pool.end();
  }
}

const findSpecialistByPhone = (phone: string) =>
  findProfile('specialists', 'full_name', 'p.phone', phone);

const findOrganizationByCr = (crNumber: string) =>
  findProfile('organizations', 'org_name', 'p.cr_number', crNumber);

async function getPhoneOtp(phone: string): Promise<string> {
  const pool = new Pool({ connectionString: process.env.DATABASE_URL });
  try {
    for (let attempt = 0; attempt < 40; attempt += 1) {
      const result = await pool.query(
        `select value from verification where identifier = $1 order by created_at desc limit 1`,
        [phone],
      );
      const value = result.rows[0]?.value as string | undefined;
      if (value) return value.split(':')[0];
      await new Promise((resolve) => setTimeout(resolve, 250));
    }
    throw new Error(`Timed out waiting for OTP for ${phone}`);
  } finally {
    await pool.end();
  }
}

test.describe('specialist registration flow', () => {
  test.describe.configure({ mode: 'serial' });
  test('step 1 validates required fields with Arabic messages', async ({ page }) => {
    await page.goto('/register/specialist');
    await expect(page.getByTestId('splash-screen')).toBeHidden({ timeout: 8_000 });

    await page.getByRole('button', { name: /إرسال طلب التسجيل/ }).click();

    await expect(page.getByText('الاسم الثلاثي مطلوب')).toBeVisible();
    await expect(page.getByText('رقم الهوية مطلوب')).toBeVisible();
    await expect(page.getByText('رقم الجوال مطلوب')).toBeVisible();
  });

  test('valid step 1 proceeds to step 2, then to the OTP screen with the demo hint', async ({
    page,
  }) => {
    await page.goto('/register/specialist');
    await expect(page.getByTestId('splash-screen')).toBeHidden({ timeout: 8_000 });

    await page.getByLabel('الاسم الثلاثي').fill('خالد سعيد عبدالله');
    await page.getByLabel('رقم الهوية').fill('1098765432');
    await page.getByLabel('رقم الجوال').fill('0512345678');
    await page.getByRole('button', { name: /إرسال طلب التسجيل/ }).click();

    await expect(page.getByRole('heading', { name: 'تسجيل أخصائي' })).toBeVisible();
    await page.getByLabel('رقم المعاملة / الترخيص').fill('ELESL-2024-99999');
    await page.getByRole('button', { name: /إرسال طلب التسجيل/ }).click();

    await expect(page).toHaveURL(/\/register\/specialist\/verify/);
    await expect(page.getByRole('heading', { name: 'أدخل رمز التحقق' })).toBeVisible();
    await expect(page.getByText('رمز تجريبي للاختبار فقط: 123456')).toBeVisible();
  });

  test('wrong demo OTP shows the Arabic error without registering', async ({ page }) => {
    // Walk the real flow so the OTP exists server-side for this email —
    // a bare /verify visit has no draft (and no code) to check against.
    await page.goto('/register/specialist');
    await expect(page.getByTestId('splash-screen')).toBeHidden({ timeout: 8_000 });

    await page.getByLabel('الاسم الثلاثي').fill('خالد سعيد عبدالله');
    await page.getByLabel('رقم الهوية').fill('1098765432');
    await page.getByLabel('رقم الجوال').fill('0512345678');
    await page.getByRole('button', { name: /إرسال طلب التسجيل/ }).click();

    await page.getByLabel('رقم المعاملة / الترخيص').fill('ELESL-2024-99999');
    await page.getByRole('button', { name: /إرسال طلب التسجيل/ }).click();
    await expect(page).toHaveURL(/\/register\/specialist\/verify/);

    const realOtp = await getPhoneOtp('0512345678');
    const wrongOtp = realOtp.slice(0, 5) + (realOtp.endsWith('9') ? '0' : '9');
    const boxes = page.getByLabel(/^خانة الرمز /);
    for (const [index, digit] of Array.from(wrongOtp).entries()) {
      await boxes.nth(index).fill(digit);
    }

    await page.getByRole('button', { name: 'تأكيد الدخول' }).click();

    await expect(page.getByText('رمز التحقق غير صحيح!')).toBeVisible();
    await expect(page).toHaveURL(/\/register\/specialist\/verify/);
  });

  test('completes signup with the demo OTP and persists a pending specialist', async ({
    page,
  }) => {
    // Fresh identifiers per run: `user.phone_number` is unique, so a fixed phone
    // would sign back into the account (and status) left by an earlier run.
    const suffix = `${Date.now()}`.slice(-8);
    const phone = `05${suffix}`;
    const nationalId = `1${suffix}9`;
    await page.goto('/register/specialist');
    await expect(page.getByTestId('splash-screen')).toBeHidden({ timeout: 8_000 });

    await page.getByLabel('الاسم الثلاثي').fill('خالد سعيد عبدالله');
    await page.getByLabel('رقم الهوية').fill(nationalId);
    await page.getByLabel('رقم الجوال').fill(phone);
    await page.getByRole('button', { name: /إرسال طلب التسجيل/ }).click();
    await page.getByLabel('رقم المعاملة / الترخيص').fill('ELESL-2024-99999');
    await page.getByRole('button', { name: /إرسال طلب التسجيل/ }).click();
    await expect(page).toHaveURL(/\/register\/specialist\/verify/);

    const boxes = page.getByLabel(/^خانة الرمز /);
    for (const [index, digit] of Array.from('123456').entries()) {
      await boxes.nth(index).fill(digit);
    }
    await page.getByRole('button', { name: 'تأكيد الدخول' }).click();

    // Pending accounts are routed to the waiting room, not the dashboard.
    await expect(page).toHaveURL(/\/set-password/);

    // The account must exist in PostgreSQL as `pending` — approval stays an
    // admin-only operation.
    await expect
      .poll(async () => (await findSpecialistByPhone(phone))?.status, { timeout: 15_000 })
      .toBe('pending');

    const row = await findSpecialistByPhone(phone);
    expect(row?.full_name).toBe('خالد سعيد عبدالله');
  });
});

/**
 * The organization register route carried the same document-reference defect as
 * the specialist one, so the completed organization flow is covered too.
 */
test.describe('organization registration flow', () => {
  test('completes signup with the demo OTP and persists a pending organization', async ({
    page,
  }) => {
    const crNumber = `2${Date.now()}`.slice(0, 10);

    await page.goto('/register/organization');
    await expect(page.getByTestId('splash-screen')).toBeHidden({ timeout: 8_000 });

    await page.getByLabel('رقم السجل التجاري').fill(crNumber);
    await page.getByRole('button', { name: 'جلب' }).click();
    // The legacy demo CR lookup fills the organization name.
    await expect(page.getByLabel('اسم المنشأة')).toHaveValue(
      'شركة التقنية البيئية المحدودة',
    );
    await page.getByLabel('رقم التواصل').fill('0512345678');
    await page.getByLabel('نبذة عن الجهة').fill('شركة متخصصة في الاستشارات البيئية.');
    await page.getByRole('button', { name: /المتابعة للتحقق/ }).click();
    await expect(page).toHaveURL(/\/register\/organization\/verify/);
    await expect(page.getByText('رمز تجريبي للاختبار فقط: 123456')).toBeVisible();

    const boxes = page.getByLabel(/^خانة الرمز /);
    for (const [index, digit] of Array.from('123456').entries()) {
      await boxes.nth(index).fill(digit);
    }
    await page.getByRole('button', { name: 'تأكيد الدخول' }).click();

    await expect(page).toHaveURL(/\/set-password/);

    await expect
      .poll(async () => (await findOrganizationByCr(crNumber))?.status, { timeout: 15_000 })
      .toBe('pending');

    const row = await findOrganizationByCr(crNumber);
    expect(row?.org_name).toBe('شركة التقنية البيئية المحدودة');
  });
});
