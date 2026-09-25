import { expect, test } from '@playwright/test';

/**
 * `/admin` must stay usable (and honest) even when the Firebase Admin SDK is
 * intentionally not configured: the accounts endpoint answers 503, the
 * dashboard keeps rendering, shows the inline Arabic error row, and does not
 * produce an unhandled exception or an endless spinner.
 */
test.describe('admin portal with missing Admin SDK configuration', () => {
  test('shows the inline Arabic configuration error instead of crashing', async ({ page }) => {
    const pageErrors: string[] = [];
    page.on('pageerror', (error) => pageErrors.push(error.message));

    const accountsResponsePromise = page.waitForResponse(
      (response) =>
        response.url().includes('/api/admin/accounts') &&
        response.request().method() === 'GET',
    );

    await page.goto('/admin');
    await expect(page.getByText('دخول الإدارة')).toBeVisible();

    await page.getByLabel('رمز الدخول').fill('1234');
    await page.getByRole('button', { name: 'دخول' }).click();

    const accountsResponse = await accountsResponsePromise;
    expect(accountsResponse.status()).toBe(503);

    // The shell stays up, the error is inline, the spinner is gone.
    await expect(page.getByText('بوابة الإدارة والتحكم')).toBeVisible();
    await expect(page.getByText('تعذر تحميل البيانات، حاول مرة أخرى.')).toBeVisible();
    await expect(page.getByText('جاري...')).toBeHidden();
    await expect(page.getByText('لا توجد بيانات.')).toBeHidden();
    expect(pageErrors).toEqual([]);
  });

  test('public routes stay unaffected after the admin error', async ({ page }) => {
    const adminRequests: string[] = [];
    page.on('request', (request) => {
      if (request.url().includes('/api/admin')) adminRequests.push(request.url());
    });

    await page.goto('/admin');
    await page.getByLabel('رمز الدخول').fill('1234');
    await page.getByRole('button', { name: 'دخول' }).click();
    await expect(page.getByText('تعذر تحميل البيانات، حاول مرة أخرى.')).toBeVisible();

    adminRequests.length = 0;
    await page.goto('/');
    await expect(page.getByTestId('splash-screen')).toBeHidden({ timeout: 8_000 });
    await expect(
      page.getByRole('heading', { name: 'منصة بيئيين', level: 2 }),
    ).toBeVisible();

    expect(adminRequests).toEqual([]);
  });
});
