import { expect, test } from '@playwright/test';

test.describe('home screen', () => {
  test('renders the ECOVIA landing and hides the splash', async ({ page }) => {
    // 'commit' avoids waiting for the `load` event — the splash itself hides on
    // `load` (with a 2.5s fallback), so asserting visibility after a full load
    // would be racy by construction.
    await page.goto('/', { waitUntil: 'commit' });

    // Splash shows first, then disappears (legacy 2.5s/load fallback).
    await expect(page.getByTestId('splash-screen')).toBeVisible();
    await expect(page.getByTestId('splash-screen')).toBeHidden({ timeout: 8_000 });

    await expect(page.getByRole('heading', { level: 1, name: /بيئة واحدة/ })).toBeVisible();
    await expect(page.getByRole('link', { name: 'تسجيل الدخول' })).toHaveAttribute('href', '/login');
    await expect(page.getByRole('banner').getByRole('link', { name: 'إنشاء حساب' })).toHaveAttribute(
      'href',
      '/choose-role',
    );
    await expect(page.locator('details')).toHaveCount(6);

    // RTL document.
    await expect(page.locator('html')).toHaveAttribute('dir', 'rtl');
    await expect(page.locator('html')).toHaveAttribute('lang', 'ar');
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

  test('role tabs switch panels with the keyboard', async ({ page }) => {
    await page.goto('/');
    await expect(page.getByTestId('splash-screen')).toBeHidden({ timeout: 8_000 });
    const orgTab = page.getByRole('tab', { name: 'للمنشآت' });
    await orgTab.focus();
    await page.keyboard.press('ArrowLeft');
    await expect(page.getByRole('tab', { name: 'للأخصائيين' })).toHaveAttribute('aria-selected', 'true');
    await expect(page.getByRole('tabpanel', { name: 'للأخصائيين' })).toContainText('خبرتك تستحق أن تُرى.');
  });

  test('sign-up leads through role choice to specialist registration', async ({ page }) => {
    await page.goto('/');
    await expect(page.getByTestId('splash-screen')).toBeHidden({ timeout: 8_000 });
    await page.getByRole('banner').getByRole('link', { name: 'إنشاء حساب' }).click();
    await expect(page).toHaveURL(/\/choose-role/);
    await page.getByRole('link', { name: /دخول كأخصائي/ }).click();
    await expect(page).toHaveURL(/\/register\/specialist/);
    await expect(page.getByText('ارفع المستند الشخصي والترخيص')).toBeVisible();
  });

  test('organization card enters the organization registration form', async ({ page }) => {
    await page.goto('/choose-role');
    await expect(page.getByTestId('splash-screen')).toBeHidden({ timeout: 8_000 });
    await page.getByRole('link', { name: /دخول كجهة/ }).click();
    await expect(page).toHaveURL(/\/register\/organization/);
    await expect(page.getByText('إرفاق السجل التجاري')).toBeVisible();
  });
});