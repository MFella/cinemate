import { test, expect, Page, BrowserContext } from '@playwright/test';
import {
  availableGenEntities,
  mockApiCall,
  mockedCookies,
  mockUserMail,
  noResultFoundMatchResult,
  populatedFoundMatchResult,
  setupAuthCookie,
} from '../_helpers/mocks';
import { CLASS_NAMES, TAG_NAMES } from '../_helpers/html-names';

const setupFindPage = async (page: Page, context: BrowserContext) => {
  await setupAuthCookie(page, context);
  await mockApiCall(page, 'api/user/preferences', availableGenEntities);
  await mockApiCall(page, 'api/user/preference', {
    preference: availableGenEntities[0],
  });
  await mockApiCall(page, 'api/user/emails?startsWith=', ['example@wp.pl']);

  await page.goto('/find');
  await page.waitForURL('/find');
};

const searchForMatchMovies = async (
  page: Page,
  matchMovieResult: typeof populatedFoundMatchResult = populatedFoundMatchResult
) => {
  mockApiCall(
    page,
    `api/user/match?genreId=${availableGenEntities[0].id}&mailOfUsers=&mailOfUsers=${mockUserMail}&pageNumber=0`,
    matchMovieResult
  );
  const findFormTemplate = await page.locator(TAG_NAMES.APP_FIND);
  expect(findFormTemplate).toBeDefined();

  const emailSelectTemplate = await findFormTemplate.locator(
    `.${CLASS_NAMES.MAT_FORM_FIELD}.${CLASS_NAMES.MAIL_OF_USERS}`
  );

  expect(emailSelectTemplate).toBeDefined();

  await emailSelectTemplate.click();

  const firstMailOption = await page
    .locator(`.${CLASS_NAMES.MAT_OPTION}`)
    .first();
  await firstMailOption.click();

  const findButtonTemplate = await findFormTemplate.locator(
    `.${CLASS_NAMES.MAT_BUTTON_LABEL}`
  );

  await findButtonTemplate.click();
};

test.describe(
  'find test',
  {
    tag: '@authorized',
  },
  () => {
    test.beforeEach(async ({ page, context }) => {
      await setupFindPage(page, context);
    });

    test('should render find form', async ({ page }) => {
      const expectedFindButtonLabel = 'Find';
      const expectedSelectedGenreLabel = availableGenEntities[0].name;

      const findFormTemplate = await page.locator(TAG_NAMES.APP_FIND);
      expect(findFormTemplate).toBeDefined();

      const findButtonTemplate = await findFormTemplate.locator(
        `.${CLASS_NAMES.MAT_BUTTON_LABEL}`
      );
      expect(await findButtonTemplate.innerHTML()).toContain(
        expectedFindButtonLabel
      );

      const selectedGenreLabel = await findFormTemplate.locator(
        `.${CLASS_NAMES.MAT_SELECT_MIN_LINE}`
      );
      expect(await selectedGenreLabel.innerHTML()).toContain(
        expectedSelectedGenreLabel
      );
    });

    test('should show "No results found" banner, when search result is empty', async ({
      page,
    }) => {
      mockApiCall(
        page,
        `api/user/match?genreId=${availableGenEntities[0].id}&mailOfUsers=&mailOfUsers=${mockUserMail}&pageNumber=0`,
        noResultFoundMatchResult
      );
      const expectedBannerLabel = 'No results found 😶';
      await searchForMatchMovies(page);

      const foundMovieContainerTemplate = await page.locator(
        `.${CLASS_NAMES.FIND_FOUND_MOVIES_CONTAINER}`
      );
      expect(foundMovieContainerTemplate).toHaveCount(0);
      const noResultsFoundHeaderTemplate = await page.locator(
        `.${CLASS_NAMES.FIND_NO_RESULT_FOUND_HEADER}`
      );

      expect(noResultsFoundHeaderTemplate).toHaveCount(1);
      expect(await noResultsFoundHeaderTemplate.innerHTML()).toContain(
        expectedBannerLabel
      );
    });

    test('should show movies matrix, when search result is not empty', async ({
      page,
    }) => {
      mockApiCall(
        page,
        `api/movies/${populatedFoundMatchResult.matchedRates[0].movie.id}`,
        populatedFoundMatchResult.matchedRates[0].movie
      );
      mockApiCall(page, 'api/movies/mark-watch', {
        isWatched: true,
        movieId: populatedFoundMatchResult.matchedRates[0].movie.id,
      });

      await searchForMatchMovies(page);

      const moviePreviewImgTemplates = await page.locator(
        `img.${CLASS_NAMES.FIND_MOVIE_PREVIEW_IMG}`
      );
      expect(moviePreviewImgTemplates).toHaveCount(
        populatedFoundMatchResult.matchedRates.length
      );

      for (const moviePreviewImgTemplate of await moviePreviewImgTemplates.all()) {
        expect(moviePreviewImgTemplate).toBeVisible();
      }

      await moviePreviewImgTemplates.first().click();
      const appMatchTemplate = await page.locator(`${TAG_NAMES.APP_MATCH}`);
      expect(appMatchTemplate).toBeVisible();

      const movieTitleTemplate = await appMatchTemplate.locator(
        `.${CLASS_NAMES.MAT_CARD_TITLE}`
      );
      expect(movieTitleTemplate).toBeVisible();
      expect(await movieTitleTemplate.innerHTML()).toContain(
        populatedFoundMatchResult.matchedRates[0].movie.title
      );

      const movieDescriptionTemplate = await appMatchTemplate.locator(
        `.${CLASS_NAMES.MAT_CARD_CONTENT}`
      );
      expect(movieDescriptionTemplate).toBeVisible();
      expect(await movieDescriptionTemplate.innerHTML()).toContain(
        populatedFoundMatchResult.matchedRates[0].movie.overview
      );

      const isWatchedTemplate = await appMatchTemplate.locator(
        `.${CLASS_NAMES.MAT_SWITCH}`
      );
      expect(isWatchedTemplate).toHaveCount(1);
      expect(isWatchedTemplate).toHaveClass(/mdc-switch--unselected/);

      await isWatchedTemplate.click();

      expect(isWatchedTemplate).toHaveClass(/mdc-switch--selected/);

      const movieDetailsCloseButtonTemplate = await appMatchTemplate.locator(
        `.${CLASS_NAMES.CLOSE_DIALOG_BUTTON}`
      );
      expect(movieDetailsCloseButtonTemplate).toBeVisible();

      await movieDetailsCloseButtonTemplate.click();

      await expect(appMatchTemplate).toHaveCount(0);

      const goBackButtonTemplate = await page.locator(
        `.${CLASS_NAMES.FIND_MOVIE_GO_BACK_BUTTON}`
      );

      await goBackButtonTemplate.click();

      await expect(moviePreviewImgTemplates).toHaveCount(0);
    });
  }
);
