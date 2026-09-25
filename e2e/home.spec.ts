import { expect, test } from '@playwright/test';

test.describe('home screen', () => {
  test('renders the Arabic landing with role cards and hides the splash', async ({ page }) => {
    // 'commit' avoids waiting for the `load` event — the splash itself hides on
    // `load` (with a 2.5s fallback), so asserting visibility after a full load
    // would be racy by construction.
    await page.goto('/', { waitUntil: 'commit' });

    // Splash shows first, then disappears (legacy 2.5s/load fallback).
    await expect(page.getByTestId('splash-screen')).toBeVisible();
    await expect(page.getByTestId('splash-screen')).toBeHidden({ timeout: 8_000 });

    await expect(page.getByRole('heading', { name: 'منصة بيئيين' })).toBeVisible();
    await expect(page.getByText('أخصائي بيئي')).toBeVisible();
    await expect(page.getByText('جهة / مؤسسة')).toBeVisible();
    await expect(page.getByRole('button', { name: /الدخول لحسابي/ })).toBeVisible();

    // RTL document.
    await expect(page.locator('html')).toHaveAttribute('dir', 'rtl');
    await expect(page.locator('html')).toHaveAttribute('lang', 'ar');
  });

  test('keeps the AI assistant link to the legacy URL', async ({ page }) => {
    await page.goto('/');
    const assistant = page.getByRole('link', { name: /المساعد الذكي/ });
    await expect(assistant).toHaveAttribute(
      'href',
      'https://oasis-bay-151.faces.site/w8chr2rnnq3e',
    );
  });

  test('privacy and terms modals open and close with Escape', async ({ page }) => {
    await page.goto('/');
    await expect(page.getByTestId('splash-screen')).toBeHidden({ timeout: 8_000 });

    await page.getByRole('button', { name: 'سياسة الخصوصية' }).click();
    await expect(page.getByRole('dialog')).toBeVisible();
    await expect(page.getByRole('dialog')).toContainText('1. مقدمة');
    await page.keyboard.press('Escape');
    await expect(page.getByRole('dialog')).toBeHidden();

    await page.getByRole('button', { name: 'الشروط والأحكام' }).click();
    await expect(page.getByRole('dialog')).toBeVisible();
    await expect(page.getByRole('dialog')).toContainText('2. التعاقد');
    await page.getByRole('button', { name: 'إغلاق النافذة' }).click();
    await expect(page.getByRole('dialog')).toBeHidden();
  });

  test('specialist card enters the registration flow', async ({ page }) => {
    await page.goto('/');
    await expect(page.getByTestId('splash-screen')).toBeHidden({ timeout: 8_000 });
    await page.getByRole('link', { name: /دخول كأخصائي/ }).click();
    await expect(page).toHaveURL(/\/register\/specialist\/step-1/);
    await expect(page.getByText('القارئ الآلي للبيانات')).toBeVisible();
  });

  test('organization card enters the organization registration form', async ({ page }) => {
    await page.goto('/');
    await expect(page.getByTestId('splash-screen')).toBeHidden({ timeout: 8_000 });
    await page.getByRole('link', { name: /دخول كجهة/ }).click();
    await expect(page).toHaveURL(/\/register\/organization/);
    await expect(page.getByText('إرفاق السجل التجاري')).toBeVisible();
  });
});