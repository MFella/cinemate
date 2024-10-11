import { BrowserContext, Page, test, expect } from '@playwright/test';
import {
  mockApiCall,
  setupAuthCookie,
  mockMatchResult,
  mockRateResult,
} from '../_helpers/mocks';
import { CLASS_NAMES, TAG_NAMES } from '../_helpers/html-names';

const setupMatchPage = async (page: Page, context: BrowserContext) => {
  await setupAuthCookie(page, context);
  await mockApiCall(page, 'api/movies?shouldLoadNextPage=0', mockMatchResult);

  await page.goto('/match');
  await page.waitForURL('/match');
};

test.describe(
  'match test',
  {
    tag: '@authorized',
  },
  () => {
    test.beforeEach(async ({ page, context }) => {
      await setupMatchPage(page, context);
    });

    test('should render match page', async ({ page }) => {
      mockApiCall(page, 'api/movies/rate', mockRateResult);
      const appMatchTemplate = await page.locator(`${TAG_NAMES.APP_MATCH}`);
      expect(appMatchTemplate).toHaveCount(1);

      const cardTitleTemplate = await appMatchTemplate.locator(
        TAG_NAMES.MAT_CARD_TITLE
      );
      expect(cardTitleTemplate).toHaveCount(1);
      expect(await cardTitleTemplate.innerHTML()).toContain(
        mockMatchResult.movies[0].title
      );

      const yesButtonTemplate = await page.locator(
        `.${CLASS_NAMES.MATCH_MARK_ACTION_BUTTON_YES}`
      );

      expect(yesButtonTemplate).toHaveCount(1);
      await yesButtonTemplate.click();

      await expect(await cardTitleTemplate.innerHTML()).toContain(
        mockMatchResult.movies[1].title
      );
    });
  }
);
