import { expect, test } from '@playwright/test';

test.describe('duplicate registration + demo session reset', () => {
  test('session reset control navigates to home with fresh state', async ({ page }) => {
    await page.goto('/');
    await expect(page.getByTestId('splash-screen')).toBeHidden({ timeout: 10_000 });

    const resetBtn = page.getByTestId('demo-session-reset');
    await expect(resetBtn).toBeVisible();
    await resetBtn.click();

    await expect(page).toHaveURL('/');
  });
});
