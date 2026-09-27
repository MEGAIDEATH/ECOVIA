import { expect, test } from '@playwright/test';

// Seeded administrator — matches ADMIN_EMAIL / ADMIN_PASSWORD in .env.local.
const ADMIN_EMAIL = process.env.ADMIN_EMAIL ?? 'admin@ecovia.local';
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD ?? 'admin_secure_password_123';

test.describe('admin portal (Better Auth email + password)', () => {
  test('wrong password shows the legacy error toast', async ({ page }) => {
    await page.goto('/');
    await expect(page.getByTestId('splash-screen')).toBeHidden({ timeout: 8_000 });

    await page.getByRole('button', { name: /بوابة الإدارة/ }).click();
    const dialog = page.getByRole('dialog');
    await expect(dialog).toBeVisible();

    await dialog.getByLabel('البريد الإلكتروني').fill(ADMIN_EMAIL);
    await dialog.getByLabel('رمز الدخول').fill('0000');
    await dialog.getByRole('button', { name: 'دخول' }).click();

    await expect(page.getByText('رمز الدخول غير صحيح!')).toBeVisible();
    await expect(page).toHaveURL('/');
  });

  test('correct credentials validate server-side and open the admin dashboard', async ({
    page,
  }) => {
    // Credentials created by `npm run db:seed` and validated by /api/admin/login.
    await page.goto('/');
    await expect(page.getByTestId('splash-screen')).toBeHidden({ timeout: 8_000 });

    await page.getByRole('button', { name: /بوابة الإدارة/ }).click();
    const dialog = page.getByRole('dialog');
    await dialog.getByLabel('البريد الإلكتروني').fill(ADMIN_EMAIL);
    await dialog.getByLabel('رمز الدخول').fill(ADMIN_PASSWORD);
    await dialog.getByRole('button', { name: 'دخول' }).click();

    await expect(page).toHaveURL(/\/admin/);
    await expect(page.getByText('بوابة الإدارة والتحكم')).toBeVisible();
    await expect(page.getByRole('button', { name: /اعتماد الأخصائيين/ })).toBeVisible();
    await expect(page.getByRole('button', { name: /اعتماد المنشآت/ })).toBeVisible();
    await expect(page.getByText('جدول الأخصائيين المسجلين')).toBeVisible();
  });

  test('direct visit to /admin without a session shows the login panel', async ({ page }) => {
    await page.goto('/admin');
    await expect(page.getByRole('button', { name: 'دخول' })).toBeVisible();
    await expect(page.getByText('دخول الإدارة')).toBeVisible();
  });
});