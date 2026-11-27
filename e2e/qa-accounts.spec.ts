import { expect, test, type Browser, type Page } from '@playwright/test';
import { Pool } from 'pg';

import { loadEnvFile, loadLocalEnv } from '../src/db/env';

loadEnvFile('.env.qa.local');
loadLocalEnv();

/**
 * Persistent QA accounts (src/db/seed/qa-accounts.ts) against a QA deployment.
 * Runs only with E2E_BASE_URL (a QA preview) and the QA passwords (git-ignored
 * `.env.qa.local`), so the normal local suite skips it. See docs/QA_TEST_ACCOUNTS.md:
 *
 *   @setup     uploads clearly labelled SYNTHETIC files through the app (logo,
 *              photos, CV, permit, commercial registration) — idempotent
 *   @auth      login / role / dashboard / allowed + forbidden areas / logout / re-login
 *   @scenario  A normal workflow · C private request · D document & account security ·
 *              B multiple offers (in this order: D checks "no relationship yet" before B)
 *
 * Data created by the scenarios stays in the QA database for manual inspection.
 */
test.describe.configure({ mode: 'serial' });

const ORG = 'qa.organization@test.ecovia.local';
const SPEC = 'qa.specialist@test.ecovia.local';
const OBS = 'qa.observer@test.ecovia.local';
const PASSWORDS: Record<string, string | undefined> = {
  [ORG]: process.env.QA_ORGANIZATION_PASSWORD,
  [SPEC]: process.env.QA_SPECIALIST_PASSWORD,
  [OBS]: process.env.QA_OBSERVER_PASSWORD,
};
const SYNTHETIC = 'SYNTHETIC TEST DOCUMENT — ECOVIA QA — NOT A REAL DOCUMENT';

test.skip(!PASSWORDS[ORG] || !PASSWORDS[SPEC] || !PASSWORDS[OBS], 'QA account passwords are not configured');
// Only against an explicitly chosen QA deployment (E2E_BASE_URL), never the local suite or the live domain.
test.skip(!process.env.E2E_BASE_URL, 'set E2E_BASE_URL to the QA preview deployment');
if (process.env.E2E_BASE_URL?.includes('ecovia-kappa')) throw new Error('Refusing to run QA journeys against the live domain.');
test.beforeEach(({}, testInfo) => {
  test.skip(testInfo.project.name !== 'desktop-chromium', 'QA account journeys run once');
});

async function query<T>(sql: string, params: unknown[] = []): Promise<T[]> {
  const pool = new Pool({ connectionString: process.env.DATABASE_URL });
  try {
    return (await pool.query(sql, params)).rows as T[];
  } finally {
    await pool.end();
  }
}

async function login(browser: Browser, email: string): Promise<Page> {
  const context = await browser.newContext({ locale: 'ar-SA', storageState: process.env.E2E_STORAGE_STATE || undefined });
  const page = await context.newPage();
  await page.goto('/login');
  await page.getByLabel('البريد الإلكتروني أو رقم الجوال').fill(email);
  await page.getByLabel('كلمة المرور').fill(PASSWORDS[email]!);
  await page.getByRole('button', { name: 'دخول' }).click();
  await page.waitForURL((url) => !url.pathname.startsWith('/login'), { timeout: 30_000 });
  return page;
}

async function anonymous(browser: Browser): Promise<Page> {
  const context = await browser.newContext({ storageState: process.env.E2E_STORAGE_STATE || undefined });
  return context.newPage();
}

async function syntheticPng(page: Page, label: string, color: string): Promise<Buffer> {
  await page.setContent(
    `<div id="a" style="width:256px;height:256px;background:${color};color:#fff;font:bold 22px sans-serif;display:flex;align-items:center;justify-content:center;text-align:center">${label}<br>QA · SYNTHETIC</div>`,
  );
  return page.locator('#a').screenshot({ type: 'png' });
}

async function syntheticPdf(page: Page, title: string, lines: string[]): Promise<Buffer> {
  await page.setContent(
    `<main style="font:16px sans-serif;padding:40px"><p style="color:#b00;font-weight:bold">${SYNTHETIC}</p><h1>${title}</h1>${lines
      .map((line) => `<p>${line}</p>`)
      .join('')}<p style="color:#b00">${SYNTHETIC}</p></main>`,
  );
  return page.pdf({ format: 'A4' });
}

async function upload(page: Page, kind: string, name: string, mimeType: string, buffer: Buffer): Promise<string> {
  const response = await page.request.post('/api/files', { multipart: { kind, file: { name, mimeType, buffer } } });
  expect(response.status(), `upload ${kind}`).toBe(200);
  return (await response.json()).id as string;
}

async function ownDocCount(email: string, kind: string): Promise<number> {
  const [row] = await query<{ n: number }>(
    `select count(*)::int n from documents d join "user" u on u.id = d.owner_user_id where u.email = $1 and d.kind = $2`,
    [email, kind],
  );
  return row.n;
}

async function publishRequest(page: Page, activity: string, options: { regionCode?: string; specialistId?: string } = {}) {
  await page.goto(options.specialistId ? `/organization/requests/new?specialist=${options.specialistId}` : '/organization/requests/new');
  await page.getByRole('checkbox', { name: /Environmental Activity Classification Service/ }).check();
  await page.getByRole('checkbox', { name: /Environmental Management Plan Service/ }).check();
  await page.getByLabel(/وصف النشاط/).fill(activity);
  await page.getByLabel(/ملاحظات/).fill('طلب اختبار QA — بيانات اصطناعية');
  await page.getByLabel('المنطقة').selectOption(options.regionCode ?? 'riyadh');
  await page.getByRole('button', { name: options.specialistId ? 'إرسال الطلب الخاص' : 'نشر الطلب' }).click();
  await page.waitForURL(/\/organization\/requests\/[0-9a-f-]{36}\?created=1$/, { timeout: 30_000 });
  return new URL(page.url()).pathname.split('/').pop() as string;
}

async function offer(page: Page, requestId: string, amount: string, unit?: 'day' | 'week' | 'month') {
  await page.goto(`/specialist/requests/${requestId}`);
  await page.getByLabel('المدة المطلوبة لتنفيذ الخدمة').fill(amount);
  if (unit) await page.getByLabel('وحدة المدة').selectOption(unit);
  await page.getByRole('button', { name: 'تقديم العرض' }).click();
  await expect(page.getByText('تم إرسال عرضك إلى المنشأة.')).toBeVisible();
}

async function prepareContract(page: Page, requestId: string, offerText: string) {
  await page.goto(`/organization/requests/${requestId}`);
  const chosen = page.getByTestId('offer-card').filter({ hasText: offerText });
  await chosen.getByRole('button', { name: 'اختيار العرض وإعداد العقد' }).click();
  const dialog = page.getByRole('dialog');
  await dialog.getByLabel(/قيمة العقد/).fill('12000');
  await dialog.getByLabel(/توقيع المنشأة/).fill('مفوّض منشأة الاختبار QA');
  await dialog.getByRole('checkbox').check();
  await dialog.getByRole('button', { name: 'إرسال العقد للأخصائي' }).click();
  await expect(page.getByTestId('notice')).toContainText('تم إعداد العقد وإرساله للأخصائي');
}

async function sign(page: Page, requestId: string) {
  await page.goto(`/specialist/requests/${requestId}`);
  await page.getByTestId('view-contract').click();
  await expect(page.getByTestId('contract-draft-banner')).toBeVisible();
  await page.getByLabel(/توقيعك/).fill('Ecovia QA Specialist');
  await page.getByRole('checkbox', { name: /اطلعت على العقد/ }).check();
  await page.getByRole('button', { name: 'توقيع العقد' }).click();
  await expect(page.getByTestId('notice')).toContainText('تم توقيع العقد');
}

async function requestState(requestId: string) {
  const [row] = await query<{ status: string; signed: number; pending: number }>(
    `select r.status::text status,
            (select count(*)::int from contracts c where c.service_request_id = r.id and c.status = 'signed') signed,
            (select count(*)::int from contracts c where c.service_request_id = r.id and c.status = 'pending') pending
       from service_requests r where r.id = $1`,
    [requestId],
  );
  return row;
}

/** Copies an existing contract with a new status inside a rolled-back transaction; returns the PG error. */
async function tryDuplicateContract(contractId: string, status: 'signed' | 'pending') {
  const pool = new Pool({ connectionString: process.env.DATABASE_URL });
  const client = await pool.connect();
  let code = '';
  let constraint = '';
  try {
    await client.query('begin');
    const [{ message_id: messageId }] = (await client.query('select message_id from contracts where id = $1', [contractId])).rows;
    const message = await client.query(
      `insert into messages select (jsonb_populate_record(null::messages, to_jsonb(m) || jsonb_build_object('id', gen_random_uuid()))).* from messages m where id = $1 returning id`,
      [messageId],
    );
    await client.query(
      `insert into contracts select (jsonb_populate_record(null::contracts, to_jsonb(c) || jsonb_build_object('id', gen_random_uuid(), 'message_id', $2::uuid, 'status', $3::text))).* from contracts c where id = $1`,
      [contractId, message.rows[0].id, status],
    );
  } catch (error) {
    code = (error as { code?: string }).code ?? '';
    constraint = (error as { constraint?: string }).constraint ?? '';
  } finally {
    await client.query('rollback');
    client.release();
    await pool.end();
  }
  return { code, constraint };
}

test.beforeAll(async () => {
  // The database the assertions read must be a QA branch, never the live one.
  const [{ id }] = await query<{ id: string | null }>("select current_setting('neon.branch_id', true) as id");
  if (!id || ['br-sparkling-hall-a1dylzla', 'br-still-lake-a123620b'].includes(id)) {
    throw new Error(`Refusing: DATABASE_URL points at a protected branch (${id ?? 'unknown'}).`);
  }
});

const state: { requestA?: string; contractA?: string; requestC?: string; specialistId?: string } = {};

test('@setup synthetic profile pictures, CVs, permits and commercial registration (idempotent)', async ({ browser }) => {
  test.setTimeout(180_000);
  const org = await login(browser, ORG);
  const orgProfile = await (await org.request.get('/api/organization/profile')).json();
  if (!orgProfile.profileImageId) {
    const logo = await upload(org, 'profile_image', 'qa-organization-logo.png', 'image/png', await syntheticPng(org, 'Ecovia QA<br>Organization', '#0f766e'));
    const patch = await org.request.patch('/api/organization/profile', { data: { profileImageId: logo } });
    expect(patch.status()).toBe(200);
  }
  if ((await ownDocCount(ORG, 'commercial_registration')) === 0) {
    await upload(org, 'commercial_registration', 'qa-synthetic-commercial-registration.pdf', 'application/pdf',
      await syntheticPdf(org, 'Commercial registration — SYNTHETIC', ['Organization: Ecovia QA Organization', 'CR number: 7999000001 (synthetic)']));
  }

  for (const [email, label, color, region] of [
    [SPEC, 'Ecovia QA<br>Specialist', '#1d4ed8', 'riyadh'],
    [OBS, 'Ecovia QA<br>Observer', '#7c3aed', 'eastern'],
  ] as const) {
    const page = await login(browser, email);
    const profile = await (await page.request.get('/api/specialist/profile')).json();
    const photo = profile.profilePicId
      ? 'keep'
      : await upload(page, 'profile_image', `qa-${region}-photo.png`, 'image/png', await syntheticPng(page, label, color));
    const resume = profile.resumeFileId
      ? 'keep'
      : await upload(page, 'resume', `qa-${region}-cv.pdf`, 'application/pdf',
          await syntheticPdf(page, `Curriculum vitae — ${profile.fullName}`, [
            'Competencies (synthetic): environmental activity classification, environmental management plans, impact assessment.',
            'Experience and qualifications on this page are invented for testing.',
          ]));
    const patch = await page.request.patch('/api/specialist/profile', {
      data: {
        fullName: profile.fullName, email: profile.email ?? '', phone: profile.phone, edu: profile.edu ?? '', city: profile.city ?? '',
        years: String(profile.years ?? ''), exp: profile.exp ?? '', portfolio: '', region, profileImageId: photo, resumeDocumentId: resume,
      },
    });
    expect(patch.status()).toBe(200);
    if ((await ownDocCount(email, 'license')) === 0) {
      await upload(page, 'license', `qa-${region}-synthetic-permit.pdf`, 'application/pdf',
        await syntheticPdf(page, 'Professional permit — SYNTHETIC', [`Holder: ${profile.fullName}`, `Number: ${profile.license} (synthetic)`]));
    }
  }
});

test('@auth each account: login, role, dashboard, allowed and forbidden areas, logout, re-login', async ({ browser }) => {
  test.setTimeout(240_000);
  // Organization
  let org = await login(browser, ORG);
  await expect(org).toHaveURL(/\/organization$/);
  await expect(org.getByTestId('account-switcher')).toHaveCount(0);
  for (const path of ['/organization/requests', '/organization/specialists', '/organization/profile', '/organization/messages']) {
    expect((await org.goto(path))?.status(), path).toBe(200);
    await expect(org).toHaveURL(new RegExp(path.replace(/\//g, '\\/')));
  }
  await org.goto('/specialist');
  await expect(org).toHaveURL(/\/organization$/);
  expect((await org.request.get('/api/specialist/profile')).status()).toBe(403);
  expect((await org.request.get('/api/admin/accounts')).status()).toBe(403);
  const orgName = (await (await org.request.get('/api/organization/profile')).json()).orgName;
  await org.getByRole('button', { name: 'تسجيل الخروج' }).click();
  await expect(org).toHaveURL(/\/$/);
  expect((await org.request.get('/api/organization/profile')).status()).toBe(401);
  org = await login(browser, ORG);
  expect((await (await org.request.get('/api/organization/profile')).json()).orgName).toBe(orgName);

  // Specialist and observer
  for (const email of [SPEC, OBS]) {
    let page = await login(browser, email);
    await expect(page).toHaveURL(/\/specialist$/);
    await expect(page.getByTestId('account-switcher')).toHaveCount(0);
    for (const path of ['/specialist/requests', '/specialist/cv', '/specialist/messages', '/specialist/notifications']) {
      expect((await page.goto(path))?.status(), path).toBe(200);
    }
    await page.goto('/organization/requests');
    await expect(page).toHaveURL(/\/specialist$/);
    expect((await page.request.get('/api/organization/profile')).status()).toBe(403);
    expect((await page.request.get('/api/admin/accounts')).status()).toBe(403);
    expect((await page.request.get('/api/notifications/unread-count')).status()).toBe(200);
    const fullName = (await (await page.request.get('/api/specialist/profile')).json()).fullName;
    await page.getByRole('button', { name: 'تسجيل الخروج' }).click();
    await expect(page).toHaveURL(/\/$/);
    expect((await page.request.get('/api/specialist/profile')).status()).toBe(401);
    page = await login(browser, email);
    expect((await (await page.request.get('/api/specialist/profile')).json()).fullName).toBe(fullName);
  }
});

test('@scenario A: profile edit → public request → offer → selection → contract → signature', async ({ browser }) => {
  test.setTimeout(300_000);
  const org = await login(browser, ORG);
  await org.goto('/organization/profile');
  const description = `حساب اختبار (QA) — بيانات اصطناعية. منشأة تجريبية في منطقة الرياض. آخر تعديل اختباري: ${new Date().toISOString()}`;
  await org.getByLabel('نبذة عن المنشأة').fill(description);
  await org.getByRole('button', { name: 'حفظ ملف المنشأة' }).click();
  await expect(org.getByText('تم حفظ ملف المنشأة.')).toBeVisible();
  const [{ org_desc: savedDesc }] = await query<{ org_desc: string }>(
    `select o.org_desc from organizations o join "user" u on u.id = o.user_id where u.email = $1`, [ORG]);
  expect(savedDesc).toBe(description);

  const activity = `QA سيناريو أ — طلب عام ${Date.now()}`;
  const requestId = await publishRequest(org, activity);
  state.requestA = requestId;
  const notified = await query<{ email: string }>(
    `select u.email from notifications n join "user" u on u.id = n.recipient_user_id where n.related_id = $1 and n.type = 'request.published'`,
    [requestId],
  );
  expect(notified.map((row) => row.email)).toContain(SPEC); // Riyadh
  expect(notified.map((row) => row.email)).not.toContain(OBS); // Eastern

  const spec = await login(browser, SPEC);
  await spec.goto('/specialist/requests?region=riyadh');
  await expect(spec.getByLabel('تصفية حسب المنطقة')).toHaveValue('riyadh');
  await spec.getByRole('link', { name: /خدمة تصنيف النشاط البيئي/ }).filter({ hasText: activity }).click();
  await expect(spec).toHaveURL(new RegExp(`/specialist/requests/${requestId}$`));
  await offer(spec, requestId, '3');

  await prepareContract(org, requestId, '3 أسابيع');
  expect(await requestState(requestId)).toEqual({ status: 'pending', signed: 0, pending: 1 }); // still open
  await sign(spec, requestId);
  expect(await requestState(requestId)).toEqual({ status: 'accepted', signed: 1, pending: 0 });

  const [contract] = await query<{ id: string }>(`select id from contracts where service_request_id = $1 and status = 'signed'`, [requestId]);
  state.contractA = contract.id;
  await org.goto(`/organization/requests/${requestId}`);
  await org.getByTestId('view-contract').click();
  await expect(org.getByText('عقد تقديم خدمة بيئية')).toBeVisible();
  await expect(org.getByTestId('contract-draft-banner')).toHaveCount(0);
  expect((await org.goto(`/contracts/${contract.id}`))?.status()).toBe(200);
  expect((await spec.goto(`/contracts/${contract.id}`))?.status()).toBe(200);
});

test('@scenario C: a private request reaches only the addressed specialist', async ({ browser }) => {
  test.setTimeout(180_000);
  const [target] = await query<{ id: string }>(`select s.id from specialists s join "user" u on u.id = s.user_id where u.email = $1`, [SPEC]);
  state.specialistId = target.id;
  const org = await login(browser, ORG);
  const requestId = await publishRequest(org, `QA سيناريو ج — طلب خاص ${Date.now()}`, { specialistId: target.id });
  state.requestC = requestId;

  const spec = await login(browser, SPEC);
  expect((await spec.goto(`/specialist/requests/${requestId}`))?.status()).toBe(200);
  await expect(spec.getByText(/طلب خاص موجّه إليك وحدك/)).toBeVisible();
  expect((await spec.request.get(`/api/service-requests/${requestId}`)).status()).toBe(200);

  const obs = await login(browser, OBS);
  expect((await obs.goto(`/specialist/requests/${requestId}`))?.status()).toBe(404);
  expect((await obs.request.get(`/api/service-requests/${requestId}`)).status()).toBe(404);
  const list = await (await obs.request.get('/api/service-requests?as=spec')).text();
  expect(list).not.toContain(requestId);
  const [{ n }] = await query<{ n: number }>(
    `select count(*)::int n from notifications n join "user" u on u.id = n.recipient_user_id where u.email = $1 and n.related_id = $2`,
    [OBS, requestId],
  );
  expect(n).toBe(0);
  const anon = await anonymous(browser);
  expect((await anon.request.get(`/api/service-requests/${requestId}`)).status()).toBe(401);
});

test('@scenario D: CV, chat, attachments, contracts, notifications, switching, id substitution', async ({ browser }) => {
  test.setTimeout(240_000);
  const docs = await query<{ email: string; kind: string; id: string }>(
    `select u.email, 'license' kind, s.license_document_id id from specialists s join "user" u on u.id = s.user_id where u.email in ($1, $2)
     union all select u.email, 'cr', o.cr_document_id from organizations o join "user" u on u.id = o.user_id where u.email = $3`,
    [SPEC, OBS, ORG],
  );
  const doc = (email: string, kind: string) => docs.find((row) => row.email === email && row.kind === kind)?.id;
  const specPermit = doc(SPEC, 'license');
  const orgCr = doc(ORG, 'cr');
  expect(specPermit, 'run `npm run db:seed:qa` after @setup to link the synthetic permit').toBeTruthy();
  expect(orgCr, 'run `npm run db:seed:qa` after @setup to link the synthetic CR').toBeTruthy();

  const org = await login(browser, ORG);
  const spec = await login(browser, SPEC);
  const obs = await login(browser, OBS);
  const anon = await anonymous(browser);

  // CV: the facility may read the specialist CV; specialists may not read each other's.
  expect((await org.request.get(`/api/directory?kind=specialists&id=${state.specialistId}`)).status()).toBe(200);
  expect([403, 404]).toContain((await obs.request.get(`/api/directory?kind=specialists&id=${state.specialistId}`)).status());

  // Attachments: relationship (offer/contract) grants access; no relationship → refused; anonymous → 401.
  expect((await org.request.get(`/api/files/${specPermit}`)).status()).toBe(200);
  expect((await spec.request.get(`/api/files/${orgCr}`)).status()).toBe(200);
  expect([403, 404]).toContain((await obs.request.get(`/api/files/${specPermit}`)).status());
  // The observer may see the facility's CR only once it has a business relationship (e.g. an offer in
  // scenario B on an earlier run); without one it is refused.
  const [{ related }] = await query<{ related: boolean }>(
    `select exists (select 1 from service_request_offers f join service_requests r on r.id = f.service_request_id
                      join organizations o on o.id = r.organization_id join "user" ou on ou.id = o.user_id
                      join specialists s on s.id = f.specialist_id join "user" su on su.id = s.user_id
                     where ou.email = $1 and su.email = $2) related`,
    [ORG, OBS],
  );
  const observerCr = (await obs.request.get(`/api/files/${orgCr}`)).status();
  if (related) expect(observerCr).toBe(200);
  else expect([403, 404]).toContain(observerCr);
  expect((await anon.request.get(`/api/files/${orgCr}`)).status()).toBe(401);

  // Chat: the observer cannot read the facility ↔ specialist conversation.
  const conversations = await (await spec.request.get('/api/chat/conversations')).json();
  const chatId = (conversations as { chatId: string }[])[0]?.chatId;
  expect(chatId).toBeTruthy();
  expect((await spec.request.get(`/api/chat/messages?chatId=${chatId}`)).status()).toBe(200);
  expect([403, 404]).toContain((await obs.request.get(`/api/chat/messages?chatId=${chatId}`)).status());
  expect(JSON.stringify(await (await obs.request.get('/api/chat/conversations')).json())).not.toContain(chatId);

  // Signed contract: both parties yes, observer no, anonymous → login.
  expect((await obs.goto(`/contracts/${state.contractA}`))?.status()).toBe(404);
  await anon.goto(`/contracts/${state.contractA}`);
  await expect(anon).toHaveURL(/\/login/);

  // Notifications belong to their recipient (marking is scoped by recipient in the repository).
  const counts = await query<{ email: string; unread: number }>(
    `select u.email, count(n.id) filter (where not n.is_read)::int unread from "user" u left join notifications n on n.recipient_user_id = u.id
      where u.email in ($1, $2) group by u.email`,
    [SPEC, OBS],
  );
  for (const [email, page] of [[SPEC, spec], [OBS, obs]] as const) {
    const api = (await (await page.request.get('/api/notifications/unread-count')).json()) as { count: number };
    expect(api.count).toBe(counts.find((row) => row.email === email)!.unread);
  }

  // Account switching: single-profile accounts have no switcher; a forged cookie grants nothing.
  await spec.context().addCookies([{ name: 'ecovia_active_role', value: 'org', url: test.info().project.use.baseURL! }]);
  await spec.goto('/organization');
  await expect(spec).toHaveURL(/\/specialist$/);

  // Identifier substitution: another party's request / profile ids are refused.
  expect((await obs.request.get(`/api/service-requests/${state.requestC}`)).status()).toBe(404);
  expect([403, 404]).toContain((await obs.request.get(`/api/organization/profile`)).status());
});

test('@scenario B: two independent offers, selection keeps the request open, one signed contract only', async ({ browser }) => {
  test.setTimeout(300_000);
  const org = await login(browser, ORG);
  const activity = `QA سيناريو ب — عروض متعددة ${Date.now()}`;
  const requestId = await publishRequest(org, activity);
  const spec = await login(browser, SPEC);
  const obs = await login(browser, OBS);
  await offer(spec, requestId, '3');
  await offer(obs, requestId, '10', 'day');

  await org.goto(`/organization/requests/${requestId}`);
  await expect(org.getByTestId('offer-card')).toHaveCount(2);
  await prepareContract(org, requestId, '3 أسابيع');
  expect(await requestState(requestId)).toEqual({ status: 'pending', signed: 0, pending: 1 });

  const [pending] = await query<{ id: string }>(`select id from contracts where service_request_id = $1 and status = 'pending'`, [requestId]);
  expect(await tryDuplicateContract(pending.id, 'pending')).toEqual({ code: '23505', constraint: 'contracts_one_pending_per_request' });

  await sign(spec, requestId);
  expect(await requestState(requestId)).toEqual({ status: 'accepted', signed: 1, pending: 0 });
  expect(await tryDuplicateContract(pending.id, 'signed')).toEqual({ code: '23505', constraint: 'contracts_one_signed_per_request' });
  await obs.goto(`/specialist/requests/${requestId}`);
  await expect(obs.getByText('لم يُقبل').first()).toBeVisible();
  await expect(obs.getByRole('button', { name: 'تقديم العرض' })).toHaveCount(0);
});
