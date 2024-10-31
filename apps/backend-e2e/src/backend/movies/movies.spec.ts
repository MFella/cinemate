import request from 'supertest';
import { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { MoviesController } from 'backend/movies/movies.controller';
import { createTestApp, getMockAuthGuard } from '../../mocks/auth.mocks';
import { MoviesService } from '../../../../backend/src/app/movies/movies.service';
import {
  MoviesListDTO,
  TransformedTmdbMovie,
} from 'backend/dtos/movies-list.dto';
import { AuthGuard } from '../../../../backend/src/app/_guards/auth.guard';
import { BaseRestDataService } from '../../../../backend/src/app/common/base-rest-data.service';
import { PrismaService } from '../../../../backend/src/app/database/prisma.service';
import { RateResultDto } from 'backend/dtos/rate-result.dto';
import { Rate, RateOfMovie } from 'backend/dtos/rate-of-movie';
import { MarkMovieToWatchBody } from 'backend/dtos/movie/mark-movie-to-watch.body';

describe('Movies paths test', () => {
  let app: INestApplication;
  let moviesService: MoviesService;

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({
      controllers: [MoviesController],
      providers: [MoviesService, BaseRestDataService, PrismaService],
    })
      .overrideGuard(AuthGuard)
      .useValue(getMockAuthGuard(true))
      .overrideProvider(BaseRestDataService)
      .useValue(null)
      .overrideProvider(PrismaService)
      .useValue(null)
      .compile();

    app = createTestApp(moduleRef);
    moviesService = moduleRef.get(MoviesService);

    await app.init();
  });

  it('/GET should return MoviesListDto', async () => {
    const expectedMoviesListDto: MoviesListDTO = {
      movies: [],
      pageGenres: [],
      selectedGenreId: 4,
      pageNumber: 0,
    };

    const expectedMovieListQuery = {
      shouldLoadNextPage: 0,
    };

    const getMoviesDataSpy = jest
      .spyOn(moviesService, 'getMoviesData')
      .mockResolvedValue(expectedMoviesListDto);

    return await request(app.getHttpServer())
      .get('/api/movies')
      .query(expectedMovieListQuery)
      .expect(200)
      .expect(expectedMoviesListDto)
      .expect(() => {
        expect(getMoviesDataSpy).toHaveBeenCalledWith(
          undefined,
          expectedMovieListQuery.shouldLoadNextPage
        );
      });
  });

  it('/GET :movieId should get single movie id', async () => {
    const expectedTransformedTmdbMovie: TransformedTmdbMovie = {
      id: 123,
      overview: 'Overview',
      posterPath: '/path.jpg',
      releaseDate: '2024-01-01',
      title: 'Title',
      voteAverage: 5,
    };

    const getSingleMovieDataSpy = jest
      .spyOn(moviesService, 'getSingleMovieData')
      .mockResolvedValue(expectedTransformedTmdbMovie);

    return await request(app.getHttpServer())
      .get(`/api/movies/${expectedTransformedTmdbMovie.id}`)
      .expect(200)
      .expect(expectedTransformedTmdbMovie)
      .expect(() => {
        expect(getSingleMovieDataSpy).toHaveBeenCalledWith(
          expectedTransformedTmdbMovie.id
        );
      });
  });

  it('/POST rate movie should return RateResultDto', async () => {
    const expectedRateResultDto: RateResultDto = {
      isRateSaved: true,
      moviesCountLeftOnPage: 10,
    };

    const expectedRateOfMovieBody: RateOfMovie = {
      movieId: 123,
      pageNumber: 0,
      rate: Rate.YES,
    };

    const rateMovieSpy = jest
      .spyOn(moviesService, 'rateMovie')
      .mockResolvedValue(expectedRateResultDto);

    return await request(app.getHttpServer())
      .post('/api/movies/rate')
      .send(expectedRateOfMovieBody)
      .expect(201)
      .expect(() => {
        expect(rateMovieSpy).toHaveBeenCalledWith(
          expectedRateOfMovieBody.movieId,
          expectedRateOfMovieBody.rate,
          undefined
        );
      });
  });

  it('/PUT mark-watch should return boolean', async () => {
    const expectedMarkMovieToWatchBody: MarkMovieToWatchBody = {
      isWatched: true,
      movieId: 123,
    };

    const markMovieToWatchSpy = jest
      .spyOn(moviesService, 'markMovieToWatch')
      .mockResolvedValue(true);

    return await request(app.getHttpServer())
      .put('/api/movies/mark-watch')
      .send(expectedMarkMovieToWatchBody)
      .expect(200)
      .expect(() => {
        expect(markMovieToWatchSpy).toHaveBeenCalledWith(
          undefined,
          expectedMarkMovieToWatchBody.movieId,
          expectedMarkMovieToWatchBody.isWatched
        );
      });
  });
});
