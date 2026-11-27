import { expect, test, type Browser, type Page } from '@playwright/test';
import { Pool } from 'pg';

import { loadLocalEnv } from '../src/db/env';

loadLocalEnv();

/**
 * Critical marketplace journeys against the real app + database.
 * Requires the dev/test fixtures: `npm run db:seed:fixtures` (see
 * src/db/seed/fixtures.ts). Accounts are fictional and labelled as tests.
 */
// The journeys share fixture accounts (e.g. one marks notifications read), so they run in order.
test.describe.configure({ mode: 'serial' });

const PASSWORD = process.env.FIXTURE_PASSWORD || 'Ecovia-Test-2026!';
const FACILITY = 'facility.approved@test.ecovia.local';
const SPECIALIST = 'specialist.approved@test.ecovia.local'; // Riyadh
const PENDING = 'specialist.pending@test.ecovia.local';
const DUAL = 'dual.account@test.ecovia.local'; // approved specialist (Eastern) + approved facility

async function query<T>(sql: string, params: unknown[] = []): Promise<T[]> {
  const pool = new Pool({ connectionString: process.env.DATABASE_URL });
  try {
    return (await pool.query(sql, params)).rows as T[];
  } finally {
    await pool.end();
  }
}

async function login(browser: Browser, email: string): Promise<Page> {
  // E2E_STORAGE_STATE: access cookie for a protected deployment (remote runs only).
  const context = await browser.newContext({ locale: 'ar-SA', storageState: process.env.E2E_STORAGE_STATE || undefined });
  const page = await context.newPage();
  await page.goto('/login');
  await page.getByLabel('البريد الإلكتروني أو رقم الجوال').fill(email);
  await page.getByLabel('كلمة المرور').fill(PASSWORD);
  await page.getByRole('button', { name: 'دخول' }).click();
  await page.waitForURL((url) => !url.pathname.startsWith('/login'), { timeout: 30_000 });
  return page;
}

async function publishRequest(page: Page, activity: string, options: { regionCode?: string; specialistId?: string } = {}) {
  await page.goto(options.specialistId ? `/organization/requests/new?specialist=${options.specialistId}` : '/organization/requests/new');
  await page.getByRole('checkbox', { name: /Environmental Activity Classification Service/ }).check();
  await page.getByRole('checkbox', { name: /Environmental Management Plan Service/ }).check();
  await page.getByLabel(/وصف النشاط/).fill(activity);
  await page.getByLabel(/ملاحظات/).fill('ملاحظة اختبار');
  await page.getByLabel('المنطقة').selectOption(options.regionCode ?? 'riyadh');
  await page.getByRole('button', { name: options.specialistId ? 'إرسال الطلب الخاص' : 'نشر الطلب' }).click();
  await page.waitForURL(/\/organization\/requests\/[0-9a-f-]{36}\?created=1$/, { timeout: 30_000 });
  return new URL(page.url()).pathname.split('/').pop() as string;
}

test.describe('offers stay open until one contract is signed', () => {
  test('publish → notify region → several offers → contract → signature closes the request', async ({ browser }) => {
    test.skip(test.info().project.name !== 'desktop-chromium', 'multi-account flow runs once');
    test.setTimeout(240_000);
    const activity = `نشاط اختبار ${Date.now()}`;

    // Facility publishes (Service Type multi-select, no price/duration).
    const facility = await login(browser, FACILITY);
    await expect(facility).toHaveURL(/\/organization$/);
    const requestId = await publishRequest(facility, activity);
    await expect(facility.getByText(/تم نشر الطلب وإشعار الأخصائيين المعتمدين/)).toBeVisible();
    const [stored] = await query<{ service_types: string; cost: unknown; duration: unknown; notes: string }>(
      'select service_types::text, cost, duration, notes from service_requests where id = $1',
      [requestId],
    );
    expect(stored).toEqual({
      service_types: '{activity_classification,environmental_management_plan}',
      cost: null,
      duration: null,
      notes: 'ملاحظة اختبار',
    });

    // Regional notification reached the Riyadh specialist (not the Eastern one).
    const notified = await query<{ email: string }>(
      `select u.email from notifications n join "user" u on u.id = n.recipient_user_id
        where n.related_id = $1 and n.type = 'request.published'`,
      [requestId],
    );
    expect(notified.map((row) => row.email)).toContain(SPECIALIST);
    expect(notified.map((row) => row.email)).not.toContain(DUAL);

    // Specialist: bell count, region filter in the URL, offer with duration.
    const specialist = await login(browser, SPECIALIST);
    await expect(specialist).toHaveURL(/\/specialist$/);
    await expect(specialist.getByRole('link', { name: /^الإشعارات: / })).toBeVisible();
    await expect(specialist.getByTestId('notification-badge')).toBeVisible();
    await specialist.goto('/specialist/requests?region=riyadh');
    await specialist.reload();
    await expect(specialist.getByLabel('تصفية حسب المنطقة')).toHaveValue('riyadh');
    await specialist.getByRole('link', { name: new RegExp('خدمة تصنيف النشاط البيئي') }).filter({ hasText: activity }).click();
    await specialist.getByLabel('المدة المطلوبة لتنفيذ الخدمة').fill('0');
    await specialist.getByRole('button', { name: 'تقديم العرض' }).click();
    await expect(specialist.getByText(/أدخل مدة التنفيذ عدداً صحيحاً/)).toBeVisible();
    await specialist.getByLabel('المدة المطلوبة لتنفيذ الخدمة').fill('3');
    await specialist.getByRole('button', { name: 'تقديم العرض' }).click();
    await expect(specialist.getByText('تم إرسال عرضك إلى المنشأة.')).toBeVisible();

    // A second specialist (other region) can still apply.
    const dual = await login(browser, DUAL);
    await dual.goto(`/specialist/requests/${requestId}`);
    await dual.getByLabel('المدة المطلوبة لتنفيذ الخدمة').fill('10');
    await dual.getByLabel('وحدة المدة').selectOption('day');
    await dual.getByRole('button', { name: 'تقديم العرض' }).click();
    await expect(dual.getByText('تم إرسال عرضك إلى المنشأة.')).toBeVisible();

    // Facility compares offers and selects one: the request stays OPEN.
    await facility.goto(`/organization/requests/${requestId}`);
    await expect(facility.getByTestId('offer-card')).toHaveCount(2);
    const chosen = facility.getByTestId('offer-card').filter({ hasText: '3 أسابيع' });
    await chosen.getByRole('button', { name: 'اختيار العرض وإعداد العقد' }).click();
    const dialog = facility.getByRole('dialog');
    await dialog.getByLabel(/قيمة العقد/).fill('15000');
    await dialog.getByLabel(/توقيع المنشأة/).fill('مفوّض الاختبار');
    await dialog.getByRole('checkbox').check();
    await dialog.getByRole('button', { name: 'إرسال العقد للأخصائي' }).click();
    await expect(facility.getByTestId('notice')).toContainText('تم إعداد العقد وإرساله للأخصائي');
    await expect(facility.getByText('عقد بانتظار التوقيع').first()).toBeVisible();
    const [stillOpen] = await query<{ status: string }>('select status from service_requests where id = $1', [requestId]);
    expect(stillOpen.status).toBe('pending');

    // The selected specialist reads the draft and signs it.
    await specialist.goto(`/specialist/requests/${requestId}`);
    await specialist.getByTestId('view-contract').click();
    await expect(specialist.getByTestId('contract-draft-banner')).toBeVisible();
    await specialist.getByLabel(/توقيعك/).fill('ريم الاختبارية');
    await specialist.getByRole('checkbox', { name: /اطلعت على العقد/ }).check();
    await specialist.getByRole('button', { name: 'توقيع العقد' }).click();
    await expect(specialist.getByTestId('notice')).toContainText('تم توقيع العقد');

    // Signing closed the request; the other offer was declined; both parties see the signed contract.
    const [closed] = await query<{ status: string; signed: number }>(
      `select r.status, (select count(*)::int from contracts c where c.service_request_id = r.id and c.status = 'signed') signed
         from service_requests r where r.id = $1`,
      [requestId],
    );
    expect(closed).toEqual({ status: 'accepted', signed: 1 });
    await dual.goto(`/specialist/requests/${requestId}`);
    await expect(dual.getByText('لم يُقبل').first()).toBeVisible();
    await expect(dual.getByRole('button', { name: 'تقديم العرض' })).toHaveCount(0);

    await facility.goto(`/organization/requests/${requestId}`);
    await facility.getByTestId('view-contract').click();
    await expect(facility.getByText('عقد تقديم خدمة بيئية')).toBeVisible();
    await expect(facility.getByTestId('contract-draft-banner')).toHaveCount(0);
    await expect(facility.getByText('ريم الاختبارية', { exact: true })).toBeVisible();

    // Chat: the facility opens the specialist's CV from the conversation.
    await facility.goto('/organization/messages');
    await facility.getByRole('button', { name: /ريم الاختبارية/ }).first().click();
    await facility.getByTestId('chat-view-cv').click();
    await expect(facility.getByRole('dialog').getByText('ريم الاختبارية (أخصائية تجريبية)')).toBeVisible();
  });

  test('a private request is visible to its designated specialist only', async ({ browser }) => {
    test.skip(test.info().project.name !== 'desktop-chromium', 'multi-account flow runs once');
    test.setTimeout(180_000);
    const [target] = await query<{ id: string }>(
      `select s.id from specialists s join "user" u on u.id = s.user_id where u.email = $1`,
      [SPECIALIST],
    );
    const facility = await login(browser, FACILITY);
    const requestId = await publishRequest(facility, `طلب خاص ${Date.now()}`, { regionCode: 'eastern', specialistId: target.id });

    const outsider = await login(browser, DUAL);
    const response = await outsider.goto(`/specialist/requests/${requestId}`);
    expect(response?.status()).toBe(404);
    const api = await outsider.request.get(`/api/service-requests/${requestId}`);
    expect(api.status()).toBe(404);

    const specialist = await login(browser, SPECIALIST);
    await specialist.goto(`/specialist/requests/${requestId}`);
    await expect(specialist.getByText(/طلب خاص موجّه إليك وحدك/)).toBeVisible();
  });
});

test.describe('pending accounts', () => {
  test('land on their own CV, keep CV + logout, and get 403 from approved-only APIs', async ({ browser }) => {
    test.setTimeout(120_000);
    const page = await login(browser, PENDING);
    await expect(page).toHaveURL(/\/specialist\/cv$/);
    await expect(page.getByTestId('approval-banner')).toContainText('حسابك قيد المراجعة');
    await expect(page.getByRole('link', { name: 'طلبات الخدمة' })).toHaveCount(0);
    await expect(page.getByRole('link', { name: /^الإشعارات/ })).toHaveCount(0);

    for (const path of ['/specialist', '/specialist/requests', '/specialist/messages', '/specialist/notifications']) {
      await page.goto(path);
      await expect(page).toHaveURL(/\/specialist\/cv$/);
    }
    for (const path of [
      '/api/service-requests?as=spec',
      '/api/chat/conversations',
      '/api/notifications/unread-count',
      '/api/directory?kind=organizations',
    ]) {
      expect((await page.request.get(path)).status(), path).toBe(403);
    }
    // Own CV is readable and editable.
    expect((await page.request.get('/api/specialist/profile')).status()).toBe(200);
    await page.getByLabel('سنوات الخبرة').fill('3');
    await page.getByRole('button', { name: /حفظ/ }).first().click();
    await expect(page.getByText('تم حفظ التحديثات!')).toBeVisible();

    // Another user's CV cannot be fetched by changing an id.
    const [other] = await query<{ id: string }>(
      `select s.id from specialists s join "user" u on u.id = s.user_id where u.email = $1`,
      [SPECIALIST],
    );
    expect((await page.request.get(`/api/directory?kind=specialists&id=${other.id}`)).status()).toBe(403);

    await page.getByRole('button', { name: 'تسجيل الخروج' }).click();
    await expect(page).toHaveURL(/\/$/);
    expect((await page.request.get('/api/specialist/profile')).status()).toBe(401);
  });
});

test.describe('navigation', () => {
  test('the account switcher appears only for a user owning both profiles and cannot grant a role', async ({ browser }) => {
    test.setTimeout(120_000);
    const dual = await login(browser, DUAL);
    await expect(dual.getByTestId('account-switcher')).toBeVisible();
    await dual.getByTestId('account-switcher').click();
    await expect(dual).toHaveURL(/\/organization$/);
    await dual.getByTestId('account-switcher').click();
    await expect(dual).toHaveURL(/\/specialist$/);

    const single = await login(browser, SPECIALIST);
    await expect(single.getByTestId('account-switcher')).toHaveCount(0);
    // A forged context cookie never opens the other workspace.
    await single.context().addCookies([{ name: 'ecovia_active_role', value: 'org', url: test.info().project.use.baseURL! }]);
    await single.goto('/organization');
    await expect(single).toHaveURL(/\/specialist$/);
  });

  test('the old workspace headers are gone and the notification counter updates after reading', async ({ browser }) => {
    test.setTimeout(120_000);
    const page = await login(browser, SPECIALIST);
    for (const path of ['/specialist', '/specialist/requests', '/specialist/cv', '/specialist/services']) {
      await page.goto(path);
      await expect(page.getByText('مرحباً، أخصائي')).toHaveCount(0);
      await expect(page.getByText('لوحة التحكم والخدمات')).toHaveCount(0);
    }
    await page.goto('/specialist/notifications');
    const markAll = page.getByRole('button', { name: 'تعليم الكل كمقروء' });
    if (await markAll.isVisible()) await markAll.click();
    await expect(page.getByTestId('notification-badge')).toHaveCount(0);
    await page.reload();
    await expect(page.getByTestId('notification-badge')).toHaveCount(0);
    await expect(page.getByTestId('home-notification-counter')).toHaveCount(0);
    await page.goto('/specialist');
    await expect(page.getByTestId('home-notification-counter')).toContainText('0');

    const facility = await login(browser, FACILITY);
    for (const path of ['/organization', '/organization/requests', '/organization/profile']) {
      await facility.goto(path);
      await expect(facility.getByText('بوابة المنشآت')).toHaveCount(0);
      await expect(facility.getByText('لوحة التحكم والمواهب')).toHaveCount(0);
    }
  });
});
