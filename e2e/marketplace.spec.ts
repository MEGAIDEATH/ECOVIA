import { expect, test, type Browser, type Page } from '@playwright/test';
import { Pool } from 'pg';

import { loadLocalEnv } from '../src/db/env';

loadLocalEnv();

const ADMIN_EMAIL = process.env.ADMIN_EMAIL ?? 'admin@ecovia.local';
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD ?? 'admin_secure_password_123';

async function query<T>(sql: string, params: unknown[]): Promise<T[]> {
  const pool = new Pool({ connectionString: process.env.DATABASE_URL });
  try {
    return (await pool.query(sql, params)).rows as T[];
  } finally {
    await pool.end();
  }
}

/** Registers through the real UI (dev OTP 123456) and stops at the waiting room. */
async function verifyAndSetPassword(page: Page, password: string) {
  await expect(page.getByRole('heading', { name: 'أدخل رمز التحقق' })).toBeVisible();
  const boxes = page.getByLabel(/^خانة الرمز /);
  for (const [index, digit] of Array.from('123456').entries()) await boxes.nth(index).fill(digit);
  await page.getByRole('button', { name: 'تأكيد الدخول' }).click();
  await expect(page).toHaveURL(/\/set-password/, { timeout: 30_000 });
  await page.getByLabel('كلمة المرور الجديدة').fill(password);
  await page.getByLabel('تأكيد كلمة المرور').fill(password);
  await page.getByRole('button', { name: 'حفظ كلمة المرور' }).click();
  await expect(page).toHaveURL(/\/waiting/, { timeout: 30_000 });
}

async function newPage(browser: Browser) {
  const page = await (await browser.newContext({ locale: 'ar-SA' })).newPage();
  return page;
}

/** Approves exactly the accounts this test created (never other rows). */
async function approve(browser: Browser, collection: 'specialists' | 'organizations', id: string) {
  const admin = await browser.newContext();
  const login = await admin.request.post('/api/admin/login', { data: { email: ADMIN_EMAIL, password: ADMIN_PASSWORD } });
  expect(login.ok()).toBeTruthy();
  const res = await admin.request.post('/api/admin/accounts/approve', { data: { collection, id } });
  expect(res.ok()).toBeTruthy();
  await admin.close();
}

async function publish(page: Page, name: string, cost: string, duration: string, unit: string, region: string) {
  await page.goto('/organization/requests/new');
  await page.getByLabel('اسم الخدمة').fill(name);
  await page.getByLabel('تكلفة الخدمة (ريال)').fill(cost);
  await page.locator('#req-duration').fill(duration);
  await page.locator('#req-duration-unit').selectOption(unit);
  await page.getByLabel('المنطقة').selectOption(region);
  await page.getByRole('button', { name: 'نشر الطلب' }).click();
  await expect(page).toHaveURL(/\/organization\/requests\/[0-9a-f-]{36}$/, { timeout: 20_000 });
  return page.url().split('/').pop() as string;
}

test.describe('general service request marketplace', () => {
  test('publish → discover → decline / accept → complete, cancel, dashboards', async ({ browser }) => {
    test.skip(test.info().project.name !== 'desktop-chromium', 'full multi-account flow runs once');
    test.setTimeout(240_000);

    const suffix = `${Date.now()}`.slice(-8);
    const password = `E2e!${suffix}pass`;

    // ---- Organization + specialist accounts
    const org = await newPage(browser);
    const crNumber = `9${suffix}1`;
    await org.goto('/register/organization');
    await expect(org.getByTestId('splash-screen')).toBeHidden({ timeout: 10_000 });
    await org.getByLabel('رقم السجل التجاري').fill(crNumber);
    await org.getByRole('button', { name: /جلب/ }).click();
    await expect(org.getByLabel('اسم المنشأة')).not.toHaveValue('', { timeout: 10_000 });
    await org.getByLabel('رقم التواصل').fill(`05${suffix}`);
    await org.getByLabel('نبذة عن الجهة').fill('منشأة اختبار سوق الخدمات');
    await org.getByRole('button', { name: /المتابعة للتحقق/ }).click();
    await verifyAndSetPassword(org, password);

    const spec = await newPage(browser);
    const specName = `أخصائي السوق ${suffix}`;
    const specPhone = `05${String(Number(suffix) + 7).padStart(8, '0').slice(-8)}`;
    await spec.goto('/register/specialist');
    await expect(spec.getByTestId('splash-screen')).toBeHidden({ timeout: 10_000 });
    await spec.getByLabel('الاسم الثلاثي').fill(specName);
    await spec.getByLabel('رقم الهوية').fill(`2${suffix}3`);
    await spec.getByLabel('رقم الجوال').fill(specPhone);
    await spec.getByLabel('رقم المعاملة / الترخيص').fill(`ELESL-2025-${suffix.slice(-5)}`);
    await spec.getByRole('button', { name: /إرسال طلب التسجيل/ }).click();
    await verifyAndSetPassword(spec, password);

    const [orgRow] = await query<{ id: string }>('select id from organizations where cr_number = $1', [crNumber]);
    const [specRow] = await query<{ id: string }>('select id from specialists where phone = $1', [specPhone]);
    await approve(browser, 'organizations', orgRow.id);
    await approve(browser, 'specialists', specRow.id);

    // ---- Organization publishes three general requests
    await org.goto('/organization');
    await expect(org.getByRole('heading', { name: /الطلبات الجارية/ })).toBeVisible({ timeout: 20_000 });
    await expect(org.getByText('لم تتعامل مع أي أخصائي بعد')).toBeVisible();

    const declined = `تقييم أثر بيئي ${suffix}`;
    const taken = `خطة إدارة بيئية ${suffix}`;
    const withdrawn = `رصد جودة الهواء ${suffix}`;
    const idDeclined = await publish(org, declined, '42000', '3', 'month', 'المنطقة الشرقية');
    await expect(org.getByText('3 أشهر')).toBeVisible();
    const idTaken = await publish(org, taken, '15000.50', '2', 'week', 'منطقة الرياض');
    const idWithdrawn = await publish(org, withdrawn, '8000', '10', 'day', 'منطقة جازان');

    const [stored] = await query<{ cost: string; duration_value: number; duration_unit: string; duration: string; region: string }>(
      'select cost, duration_value, duration_unit, duration, region from service_requests where id = $1',
      [idTaken],
    );
    expect(stored).toEqual({ cost: '15000.50', duration_value: 2, duration_unit: 'week', duration: 'أسبوعين', region: 'منطقة الرياض' });

    // Server-side validation, independent of the form.
    const bad = await org.request.post('/api/service-requests', {
      data: { serviceName: 'x', cost: '-1', durationValue: 1, durationUnit: 'month', region: 'منطقة الرياض' },
    });
    expect(bad.status()).toBe(400);

    // ---- Specialist sees the four key facts on the card
    await spec.goto('/specialist/requests');
    const card = spec.getByRole('link').filter({ hasText: declined });
    await expect(card).toBeVisible({ timeout: 20_000 });
    await expect(card).toContainText('3 أشهر');
    await expect(card).toContainText('المنطقة الشرقية');
    await expect(card).toContainText('ريال');

    // Personal decline: leaves the specialist's pending list, stays open for the org.
    await card.click();
    await spec.getByRole('button', { name: 'اعتذار' }).click();
    await spec.getByLabel('سبب الاعتذار').fill('خارج نطاق التخصص');
    await spec.getByRole('dialog').getByRole('button', { name: 'تأكيد' }).click();
    await expect(spec.getByText('اعتذرت عن هذا الطلب')).toBeVisible();
    const [afterDecline] = await query<{ status: string; declines: number }>(
      `select r.status, (select count(*)::int from service_request_declines d where d.service_request_id = r.id) declines
         from service_requests r where r.id = $1`,
      [idDeclined],
    );
    expect(afterDecline).toEqual({ status: 'pending', declines: 1 });

    // Accept → start → complete.
    await spec.goto(`/specialist/requests/${idTaken}`);
    await spec.getByRole('button', { name: 'قبول الطلب' }).click();
    await spec.getByRole('dialog').getByRole('button', { name: 'تأكيد' }).click();
    await expect(spec.getByRole('button', { name: 'بدء تنفيذ الخدمة' })).toBeVisible();

    await org.goto('/organization');
    await expect(org.locator('section', { has: org.getByRole('heading', { name: /الطلبات الجارية/ }) })).toContainText(taken);
    await expect(org.locator('section', { has: org.getByRole('heading', { name: /آخر الأخصائيين/ }) })).toContainText(specName);

    await spec.getByRole('button', { name: 'بدء تنفيذ الخدمة' }).click();
    await spec.getByRole('button', { name: 'إنهاء الخدمة' }).click();
    await expect(spec.getByText('مكتمل').first()).toBeVisible();

    // Organization withdraws the third request.
    await org.goto(`/organization/requests/${idWithdrawn}`);
    await org.getByRole('button', { name: 'إلغاء الطلب' }).click();
    await org.getByRole('dialog').getByRole('button', { name: 'تأكيد الإلغاء' }).click();
    await expect(org.getByText('ملغى')).toBeVisible();

    const statuses = await query<{ id: string; status: string }>(
      'select id, status from service_requests where id = any($1::uuid[])',
      [[idDeclined, idTaken, idWithdrawn]],
    );
    expect(Object.fromEntries(statuses.map((r) => [r.id, r.status]))).toEqual({
      [idDeclined]: 'pending',
      [idTaken]: 'completed',
      [idWithdrawn]: 'cancelled',
    });

    // Category tabs: each request in exactly one tab.
    await org.goto('/organization/requests?tab=previous');
    const previous = org.getByRole('tabpanel');
    await expect(previous).toContainText(taken);
    await expect(previous).toContainText(withdrawn);
    await expect(previous).not.toContainText(declined);
    await org.getByRole('tab', { name: /الطلبات المعلقة/ }).click();
    await expect(org.getByRole('tabpanel')).toContainText(declined);
    await expect(org.getByRole('tabpanel')).not.toContainText(taken);

    // ---- Terminology + CV printing placement
    await spec.goto('/specialist/cv');
    await expect(spec.getByRole('button', { name: /طباعة السيرة/ })).toBeVisible({ timeout: 20_000 });
    await expect(spec.getByRole('banner').getByRole('button', { name: 'طباعة' })).toHaveCount(0);
    await expect(spec.getByRole('link', { name: 'الخدمات' })).toBeVisible();
    await expect(spec.getByRole('link', { name: 'تقديم للمنشآت' })).toHaveCount(0);
    await expect(spec.getByRole('link', { name: 'المشاريع' })).toHaveCount(0);
  });
});
