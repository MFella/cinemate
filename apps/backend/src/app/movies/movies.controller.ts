import { Body, Controller, Get, Post, Query, Req, UseFilters, Request } from "@nestjs/common";
import { MoviesListDTO } from "../dtos/movies-list.dto";
import { MoviesService } from "./movies.service";
import { RateOfMovie } from "../dtos/rate-of-movie";
import { PrismaClientErrorFilter } from "../error-handlers/prisma-client.error-filter";
import { RateResultDto } from "../dtos/rate-result.dto";
import { UserId } from "../decorators/user-id.decorator";

@Controller('movies')
@UseFilters(new PrismaClientErrorFilter())
export class MoviesController {
    constructor (private readonly moviesService: MoviesService) {}

    @Get()
    async getMoviesList(@UserId() userId: string, @Query() moviesListQuery: Record<'shouldLoadNextPage', '0' | '1'>): Promise<MoviesListDTO> {
        return this.moviesService.getMoviesData(userId, parseInt(moviesListQuery.shouldLoadNextPage) as 0 | 1);
    }

    @Post('rate')
    async rateMovie(@UserId() userId: string, @Body() rateOfMovie: RateOfMovie): Promise<RateResultDto> {
        return this.moviesService.rateMovie(rateOfMovie.imdbId, rateOfMovie.rate, rateOfMovie?.pageNumber, userId);
    }
}