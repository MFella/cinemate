import { test, expect, Page, BrowserContext } from '@playwright/test';
import {
  availableGenEntities,
  mockApiCall,
  setupAuthCookie,
} from '../_helpers/mocks';
import { CLASS_NAMES, TAG_NAMES } from '../_helpers/html-names';

const setupPreferencesPage = async (page: Page, context: BrowserContext) => {
  await setupAuthCookie(page, context);
  await mockApiCall(page, 'api/user/preference', {
    preference: availableGenEntities[0],
  });
  await mockApiCall(page, 'api/user/preferences', availableGenEntities);

  await page.goto('/preferences');
  await page.waitForURL('/preferences');
};

test.describe(
  'preferences test',
  {
    tag: '@authorized',
  },
  async () => {
    test.beforeEach(async ({ page, context }) => {
      await setupPreferencesPage(page, context);
    });

    test('should render preferences page', async ({ page }) => {
      mockApiCall(page, `api/user/preference`, true);
      const appPreferencesTemplate = await page.locator(
        TAG_NAMES.APP_PREFERENCES
      );
      expect(appPreferencesTemplate).toBeVisible();

      const selectedPreferenceElement = await page.locator(
        `.${CLASS_NAMES.MAT_SELECT_MIN_LINE}`
      );
      expect(await selectedPreferenceElement.innerHTML()).toContain(
        availableGenEntities[0].name
      );

      await selectedPreferenceElement.click();

      const genreOptionElements = await page.locator(
        `.${CLASS_NAMES.MAT_OPTION}`
      );

      expect(genreOptionElements).toHaveCount(availableGenEntities.length);

      await genreOptionElements.nth(1).click();
      await expect(await selectedPreferenceElement.innerHTML()).toContain(
        availableGenEntities[1].name
      );

      const saveButtonElement = await appPreferencesTemplate.locator(
        `.${CLASS_NAMES.MAT_BUTTON_LABEL}`
      );

      await saveButtonElement.click();
    });
  }
);
