import { Body, Controller, Get, Post, Query, Req, UseFilters, Request, Param, Put } from "@nestjs/common";
import { MoviesListDTO, TransformedTmdbMovie } from "../dtos/movies-list.dto";
import { MoviesService } from "./movies.service";
import { RateOfMovie } from "../dtos/rate-of-movie";
import { PrismaClientErrorFilter } from "../error-handlers/prisma-client.error-filter";
import { RateResultDto } from "../dtos/rate-result.dto";
import { UserId } from "../decorators/user-id.decorator";
import { MarkMovieToWatchQuery } from "../dtos/movie/mark-movie-to-watch.query";

@Controller('movies')
@UseFilters(new PrismaClientErrorFilter())
export class MoviesController {
    constructor (private readonly moviesService: MoviesService) {}

    @Get()
    async getMoviesList(@UserId() userId: number, @Query() moviesListQuery: Record<'shouldLoadNextPage', '0' | '1'>): Promise<MoviesListDTO> {
        return this.moviesService.getMoviesData(userId, parseInt(moviesListQuery.shouldLoadNextPage) as 0 | 1);
    }

    @Get('/:movieId')
    async getSingleMovie(@Param('movieId') movieId: string): Promise<TransformedTmdbMovie> {
        return this.moviesService.getSingleMovieData(parseInt(movieId));
    }

    @Post('rate')
    async rateMovie(@UserId() userId: number, @Body() rateOfMovie: RateOfMovie): Promise<RateResultDto> {
        return this.moviesService.rateMovie(rateOfMovie.movieId, rateOfMovie.rate, userId);
    }

    @Put('mark-watch')
    async markMovieToWatch(@UserId() userId: number, @Query() markMovieToWatchQuery: MarkMovieToWatchQuery): Promise<boolean> {
        return this.moviesService.markMovieToWatch(userId, markMovieToWatchQuery.movieId, markMovieToWatchQuery.isWatched);
    }
}