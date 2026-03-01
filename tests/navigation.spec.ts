import { test, expect } from '@playwright/test';
import { bypassGate } from './helpers';

test.describe('Navigation', () => {
  test('Desktop nav should be visible on desktop', async ({ page, isMobile }) => {
    test.skip(isMobile, 'Desktop-only assertion');

    await bypassGate(page);
    await page.goto('/menu');

    const desktopNav = page.getByTestId('desktop-nav');
    await expect(desktopNav).toBeVisible();
    await expect(desktopNav.getByRole('link', { name: 'Menu' })).toBeVisible();
    await expect(desktopNav.getByRole('link', { name: 'Szukaj' })).toBeVisible();
    await expect(desktopNav.getByRole('link', { name: 'Zamówienia' })).toBeVisible();
    await expect(desktopNav.getByRole('link', { name: 'Punkty' })).toBeVisible();
    await expect(desktopNav.getByRole('link', { name: 'Profil' })).toBeVisible();
    await expect(page.getByTestId('mobile-nav')).not.toBeVisible();
  });

  test('Mobile nav should be visible on mobile', async ({ page, isMobile }) => {
    test.skip(!isMobile, 'Mobile-only assertion');

    await bypassGate(page);
    await page.goto('/menu');

    const mobileNav = page.getByTestId('mobile-nav');
    await expect(mobileNav).toBeVisible();
    await expect(mobileNav.getByRole('link', { name: 'Menu' })).toBeVisible();
    await expect(mobileNav.getByRole('link', { name: 'Punkty' })).toBeVisible();
    await expect(mobileNav.getByRole('link', { name: 'Zamówienia' })).toBeVisible();
    await expect(mobileNav.getByRole('link', { name: 'Profil' })).toBeVisible();
    await expect(page.getByTestId('desktop-nav')).not.toBeVisible();
  });
});
