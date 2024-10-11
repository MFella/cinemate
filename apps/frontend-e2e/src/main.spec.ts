import { test, expect, Page } from '@playwright/test';
import { CLASS_NAMES, TAG_NAMES } from './_helpers/html-names';

test.describe.configure({ mode: 'serial' });

let page: Page;

test.beforeAll(async ({ browser }) => {
  page = await browser.newPage();
  await page.goto('/');
});

test.afterAll(async () => {
  await page.close();
});

test.describe(
  'Bootstrap test',
  {
    tag: '@unauthorized',
  },
  () => {
    test('should render navbar with two buttons', async () => {
      const expectedNavBarButtonLabel = 'Home';
      const navMatToolbar = await page.locator(
        `.${CLASS_NAMES.MAT_TOOLBAR_ROW}`
      );
      const navBarButtons = await navMatToolbar.locator(
        `.${CLASS_NAMES.MAT_BUTTON_BASE}`
      );

      expect(await navMatToolbar.isVisible()).toEqual(true);
      expect(await navBarButtons.count()).toEqual(2);
      expect(
        await navBarButtons
          .first()
          .locator(`.${CLASS_NAMES.MAT_BUTTON_LABEL}`)
          .innerText()
      ).toContain(expectedNavBarButtonLabel);
    });

    test('should render auth page', async () => {
      const expectedCardTitleText = 'Log Yourself 🌞';
      const expectedLoginButtonLabel = 'Log with Google';
      const appAuthTemplate = await page.locator(`${TAG_NAMES.APP_AUTH}`);
      expect(await appAuthTemplate.isVisible()).toEqual(true);
      expect(
        await appAuthTemplate
          .locator(`.${CLASS_NAMES.MAT_CARD_TITLE}`)
          .innerText()
      ).toContain(expectedCardTitleText);
      expect(
        await appAuthTemplate
          .locator(
            `.${CLASS_NAMES.MAT_CARD_ACTIONS} .${CLASS_NAMES.MAT_BUTTON_LABEL}`
          )
          .innerText()
      ).toEqual(expectedLoginButtonLabel);
    });

    test('should redirect to google auth page, when google log button clicked', async () => {
      // signin, because no user is cached
      const googleOauthUrl = 'https://accounts.google.com/v3/signin/';
      const appAuthTemplate = await page
        .locator(`${TAG_NAMES.APP_AUTH}`)
        .locator('button');

      await appAuthTemplate.click();

      expect(page.url().startsWith(googleOauthUrl)).toEqual(true);
    });

    test('should stay on main page, when trying to redirect', async () => {
      const mainPageUrl = 'http://localhost:4200/';
      await page.goto('/match');
      await page.waitForURL('/');

      expect(page.url()).toEqual(mainPageUrl);

      await page.goto('/preferences');
      await page.waitForURL('/');
      expect(page.url()).toEqual(mainPageUrl);

      await page.goto('/find');
      await page.waitForURL('/');
      expect(page.url()).toEqual(mainPageUrl);
    });
  }
);
