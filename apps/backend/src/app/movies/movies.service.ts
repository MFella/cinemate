import { Injectable, NotFoundException } from '@nestjs/common';
import { MoviesListDTO, TransformedTmdbMovie } from '../dtos/movies-list.dto';
import { MoviesUtil } from './movies.util';
import {
  GenEntity,
  TmdbDiscoverResult,
  TmdbMovie,
  TmdbMovieGetListRequestOptions,
} from '../dtos/tmdb-movie';
import { Genres } from '../typings/common';
import { PrismaService } from '../database/prisma.service';
import { Rate } from '../dtos/rate-of-movie';
import {
  CompletedPageOfMovie,
  Genre,
  MovieToRate,
  PageOfMovie,
  Genre as PrismaGenre,
} from '@prisma/client';
import { RateResultDto } from '../dtos/rate-result.dto';
import { PrismaUtil } from '../util/prisma-util';
import { BaseRestDataService } from '../common/base-rest-data.service';

@Injectable()
export class MoviesService {
  private static readonly DEFAULT_PAGE_NUMBER = 1;
  private static readonly DEFAULT_GENRE: Genres = 'Adventure';
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
      data: fetchedGenres.data.genres.map(genreEntity => {
        return {
          id: genreEntity.id,
          name: genreEntity.name,
        };
      }),
    });
  }

  async getMoviesData(
    userId: string,
    shouldLoadNextPage: 0 | 1
  ): Promise<MoviesListDTO> {
    if (shouldLoadNextPage !== 1) {
      const moviesListDtoFromCache = await this.retrieveMovieListDtoFromDb(
        userId
      );

      if (
        moviesListDtoFromCache?.movies?.length &&
        moviesListDtoFromCache?.selectedGenreId !== null &&
        moviesListDtoFromCache?.selectedGenreId !== undefined
      ) {
        return moviesListDtoFromCache;
      }
    }

    // const nonVotedMovieIds = Array.from(
    //   new Set(await this.getNonVotedUserMovieIds(userId))
    // );

    // if (nonVotedMovieIds?.length) {
    //   const moviesFromDb = await this.prismaService.movieToRate.findMany({
    //     where: {
    //       movieId: {
    //         in: nonVotedMovieIds,
    //       },
    //     },
    //   });
    //   const genresOnPage = await this.extractGenresOnPageFromMovies(
    //     moviesFromDb
    //   );

    //   return MoviesUtil.convertMoviesToRateToMoviesListDto(
    //     moviesFromDb,
    //     genresOnPage,
    //     userId,
    //     null
    //   );
    // }

    let { pageNumber, genreId } = await this.getTmdbMovieRequestOptions(
      userId,
      shouldLoadNextPage
    );

    const pageOfMovie = await this.prismaService.pageOfMovie.findFirst({
      where: {
        genreId,
        pageNumber,
      },
    });

    if (pageOfMovie && Object.keys(pageOfMovie).length) {
      const isPageAlreadyCompleted =
        (await this.prismaService.completedPageOfMovie.count({
          where: {
            pageOfMovieId: pageOfMovie.id,
          },
        })) !== 0;

      if (isPageAlreadyCompleted) {
        pageNumber++;
      } else {
        const moviesListDtoFromCache = await this.retrieveMovieListDtoFromDb(
          userId,
          pageOfMovie
        );

        if (
          moviesListDtoFromCache?.movies?.length &&
          moviesListDtoFromCache?.selectedGenreId !== null &&
          moviesListDtoFromCache?.selectedGenreId !== undefined
        ) {
          return moviesListDtoFromCache;
        } else {
          // mark page as completed
          await this.prismaService.completedPageOfMovie.create({
            data: {
              userId,
              pageOfMovieId: pageOfMovie.id,
            },
          });

          pageNumber++;
        }
      }
    }

    const response = await this.baseRestDataService.get<TmdbDiscoverResult>(
      'movies',
      {
        genreId,
        pageNumber,
      }
    );

    if (response.data && !pageOfMovie) {
      const pageGenre = await this.extractGenreById(genreId);
      const genresOnPage = await this.extractGenresOnPageFromMovies(
        response.data.results
      );
      const moviesListDto = MoviesUtil.convertTmdbMoviesToMoviesListDto(
        response.data.results,
        genresOnPage,
        pageGenre.id,
        pageNumber
      );
      await this.saveMovieListDto(moviesListDto, userId, pageNumber);
      return moviesListDto;
    } else if (pageOfMovie) {
      const moviesOnPage = await this.prismaService.movieToRate.findMany({
        where: {
          movieId: {
            in: pageOfMovie.movieIds,
          },
        },
      });
      const genresOnPage = await this.extractGenresOnPageFromMovies(
        moviesOnPage
      );
      return MoviesUtil.convertMoviesToRateToMoviesListDto(
        moviesOnPage,
        genresOnPage,
        genreId,
        pageNumber
      );
    } else {
      console.error('Received data is undefined');
      return {
        pageGenres: [],
        movies: [],
        selectedGenreId: null,
        pageNumber: -1,
      };
    }
  }

  async getSingleMovieData(movieId: number): Promise<TransformedTmdbMovie> {
    const movieToRateFromDb = await this.prismaService.movieToRate.findFirst({
      where: {
        movieId,
      },
    });

    if (!movieToRateFromDb) {
      throw new NotFoundException(`Movie with id ${movieId} cannot be found`);
    }

    return MoviesUtil.convertMovieToRateToTransformedTmdbMovie(
      movieToRateFromDb
    );
  }

  async retrieveMovieListDtoFromDb(
    userId: string,
    pageOfMovie?: PageOfMovie
  ): Promise<MoviesListDTO> {
    const userFromDb = await this.prismaService.user.findFirst({
      where: {
        id: userId,
      },
      select: {
        genreId: true,
      },
    });

    const completedPageOfMovies =
      await this.prismaService.completedPageOfMovie.findMany({
        include: {
          pageOfMovie: true,
        },
        where: {
          userId,
          pageOfMovie: {
            genreId: userFromDb.genreId,
          },
        },
      });

    const maxCompletedPageNumber = completedPageOfMovies?.length
      ? Math.max(...completedPageOfMovies.map(c => c.pageOfMovie.pageNumber))
      : 0;
    const currentPageNumber = maxCompletedPageNumber + 1;

    if (!pageOfMovie) {
      pageOfMovie = await this.prismaService.pageOfMovie.findFirst({
        where: {
          genreId: userFromDb.genreId,
          pageNumber: currentPageNumber,
        },
      });
      if (!pageOfMovie) {
        return {
          movies: [],
          selectedGenreId: null,
          pageGenres: [],
          pageNumber: -1,
        };
      }
    }

    const ratedUserMovies = await this.prismaService.rate.findMany({
      where: {
        userId,
      },
      select: {
        movieId: true,
      },
    });

    const ratedUserMovieIds = ratedUserMovies.map(
      ratedUserMovie => ratedUserMovie.movieId
    );
    const nonVotedMovieIds = pageOfMovie.movieIds.filter(
      (movieId: number) => !ratedUserMovieIds.includes(movieId)
    );

    const cachedMovies = await this.prismaService.movieToRate.findMany({
      where: {
        movieId: {
          in: nonVotedMovieIds,
        },
      },
    });

    if (!cachedMovies?.length) {
      return;
    }

    const genresOnPage = await this.extractGenresOnPageFromMovies(cachedMovies);
    return MoviesUtil.convertMoviesToRateToMoviesListDto(
      cachedMovies,
      genresOnPage,
      userFromDb.genreId,
      currentPageNumber
    );
  }

  private async saveMovieListDto(
    moviesListDto: MoviesListDTO,
    userId: string,
    currentPageNumber: number
  ): Promise<void> {
    // prisma work ...
    const userGenre = await this.prismaService.user.findFirst({
      where: {
        id: userId,
      },
      include: {
        genre: true,
      },
    });

    const movieIds = moviesListDto.movies.map(
      movieInListDto => movieInListDto.id
    );

    const areMoviesInDbQuery = [];
    for (let movieId of movieIds) {
      areMoviesInDbQuery.push(
        await this.prismaService.movieToRate.count({
          where: {
            movieId,
          },
        })
      );
    }

    const movieIdToIsExistMap = new Map<number, number>(
      areMoviesInDbQuery.map((isExist, index) => [movieIds[index], isExist])
    );

    const groupedGenreIds = moviesListDto.movies
      .map(movie => movie.genreIds)
      .filter(Boolean)
      .reduce((acc, gen) => acc.concat(gen), []);
    const genresFromDb = await this.prismaService.genre.findMany({
      where: {
        id: {
          in: groupedGenreIds,
        },
      },
    });
    const resultGenres = [
      ...new Map<number, PrismaGenre>(
        genresFromDb.map(g => [g.id, g])
      ).values(),
    ];
    let genreId =
      userGenre?.genreId !== undefined && userGenre?.genreId !== null
        ? userGenre.genreId
        : MoviesService.DEFAULT_GENRE_ID;

    await this.prismaService.pageOfMovie.create({
      data: {
        pageNumber: currentPageNumber,
        genreId,
        movieIds,
      },
    });

    // change schema.prisma
    const movieToRateCreateData = moviesListDto.movies
      .map(movieInListDto => {
        return {
          movieId: movieInListDto.id,
          imageUrl: movieInListDto?.posterPath ?? '',
          releaseDate: movieInListDto.releaseDate,
          title: movieInListDto.title,
          description: movieInListDto.overview,
          rating: movieInListDto.voteAverage,
          genreIds: movieInListDto.genreIds,
        };
      })
      .filter(
        movieInListDto => movieIdToIsExistMap.get(movieInListDto.movieId) === 0
      );

    try {
      await this.prismaService.movieToRate.createMany({
        data: movieToRateCreateData,
      });

      const genresFromDb = await this.prismaService.genre.findMany({
        select: {
          id: true,
        },
      });
      const genresFromDbIds = genresFromDb.map(genreFromDb => genreFromDb.id);
      const newGenres = resultGenres.filter(
        resultGenre => genresFromDbIds.indexOf(resultGenre.id) === -1
      );
      if (newGenres?.length) {
        await this.prismaService.genre.createMany({
          data: newGenres,
        });
      }
    } catch (err) {
      console.log(err);
    }
  }

  async rateMovie(
    movieId: number,
    rate: Rate,
    userId: string
  ): Promise<RateResultDto> {
    const rateFromDb = await this.prismaService.rate.findFirst({
      where: {
        userId,
        movieId,
      },
    });

    if (!rateFromDb) {
      const saveRateResult = await this.prismaService.rate.create({
        data: {
          userId,
          movieId,
          value: PrismaUtil.convertRateToRateValue(rate),
        },
      });

      if (!saveRateResult) {
        return {
          moviesCountLeftOnPage: null,
          isRateSaved: false,
          reason: 'Failed saving rate into database',
        };
      }
    }

    const userGenre = await this.prismaService.user.findFirst({
      where: {
        id: userId,
      },
      include: {
        genre: true,
      },
    });

    let genreId = userGenre?.genreId;

    if (genreId === undefined || genreId === null) {
      // fallback to default
      const defaultGenre = await this.prismaService.genre.findFirst({
        where: {
          name: MoviesService.DEFAULT_GENRE,
        },
      });

      if (!defaultGenre) {
        return {
          moviesCountLeftOnPage: null,
          isRateSaved: false,
          reason: `Cannot retrieve default ${MoviesService.DEFAULT_GENRE} genre from database`,
        };
      }

      genreId = defaultGenre?.id;
    }

    const pageOfMovie = await this.prismaService.pageOfMovie.findFirst({
      where: {
        movieIds: {
          has: movieId,
        },
        genreId,
      },
    });

    const userRates = await this.prismaService.rate.findMany({
      where: {
        userId,
      },
    });

    const userRatesMovieIds = userRates.map(userRate => userRate.movieId);

    const moviesCountLeftOnPage = pageOfMovie.movieIds.filter(
      (movieId: number) => !userRatesMovieIds.includes(movieId)
    )?.length;
    const pageIsNotMarkedAsCompleted =
      (await this.prismaService.completedPageOfMovie.count({
        where: {
          pageOfMovieId: pageOfMovie.id,
        },
      })) === 0;

    if (moviesCountLeftOnPage === 0 && pageIsNotMarkedAsCompleted) {
      // mark page as completed
      await this.prismaService.completedPageOfMovie.create({
        data: {
          pageOfMovieId: pageOfMovie.id,
          userId,
        },
      });
    }

    // finally - save rate
    return {
      moviesCountLeftOnPage,
      isRateSaved: true,
    };
  }

  async markMovieToWatch(
    userId: string,
    movieId: number,
    isWatched: boolean
  ): Promise<boolean> {
    const isMovieWatchedFromDb =
      await this.prismaService.watchedMovie.findFirst({
        where: {
          movieId,
          userId,
        },
      });

    if (isMovieWatchedFromDb && !isWatched) {
      await this.prismaService.watchedMovie.delete({
        where: {
          id: isMovieWatchedFromDb.id,
        },
      });
      return true;
    } else if (!isMovieWatchedFromDb && isWatched) {
      await this.prismaService.watchedMovie.create({
        data: {
          movieId,
          userId,
        },
      });
      return true;
    }

    // shouldnt be reachable
    return false;
  }

  private async extractCachedMovies(
    userId: string,
    genreId: number
  ): Promise<MoviesListDTO> {
    const genreFromDb = await this.prismaService.genre.findFirst({
      where: {
        id: genreId,
      },
    });

    if (!genreFromDb) {
      console.error(`Cannot find genre with id ${genreId}`);
      return;
    }

    const completedPageOfMovies =
      await this.prismaService.completedPageOfMovie.findMany({
        where: {
          userId,
        },
        include: {
          pageOfMovie: true,
        },
      });

    const pageNumber =
      this.getHighestCompletedPageNumber(completedPageOfMovies) + 1;
    const pageOfMovies = await this.prismaService.pageOfMovie.findFirst({
      where: {
        pageNumber,
        genreId,
      },
    });

    if (!pageOfMovies || !pageOfMovies?.movieIds?.length) {
      return {
        movies: [],
        selectedGenreId: genreFromDb.id,
        pageGenres: [],
        pageNumber: -1,
      };
    }

    const cachedMovies: Array<MovieToRate> =
      await this.prismaService.movieToRate.findMany({
        where: {
          movieId: {
            in: pageOfMovies.movieIds,
          },
        },
      });

    if (!cachedMovies?.length) {
      return {
        movies: [],
        selectedGenreId: genreFromDb.id,
        pageGenres: [],
        pageNumber: -1,
      };
    }

    const genresOnPage = await this.extractGenresOnPageFromMovies(cachedMovies);
    return MoviesUtil.convertMoviesToRateToMoviesListDto(
      cachedMovies,
      genresOnPage,
      genreFromDb.id,
      pageNumber
    );
  }

  private getHighestCompletedPageNumber(
    completedPageOfMovies: Array<
      CompletedPageOfMovie & { pageOfMovie: PageOfMovie }
    >
  ): number {
    const mappedFilledPageOfMovies = completedPageOfMovies
      .map(completedPageOfMovie => completedPageOfMovie.pageOfMovie)
      .filter(Boolean);

    if (!completedPageOfMovies?.length || !mappedFilledPageOfMovies?.length) {
      return MoviesService.DEFAULT_PAGE_NUMBER;
    }

    return completedPageOfMovies
      .sort(
        (previousPageOfMovies, currentPageOfMovies) =>
          currentPageOfMovies?.pageOfMovie?.pageNumber -
          previousPageOfMovies?.pageOfMovie?.pageNumber
      )
      .at(0).pageOfMovie.pageNumber;
  }

  private async extractGenreById(userGenreId: number): Promise<Genre> {
    return await this.prismaService.genre.findFirst({
      where: {
        id: userGenreId,
      },
    });
  }

  private async extractGenresOnPageFromMovies(
    movies: Array<TmdbMovie> | Array<MovieToRate>
  ): Promise<Array<Genre>> {
    const pageGenreIds = Array.from(
      new Set(
        movies.reduce(
          (acc: Array<number>, curr: TmdbMovie | MovieToRate) =>
            acc.concat(
              MoviesService.isMovieToRate(curr) ? curr.genreIds : curr.genre_ids
            ),
          []
        )
      )
    );
    return await this.prismaService.genre.findMany({
      where: {
        id: {
          in: pageGenreIds,
        },
      },
    });
  }

  private static isMovieToRate(obj: any): obj is MovieToRate {
    return (
      'id' in obj &&
      'movieId' in obj &&
      'imageUrl' in obj &&
      'releaseDate' in obj &&
      'title' in obj &&
      'description' in obj &&
      'rating' in obj &&
      'genreIds' in obj
    );
  }

  private async getTmdbMovieRequestOptions(
    userId: string,
    shouldLoadNextPage?: 0 | 1
  ): Promise<TmdbMovieGetListRequestOptions> {
    const userGenreFromDb = await this.prismaService.user.findFirst({
      where: {
        id: userId,
      },
      include: {
        genre: true,
      },
    });

    let userGenreId = userGenreFromDb?.genre?.id;

    const userCompletedPages =
      await this.prismaService.completedPageOfMovie.findMany({
        where: {
          userId,
          pageOfMovie: {
            genreId: userGenreId,
          },
        },
        include: {
          pageOfMovie: true,
        },
      });

    let currentPageNumber = MoviesService.DEFAULT_PAGE_NUMBER;
    if (userGenreId !== undefined && userCompletedPages?.length > 0) {
      currentPageNumber =
        Math.max(
          ...userCompletedPages.map(
            userCompletedPage => userCompletedPage.pageOfMovie.pageNumber
          )
        ) + 1;
    }

    currentPageNumber += shouldLoadNextPage;

    return {
      pageNumber: currentPageNumber,
      genreId: userGenreId,
    };
  }
}
