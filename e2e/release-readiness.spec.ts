import { expect, test, type APIRequestContext, type Browser, type BrowserContext } from '@playwright/test';
import { Pool } from 'pg';

import { loadLocalEnv } from '../src/db/env';

loadLocalEnv();

/**
 * Release-readiness journeys: second profile on one login (both directions),
 * rejected-account re-review, URL-based directory filters, attachment
 * authorization by guessed ids, and the security hardening (failed-login
 * throttling, public sign-up disabled, anti-framing headers).
 * Needs `npm run db:seed:fixtures` and the demo OTP mode of the local e2e server.
 */
test.describe.configure({ mode: 'serial' });

const PASSWORD = process.env.FIXTURE_PASSWORD || 'Ecovia-Test-2026!';
const ADMIN_EMAIL = process.env.ADMIN_EMAIL ?? 'admin@ecovia.local';
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD ?? 'admin_secure_password_123';
const FACILITY = 'facility.approved@test.ecovia.local';
const SPECIALIST = 'specialist.approved@test.ecovia.local';

async function query<T>(sql: string, params: unknown[] = []): Promise<T[]> {
  const pool = new Pool({ connectionString: process.env.DATABASE_URL });
  try {
    return (await pool.query(sql, params)).rows as T[];
  } finally {
    await pool.end();
  }
}

let counter = 0;
function freshPhone(): string {
  counter += 1;
  return `05${String((Date.now() + counter * 104_729) % 100_000_000).padStart(8, '0')}`;
}

/** A brand-new PENDING specialist through the real OTP + registration APIs. */
async function newPendingSpecialist(browser: Browser): Promise<{ context: BrowserContext; phone: string; userId: string }> {
  const context = await browser.newContext({ locale: 'ar-SA' });
  const api = context.request;
  const phone = freshPhone();
  expect((await api.post('/api/session/phone-otp', { data: { phoneNumber: phone } })).ok()).toBeTruthy();
  expect((await api.post('/api/session/phone-verify', { data: { phoneNumber: phone, code: '123456' } })).ok()).toBeTruthy();
  const registered = await api.post('/api/register/specialist', {
    data: { fullName: 'أخصائي مراجعة (اختبار)', nationalId: `1${phone.slice(2)}`, phone, license: `TEST-${phone}`, issueDate: null, licenseDocId: null },
  });
  expect(registered.ok()).toBeTruthy();
  return { context, phone, userId: (await registered.json()).userId };
}

/** A brand-new PENDING facility through the real email-OTP + registration APIs. */
async function newPendingFacility(browser: Browser): Promise<{ context: BrowserContext; userId: string }> {
  const context = await browser.newContext({ locale: 'ar-SA' });
  const api = context.request;
  const cr = `8${String(Date.now()).slice(-9)}`;
  const email = `org_${cr}@ecovia.local`;
  expect((await api.post('/api/session/otp', { data: { email } })).ok()).toBeTruthy();
  expect((await api.post('/api/session/verify', { data: { email, code: '123456' } })).ok()).toBeTruthy();
  const registered = await api.post('/api/register/organization', {
    data: { orgName: 'منشأة إضافة ملف (اختبار)', crNumber: cr, phone: '0110000009', orgDesc: 'منشأة اختبار', crDocId: null },
  });
  expect(registered.ok()).toBeTruthy();
  return { context, userId: (await registered.json()).userId };
}

async function adminApi(browser: Browser): Promise<APIRequestContext> {
  const context = await browser.newContext();
  const login = await context.request.post('/api/admin/login', { data: { email: ADMIN_EMAIL, password: ADMIN_PASSWORD } });
  expect(login.ok()).toBeTruthy();
  return context.request;
}

async function loginPage(browser: Browser, email: string) {
  const context = await browser.newContext({ locale: 'ar-SA' });
  const page = await context.newPage();
  await page.goto('/login');
  await page.getByLabel('البريد الإلكتروني أو رقم الجوال').fill(email);
  await page.getByLabel('كلمة المرور').fill(PASSWORD);
  await page.getByRole('button', { name: 'دخول' }).click();
  await page.waitForURL((url) => !url.pathname.startsWith('/login'), { timeout: 30_000 });
  return page;
}

test.describe('second profile on the same login', () => {
  test('a specialist adds a facility profile: same user, pending, switchable', async ({ browser }) => {
    test.skip(test.info().project.name !== 'desktop-chromium', 'account-creating flow runs once');
    test.setTimeout(120_000);
    const { context, userId } = await newPendingSpecialist(browser);
    const page = await context.newPage();
    await page.goto('/specialist/cv');
    await page.getByTestId('add-profile').click();
    await expect(page).toHaveURL(/\/register\/organization$/);
    await expect(page.getByTestId('linking-notice')).toBeVisible();
    await page.getByLabel('رقم السجل التجاري').fill(`9${String(Date.now()).slice(-9)}`);
    await page.getByRole('button', { name: /جلب/ }).click();
    await expect(page.getByLabel('اسم المنشأة')).not.toHaveValue('', { timeout: 10_000 });
    await page.getByLabel('رقم التواصل').fill('0112223333');
    await page.getByLabel('نبذة عن الجهة').fill('منشأة مضافة لحساب أخصائي');
    await page.getByRole('button', { name: /المتابعة للتحقق/ }).click();
    await expect(page.getByRole('heading', { name: 'تأكيد إضافة الملف' })).toBeVisible();
    await page.getByRole('button', { name: 'إضافة الملف إلى حسابي' }).click();
    await expect(page).toHaveURL(/\/organization\/profile$/, { timeout: 30_000 });
    await expect(page.getByTestId('approval-banner')).toBeVisible();

    const rows = await query<{ users: number; orgs: number; org_status: string }>(
      `select (select count(*)::int from "user" where id = $1) users,
              (select count(*)::int from organizations where user_id = $1) orgs,
              (select status::text from organizations where user_id = $1) org_status`,
      [userId],
    );
    expect(rows[0]).toEqual({ users: 1, orgs: 1, org_status: 'pending' });
    await expect(page.getByTestId('account-switcher')).toContainText('أخصائي');
    // Visiting the form again does not create a duplicate.
    await page.goto('/register/organization');
    await expect(page).toHaveURL(/\/organization\/profile$/);
  });

  test('a facility adds a specialist profile', async ({ browser }) => {
    test.skip(test.info().project.name !== 'desktop-chromium', 'account-creating flow runs once');
    test.setTimeout(120_000);
    const { context, userId } = await newPendingFacility(browser);
    const page = await context.newPage();
    await page.goto('/organization/profile');
    await page.getByTestId('add-profile').click();
    await expect(page.getByTestId('linking-notice')).toBeVisible();
    await page.getByLabel('الاسم الثلاثي').fill('أخصائي مضاف (اختبار)');
    await page.getByLabel('رقم الهوية').fill(`1${String(Date.now()).slice(-9)}`);
    await page.getByLabel('رقم الجوال').fill(freshPhone());
    await page.getByLabel('رقم المعاملة / الترخيص').fill('TEST-LINK-1');
    await page.getByRole('button', { name: /إرسال طلب التسجيل/ }).click();
    await page.getByRole('button', { name: 'إضافة الملف إلى حسابي' }).click();
    await expect(page).toHaveURL(/\/specialist\/cv$/, { timeout: 30_000 });
    const [row] = await query<{ specs: number; status: string }>(
      `select count(*)::int specs, max(status::text) status from specialists where user_id = $1`,
      [userId],
    );
    expect(row).toEqual({ specs: 1, status: 'pending' });
  });
});

test.describe('rejected account re-review', () => {
  test('reject → cannot approve directly → owner resubmits → history kept → approve', async ({ browser }) => {
    test.skip(test.info().project.name !== 'desktop-chromium', 'account-creating flow runs once');
    test.setTimeout(120_000);
    const { context, userId } = await newPendingSpecialist(browser);
    const [spec] = await query<{ id: string }>('select id from specialists where user_id = $1', [userId]);
    const admin = await adminApi(browser);

    expect((await admin.post('/api/admin/accounts/reject', { data: { collection: 'specialists', id: spec.id, reason: 'الترخيص غير واضح' } })).ok()).toBeTruthy();
    expect((await admin.post('/api/admin/accounts/approve', { data: { collection: 'specialists', id: spec.id } })).status()).toBe(409);

    const page = await context.newPage();
    await page.goto('/specialist/requests');
    await expect(page).toHaveURL(/\/specialist\/cv$/);
    await expect(page.getByTestId('approval-banner')).toContainText('الترخيص غير واضح');
    expect((await page.request.get('/api/service-requests?as=spec')).status()).toBe(403);
    await page.getByRole('button', { name: 'إعادة الإرسال للمراجعة' }).click();
    await page.getByRole('dialog').getByLabel('ملاحظة للإدارة (اختياري)').fill('أرفقت نسخة أوضح');
    await page.getByRole('dialog').getByRole('button', { name: 'إعادة الإرسال' }).click();
    // The banner switches to the pending state and names the earlier rejection.
    await expect(page.getByTestId('approval-banner')).toContainText('أُعيد إرسال الحساب بعد رفض سابق');
    // Still unapproved while under review again.
    expect((await page.request.get('/api/service-requests?as=spec')).status()).toBe(403);

    const details = await (await admin.get(`/api/admin/accounts/specialists/${spec.id}`)).json();
    expect(details.history.map((event: { action: string }) => event.action)).toEqual([
      'account.registered',
      'account.rejected',
      'account.resubmitted',
    ]);
    expect((await admin.post('/api/admin/accounts/approve', { data: { collection: 'specialists', id: spec.id } })).ok()).toBeTruthy();
    await page.goto('/specialist/requests');
    await expect(page).toHaveURL(/\/specialist\/requests$/);
    // Non-admins cannot read the review record.
    expect((await page.request.get(`/api/admin/accounts/specialists/${spec.id}`)).status()).toBe(403);
  });
});

test.describe('directory URL filters', () => {
  test('filters live in the URL and survive reload and back/forward', async ({ browser }) => {
    test.setTimeout(90_000);
    const page = await loginPage(browser, FACILITY);
    await page.goto('/organization/specialists');
    const total = await page.getByTestId('directory-card').count();
    await page.getByLabel('فلترة حسب المنطقة').selectOption('riyadh');
    await expect(page).toHaveURL(/region=riyadh/);
    await page.getByLabel('ابحث بالتخصص أو الاسم').fill('ريم');
    await page.getByRole('button', { name: 'بحث' }).click();
    await expect(page).toHaveURL(new RegExp(`q=${encodeURIComponent('ريم')}`));
    await expect(page.getByTestId('directory-card').first()).toContainText('ريم الاختبارية');
    await page.reload();
    await expect(page.getByLabel('فلترة حسب المنطقة')).toHaveValue('riyadh');
    await expect(page.getByLabel('ابحث بالتخصص أو الاسم')).toHaveValue('ريم');
    await page.goBack();
    await expect(page).not.toHaveURL(new RegExp(`q=${encodeURIComponent('ريم')}`));
    await expect(page).toHaveURL(/region=riyadh/);
    await page.goto('/organization/specialists?region=atlantis&years=999');
    await expect(page.getByTestId('directory-card')).toHaveCount(total);
  });
});

test.describe('attachment authorization', () => {
  test('a guessed or foreign document id is refused; anonymous gets 401', async ({ browser, request }) => {
    test.setTimeout(90_000);
    const [doc] = await query<{ id: string }>(
      `select d.id from documents d join "user" u on u.id = d.owner_user_id where u.email <> $1 order by d.created_at desc limit 1`,
      [SPECIALIST],
    );
    test.skip(!doc, 'no foreign document in this database');
    expect((await request.get(`/api/files/${doc.id}`)).status()).toBe(401);
    const page = await loginPage(browser, SPECIALIST);
    expect([403, 404]).toContain((await page.request.get(`/api/files/${doc.id}`)).status());
    expect((await page.request.get('/api/files/00000000-0000-4000-8000-000000000000')).status()).toBe(404);
    expect((await page.request.get('/api/files/not-a-uuid')).status()).toBe(404);
  });
});

test.describe('security hardening', () => {
  test('failed sign-ins are throttled per identity; public sign-up is disabled; anti-framing headers', async ({ request }) => {
    const identity = `nobody.${Date.now()}@invalid.example`;
    const codes: number[] = [];
    for (let i = 0; i < 12; i += 1) {
      codes.push((await request.post('/api/login', { data: { identifier: identity, password: 'wrong-password' } })).status());
    }
    expect(codes.slice(0, 10).every((code) => code === 401)).toBe(true);
    expect(codes.slice(10)).toEqual([429, 429]);

    const signUp = await request.post('/api/auth/sign-up/email', {
      data: { email: `bypass.${Date.now()}@example.test`, password: 'Bypass-pass-123', name: 'x' },
      headers: { origin: test.info().project.use.baseURL! },
    });
    expect(signUp.status()).toBeGreaterThanOrEqual(400);

    const home = await request.get('/');
    expect(home.headers()['x-frame-options']).toBe('DENY');
    expect(home.headers()['content-security-policy']).toContain("frame-ancestors 'none'");
  });
});

test.describe('document viewer under the anti-framing policy', () => {
  test('a specialist’s own PDF still renders in the inline viewer', async ({ browser }) => {
    test.setTimeout(90_000);
    const page = await loginPage(browser, SPECIALIST);
    const pdf = Buffer.from(
      '%PDF-1.4\n1 0 obj<</Type/Catalog/Pages 2 0 R>>endobj 2 0 obj<</Type/Pages/Kids[3 0 R]/Count 1>>endobj 3 0 obj<</Type/Page/Parent 2 0 R/MediaBox[0 0 200 200]>>endobj\ntrailer<</Root 1 0 R>>\n%%EOF',
    );
    const upload = await page.request.post('/api/files', {
      multipart: { kind: 'resume', file: { name: 'cv.pdf', mimeType: 'application/pdf', buffer: pdf } },
    });
    expect(upload.ok()).toBeTruthy();
    const { id } = await upload.json();
    const profile = await (await page.request.get('/api/specialist/profile')).json();
    const patch = await page.request.patch('/api/specialist/profile', {
      data: {
        fullName: profile.fullName, email: profile.email ?? '', phone: profile.phone, edu: profile.edu ?? '',
        city: profile.city ?? '', years: String(profile.years ?? ''), exp: profile.exp ?? '', portfolio: '', resumeDocumentId: id,
      },
    });
    expect(patch.ok()).toBeTruthy();
    await page.goto('/specialist/cv');
    await page.getByRole('button', { name: 'عرض المرفق' }).last().click();
    const frame = page.locator('iframe[title="ملف السيرة الذاتية"]');
    await expect(frame).toBeVisible({ timeout: 15_000 });
    expect(await frame.getAttribute('src')).toMatch(/^blob:/);
    await expect(page.getByText('ليست لديك صلاحية')).toHaveCount(0);
  });
});
