import { expect, test } from '@playwright/test';

test.describe('admin portal (server-side password)', () => {
  test('wrong password shows the legacy error toast', async ({ page }) => {
    await page.goto('/');
    await expect(page.getByTestId('splash-screen')).toBeHidden({ timeout: 8_000 });

    await page.getByRole('button', { name: /بوابة الإدارة/ }).click();
    const dialog = page.getByRole('dialog');
    await expect(dialog).toBeVisible();

    await dialog.getByLabel('رمز الدخول').fill('0000');
    await dialog.getByRole('button', { name: 'دخول' }).click();

    await expect(page.getByText('رمز الدخول غير صحيح!')).toBeVisible();
    await expect(page).toHaveURL('/');
  });

  test('correct password validates server-side and opens the admin dashboard', async ({
    page,
  }) => {
    // ADMIN_PASSWORD=1234 from .env.local, validated by /api/admin/login.
    await page.goto('/');
    await expect(page.getByTestId('splash-screen')).toBeHidden({ timeout: 8_000 });

    await page.getByRole('button', { name: /بوابة الإدارة/ }).click();
    const dialog = page.getByRole('dialog');
    await dialog.getByLabel('رمز الدخول').fill('1234');
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