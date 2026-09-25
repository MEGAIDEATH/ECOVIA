import { expect, test, type Page } from '@playwright/test';

/**
 * Public pages must not touch the admin API nor initialize the admin
 * dashboard. The admin error reported by users ("خدمة البيانات غير مهيأة
 * حالياً." with an AdminDashboard stack) must never appear while using the
 * public registration flows.
 */

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

function expectNoAdminActivity(evidence: FlowEvidence): void {
  expect(evidence.adminRequests).toEqual([]);
  expect(evidence.pageErrors).toEqual([]);
  expect(
    evidence.consoleErrors.filter(
      (text) => text.includes('خدمة البيانات غير مهيأة') || text.includes('[admin]'),
    ),
  ).toEqual([]);
}

test.describe('public flow isolation', () => {
  test('home → specialist registration never touches /api/admin or the admin dashboard', async ({
    page,
  }) => {
    const evidence = watch(page);

    await page.goto('/');
    await expect(page.getByTestId('splash-screen')).toBeHidden({ timeout: 8_000 });

    await page.getByRole('link', { name: /دخول كأخصائي/ }).click();
    await expect(page).toHaveURL(/\/register\/specialist\/step-1/);
    await expect(page.getByText('القارئ الآلي للبيانات')).toBeVisible();

    await page.getByLabel('الاسم الثلاثي').fill('خالد سعيد عبدالله');
    await page.getByLabel('رقم الهوية').fill('1098765432');
    await page.getByLabel('البريد الإلكتروني').fill('khaled@example.com');
    await page.getByLabel('رقم الجوال').fill('0512345678');
    await page.getByRole('button', { name: /المتابعة/ }).click();
    await expect(page).toHaveURL(/\/register\/specialist\/step-2/);
    await expect(page.getByText('ارفع الترخيص البيئي')).toBeVisible();

    expectNoAdminActivity(evidence);
    // OCR/PDF engines stay lazy until a scan actually starts.
    expect(
      evidence.consoleErrors.filter((text) => /pdf|tesseract|worker/i.test(text)),
    ).toEqual([]);
  });

  test('home → organization registration never touches /api/admin or the admin dashboard', async ({
    page,
  }) => {
    const evidence = watch(page);

    await page.goto('/');
    await expect(page.getByTestId('splash-screen')).toBeHidden({ timeout: 8_000 });

    await page.getByRole('link', { name: /دخول كجهة/ }).click();
    await expect(page).toHaveURL(/\/register\/organization/);

    await page.getByLabel('رقم السجل التجاري').fill('1010123456');
    await page.getByRole('button', { name: 'جلب' }).click();
    await expect(page.getByLabel('اسم المنشأة')).toHaveValue(
      'شركة التقنية البيئية المحدودة',
    );
    await page.getByLabel('رقم التواصل').fill('0512345678');
    await page.getByLabel('نبذة عن الجهة').fill('شركة متخصصة في الاستشارات البيئية.');
    await page.getByRole('button', { name: /المتابعة للتحقق/ }).click();
    await expect(page).toHaveURL(/\/register\/organization\/verify/);

    expectNoAdminActivity(evidence);
  });

  test('/admin is the place where admin endpoints are used', async ({ page }) => {
    const evidence = watch(page);

    await page.goto('/admin');
    await expect(page.getByText('دخول الإدارة')).toBeVisible();

    await page.getByLabel('رمز الدخول').fill('1234');
    await page.getByRole('button', { name: 'دخول' }).click();

    await expect
      .poll(() => evidence.adminRequests.filter((url) => url.includes('/api/admin/accounts')).length)
      .toBeGreaterThan(0);
    await expect(page.getByText('بوابة الإدارة والتحكم')).toBeVisible();
  });
});
