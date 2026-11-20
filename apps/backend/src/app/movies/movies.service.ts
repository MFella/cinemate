import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { Genre, PageOfMovie } from '@prisma/client';
import { MoviesListDTO, TransformedTmdbMovie } from '../dtos/movies-list.dto';
import { MoviesUtil } from './movies.util';
import {
  GenEntity,
  TmdbDiscoverResult,
  TmdbMovieGetListRequestOptions,
} from '../dtos/tmdb-movie';
import { PrismaService } from '../database/prisma.service';
import { Rate } from '../dtos/rate-of-movie';
import { RateResultDto } from '../dtos/rate-result.dto';
import { PrismaUtil } from '../util/prisma-util';
import { BaseRestDataService } from '../common/base-rest-data.service';

@Injectable()
export class MoviesService {
  private static readonly DEFAULT_PAGE_NUMBER = 1;
  private static readonly DEFAULT_GENRE_ID = 4;

  constructor(
    private readonly baseRestDataService: BaseRestDataService,
    private readonly prismaService: PrismaService
  ) {}

  async fetchAndSaveGenres(): Promise<boolean> {
    const genresFromDb = await this.prismaService.genre.findMany();
    if (genresFromDb?.length) {
      return true;
    }

    const fetchedGenres = await this.baseRestDataService.get<
      Record<'genres', Array<GenEntity>>
    >('genres', {});

    await this.prismaService.genre.createMany({
      data: fetchedGenres.data.genres.map(({ id, name }) => ({ id, name })),
    });
  }

  /**
   * Movies the user should rate now. The feed works in pages (of one genre each):
   * 1. the page the user is on, if it still has unrated movies;
   * 2. otherwise the next page, from the database when somebody already fetched it,
   *    from TMDB when nobody did.
   * `shouldLoadNextPage` skips the cached page and asks for the one after it.
   */
  async getMoviesData(
    userId: string,
    shouldLoadNextPage: 0 | 1
  ): Promise<MoviesListDTO> {
    if (shouldLoadNextPage !== 1) {
      const currentPageMovies = await this.retrieveMovieListDtoFromDb(userId);
      if (MoviesService.hasMovies(currentPageMovies)) {
        return currentPageMovies;
      }
    }

    const { genreId, pageNumber } = await this.getTmdbMovieRequestOptions(
      userId,
      shouldLoadNextPage
    );

    // Walk forward over pages that are saved but finished (or empty) for this user
    // until one still has movies for them, or a page nobody has fetched yet.
    for (let page = pageNumber; ; page++) {
      const savedPage = await this.prismaService.pageOfMovie.findFirst({
        where: { genreId, pageNumber: page },
      });

      if (!savedPage) {
        return this.fetchAndSavePage(genreId, page);
      }

      const pageMovies = await this.getUnfinishedSavedPage(userId, savedPage);
      if (pageMovies) {
        return pageMovies;
      }
    }
  }

  async getSingleMovieData(movieId: number): Promise<TransformedTmdbMovie> {
    const movieToRateFromDb = await this.prismaService.movieToRate.findFirst({
      where: { movieId },
    });

    if (!movieToRateFromDb) {
      throw new NotFoundException(`Movie with id ${movieId} cannot be found`);
    }

    return MoviesUtil.convertMovieToRateToTransformedTmdbMovie(
      movieToRateFromDb
    );
  }

  /** Unrated movies of the user's current page (or of `pageOfMovie` when given). */
  async retrieveMovieListDtoFromDb(
    userId: string,
    pageOfMovie?: PageOfMovie
  ): Promise<MoviesListDTO> {
    // a page of a known genre is read from that genre; otherwise the feed decides
    const feedGenreId =
      pageOfMovie?.genreId ?? (await this.getFeedGenreId(userId));
    const currentPageNumber = await this.getCurrentPageNumber(
      userId,
      feedGenreId
    );

    if (!pageOfMovie) {
      pageOfMovie = await this.prismaService.pageOfMovie.findFirst({
        where: { genreId: feedGenreId, pageNumber: currentPageNumber },
      });
      if (!pageOfMovie) {
        return MoviesService.emptyMoviesList();
      }
    }

    const ratedMovieIds = await this.getRatedMovieIds(userId);
    const unratedMovieIds = pageOfMovie.movieIds.filter(
      movieId => !ratedMovieIds.includes(movieId)
    );

    const cachedMovies = await this.prismaService.movieToRate.findMany({
      where: { movieId: { in: unratedMovieIds } },
    });

    if (!cachedMovies?.length) {
      return;
    }

    return MoviesUtil.convertMoviesToRateToMoviesListDto(
      cachedMovies,
      await this.getGenres(cachedMovies.flatMap(movie => movie.genreIds)),
      feedGenreId,
      currentPageNumber
    );
  }

  async rateMovie(
    movieId: number,
    rate: Rate,
    userId: string
  ): Promise<RateResultDto> {
    // One rate per user and movie: voting again changes the vote instead of adding a duplicate.
    const rateValue = PrismaUtil.convertRateToRateValue(rate);
    const saveRateResult = await this.prismaService.rate.upsert({
      where: {
        userMovieRate: { userId, movieId },
      },
      create: { userId, movieId, value: rateValue },
      update: { value: rateValue },
    });

    if (!saveRateResult) {
      return {
        moviesCountLeftOnPage: null,
        isRateSaved: false,
        reason: 'Failed saving rate into database',
      };
    }

    // the page this movie was shown on (one of the user's genres)
    const pageOfMovie = await this.prismaService.pageOfMovie.findFirst({
      where: {
        movieIds: { has: movieId },
        genreId: { in: await this.getPreferredGenreIds(userId) },
      },
    });

    if (!pageOfMovie) {
      // rate is saved, but the movie is not on any known page of the user's genres
      return { moviesCountLeftOnPage: null, isRateSaved: true };
    }

    const ratedMovieIds = await this.getRatedMovieIds(userId);
    const moviesCountLeftOnPage = pageOfMovie.movieIds.filter(
      id => !ratedMovieIds.includes(id)
    ).length;

    if (moviesCountLeftOnPage === 0) {
      await this.markPageAsCompletedByUser(userId, pageOfMovie.id);
    }

    return { moviesCountLeftOnPage, isRateSaved: true };
  }

  /** Returns false when the movie was already in the requested state. */
  async markMovieToWatch(
    userId: string,
    movieId: number,
    isWatched: boolean
  ): Promise<boolean> {
    const watchedMovie = await this.prismaService.watchedMovie.findFirst({
      where: { movieId, userId },
    });

    if (watchedMovie && !isWatched) {
      await this.prismaService.watchedMovie.delete({
        where: { id: watchedMovie.id },
      });
      return true;
    }

    if (!watchedMovie && isWatched) {
      await this.prismaService.watchedMovie.create({
        data: { movieId, userId },
      });
      return true;
    }

    return false;
  }

  /**
   * Genre the feed serves next: the preferred genre with the fewest pages this user
   * has completed (ties: lowest id). Completions change only when a page is finished,
   * so the user stays on one genre until the current page is done.
   */
  async getFeedGenreId(userId: string): Promise<number> {
    const preferredGenreIds = await this.getPreferredGenreIds(userId);

    let feedGenreId = preferredGenreIds[0];
    let fewestCompleted = Infinity;
    for (const genreId of preferredGenreIds) {
      const completedCount =
        await this.prismaService.completedPageOfMovie.count({
          where: { userId, pageOfMovie: { genreId } },
        });
      if (completedCount < fewestCompleted) {
        fewestCompleted = completedCount;
        feedGenreId = genreId;
      }
    }

    return feedGenreId;
  }

  private static emptyMoviesList(): MoviesListDTO {
    return {
      movies: [],
      selectedGenreId: null,
      pageGenres: [],
      pageNumber: -1,
    };
  }

  private static hasMovies(moviesList?: MoviesListDTO): boolean {
    return (
      !!moviesList?.movies?.length &&
      moviesList.selectedGenreId !== null &&
      moviesList.selectedGenreId !== undefined
    );
  }

  /**
   * A page already saved in the database: its unrated movies for this user, or
   * nothing when the user has no movie left on it (the page is then marked completed).
   */
  private async getUnfinishedSavedPage(
    userId: string,
    savedPage: PageOfMovie
  ): Promise<MoviesListDTO | null> {
    if (await this.isPageCompletedByUser(userId, savedPage.id)) {
      return null;
    }

    const pageMovies = await this.retrieveMovieListDtoFromDb(userId, savedPage);
    if (MoviesService.hasMovies(pageMovies)) {
      return pageMovies;
    }

    await this.markPageAsCompletedByUser(userId, savedPage.id);
    return null;
  }

  /** Fetches a page nobody has seen yet from TMDB and saves it for everyone. */
  private async fetchAndSavePage(
    genreId: number,
    pageNumber: number
  ): Promise<MoviesListDTO> {
    const response = await this.baseRestDataService.get<TmdbDiscoverResult>(
      'movies',
      { genreId, pageNumber }
    );

    if (!response.data) {
      Logger.error('Received data from TMDB is undefined', MoviesService.name);
      return MoviesService.emptyMoviesList();
    }

    const tmdbMovies = response.data.results;
    const moviesList = MoviesUtil.convertTmdbMoviesToMoviesListDto(
      tmdbMovies,
      await this.getGenres(tmdbMovies.flatMap(movie => movie.genre_ids ?? [])),
      genreId,
      pageNumber
    );
    await this.savePage(moviesList, genreId, pageNumber);
    return moviesList;
  }

  /** Saves a page and the movies on it (movies already known are kept as they are). */
  private async savePage(
    moviesList: MoviesListDTO,
    genreId: number,
    pageNumber: number
  ): Promise<void> {
    const movieIds = moviesList.movies.map(movie => movie.id);

    await this.prismaService.pageOfMovie.create({
      data: { pageNumber, genreId, movieIds },
    });

    const knownMovieIds = new Set(
      (
        await this.prismaService.movieToRate.findMany({
          where: { movieId: { in: movieIds } },
        })
      ).map(knownMovie => knownMovie.movieId)
    );

    try {
      await this.prismaService.movieToRate.createMany({
        data: moviesList.movies
          .filter(movie => !knownMovieIds.has(movie.id))
          .map(movie => ({
            movieId: movie.id,
            imageUrl: movie.posterPath ?? '',
            releaseDate: movie.releaseDate,
            title: movie.title,
            description: movie.overview,
            rating: movie.voteAverage,
            genreIds: movie.genreIds,
          })),
      });
    } catch (error) {
      Logger.error(error, MoviesService.name);
    }
  }

  private async isPageCompletedByUser(
    userId: string,
    pageOfMovieId: string
  ): Promise<boolean> {
    return (
      (await this.prismaService.completedPageOfMovie.count({
        where: { userId, pageOfMovieId },
      })) !== 0
    );
  }

  private async markPageAsCompletedByUser(
    userId: string,
    pageOfMovieId: string
  ): Promise<void> {
    await this.prismaService.completedPageOfMovie.upsert({
      where: { userCompletedPage: { userId, pageOfMovieId } },
      create: { userId, pageOfMovieId },
      update: {},
    });
  }

  private async getRatedMovieIds(userId: string): Promise<Array<number>> {
    const rates = await this.prismaService.rate.findMany({
      where: { userId },
      select: { movieId: true },
    });
    return rates.map(rate => rate.movieId);
  }

  private async getGenres(genreIds: Array<number>): Promise<Array<Genre>> {
    return this.prismaService.genre.findMany({
      where: { id: { in: Array.from(new Set(genreIds)) } },
    });
  }

  private async getPreferredGenreIds(userId: string): Promise<Array<number>> {
    const userGenres = await this.prismaService.userGenre.findMany({
      where: { userId },
    });

    return userGenres.length
      ? userGenres.map(userGenre => userGenre.genreId).sort((a, b) => a - b)
      : [MoviesService.DEFAULT_GENRE_ID];
  }

  /** Page the user is on in a genre: the one after the last page they completed. */
  private async getCurrentPageNumber(
    userId: string,
    genreId: number
  ): Promise<number> {
    const completedPages =
      await this.prismaService.completedPageOfMovie.findMany({
        where: { userId, pageOfMovie: { genreId } },
        include: { pageOfMovie: true },
      });

    return completedPages.length
      ? Math.max(...completedPages.map(c => c.pageOfMovie.pageNumber)) + 1
      : MoviesService.DEFAULT_PAGE_NUMBER;
  }

  private async getTmdbMovieRequestOptions(
    userId: string,
    shouldLoadNextPage?: 0 | 1
  ): Promise<TmdbMovieGetListRequestOptions> {
    const genreId = await this.getFeedGenreId(userId);

    return {
      pageNumber:
        (await this.getCurrentPageNumber(userId, genreId)) +
        (shouldLoadNextPage ?? 0),
      genreId,
    };
  }
}
