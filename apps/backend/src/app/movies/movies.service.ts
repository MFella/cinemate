import { Injectable } from "@nestjs/common";
import { MoviesListDTO } from "../dtos/movies-list.dto";
import { HttpService } from "@nestjs/axios";
import { firstValueFrom } from "rxjs";
import { MoviesUtil } from "./movies.util";
import { MoodMovie } from "../dtos/mood-movie";
import { Genres, genres } from "../typings/common";
import { PrismaService } from "../database/prisma.service";
import { Rate } from "../dtos/rate-of-movie";
import { CompletedPageOfMovie, Genre, MovieToRate, PageOfMovie, Genre as PrismaGenre } from "@prisma/client";
import { RateResultDto } from "../dtos/rate-result.dto";
import { PrismaUtil } from "../util/prisma-util";

@Injectable()
export class MoviesService {
    private static readonly API_URL = 'https://mood2movie.com/api/movies/';
    private static readonly DEFAULT_PAGE_NUMBER = 1;
    private static readonly DEFAULT_GENRE: Genres = 'Adventure';
    private static readonly DEFAULT_GENRE_ID = 4;

    constructor(
        private readonly httpService: HttpService,
        private readonly prismaService: PrismaService
    ){}

    async getMoviesData(userId: string, shouldLoadNextPage: 0 | 1): Promise<MoviesListDTO> {
            if (shouldLoadNextPage === 0) {
                const moviesListDtoFromCache = await this.retrieveMovieListDtoFromDb(userId);

                if (moviesListDtoFromCache?.movies?.length && moviesListDtoFromCache?.genre) {
                    return moviesListDtoFromCache;
                }
            }

            const userGenreFromDb = await this.prismaService.userGenre.findFirst({
                where: {
                    userId
                },
                include: {
                    genre: true
                }
            });


            let userGenreName = userGenreFromDb?.genre?.genre;
            let userGenreId = userGenreFromDb?.genre?.id;
    
            if (userGenreName === null || userGenreName === undefined) {
                const defaultGenre = await this.prismaService.genre.findFirst({
                    where: {
                        genre: MoviesService.DEFAULT_GENRE
                    }
                })

                if (!defaultGenre) {
                    userGenreName = MoviesService.DEFAULT_GENRE;
                    userGenreId = undefined;
                } else {
                    userGenreName = defaultGenre.genre;
                    userGenreId = defaultGenre.id
                }
            }

            const userCompletedPages = await this.prismaService.completedPageOfMovie.findMany({
                where: {
                    userId,
                    pageOfMovie: {
                        genreId: userGenreId
                    }
                },
                include: {
                    pageOfMovie: true
                }
            });

            let currentPageNumber = MoviesService.DEFAULT_PAGE_NUMBER;
            if (userGenreId !== undefined && userCompletedPages?.length > 0) {
                currentPageNumber = Math.max(...userCompletedPages
                    .map((userCompletedPage) => userCompletedPage.pageOfMovie.pageNumber)) + 1;    
            }
 
            currentPageNumber += shouldLoadNextPage;
            console.log(userGenreName, currentPageNumber);
            const response = await firstValueFrom(this.httpService.post<Array<MoodMovie>>(`${MoviesService.API_URL}${userGenreName}?page=${currentPageNumber}`, {}));
            if (response.data) {
                const pageGenre = await this.extractPageGenreFromMoodMovieList(response.data, userGenreName);
                const moviesListDto = MoviesUtil.convertMoodMoviesToMoviesListDto(response.data, pageGenre);
                await this.saveMovieListDto(moviesListDto, userId, Boolean(shouldLoadNextPage));
                return moviesListDto;
            } else {
                console.error('Received data is undefined');
                return { genre: null, movies: [] }
        }
    }

    async retrieveMovieListDtoFromDb(userId: string): Promise<MoviesListDTO> {
        const userGenreFromDb = await this.prismaService.userGenre.findFirst({
            where: {
                userId
            }
        });

        let userGenreId = userGenreFromDb?.genreId;

        console.log('userGenreId', userGenreId);
        if (userGenreId === undefined) {
            const randomGenreText = this.getRandomUserGenre().toString();
            const genreEntity = await this.prismaService.genre.findFirst({
                where: {
                    genre: randomGenreText
                }
            });

            if (!genreEntity) {
                console.error(`Cannot retrieve genre from db - fallback to random ${randomGenreText} genre`);
                return { movies: [], genre: null };
            } else {
                await this.prismaService.userGenre.create({
                    data: {
                        genreId: genreEntity.id,
                        userId
                    }
                });
                return this.extractCachedMovies(userId, genreEntity.id);
            }
        }

        const completedPageOfMovies = await this.prismaService.completedPageOfMovie.findMany({
            where: {
                userId,
                pageOfMovie: {
                    genreId: userGenreId
                }
            },
            include: {
                pageOfMovie: true
            }
        });

        const maxCompletedPageNumber = completedPageOfMovies?.length ?
            Math.max(...completedPageOfMovies.map(c => c.pageOfMovie.pageNumber)) : 0;        
        const currentPageNumber = maxCompletedPageNumber + 1;

        const pageOfMovie = await this.prismaService.pageOfMovie.findFirst({
            where: {
                genreId: userGenreId,
                pageNumber: currentPageNumber
            }
        });

        if (!pageOfMovie) {
            return {
                movies: [],
                genre: null
            };
        }

        const ratedUserMovies = await this.prismaService.rate.findMany({
            where: {
                userId,
            },
            select: {
                movieId: true
            }
        });
        const ratedUserMovieIds = ratedUserMovies.map((ratedUserMovie) => ratedUserMovie.movieId);
        console.log('gghf', ratedUserMovieIds, pageOfMovie.movieIds);
        const nonVotedMovieIds = pageOfMovie.movieIds.filter((movieId: string) => !ratedUserMovieIds.includes(movieId));
        console.log('non', nonVotedMovieIds);
        const cachedMovies = await this.prismaService.movieToRate.findMany({
            where: {
                movieId: {
                    in: nonVotedMovieIds
                }
            }
        });

        const c1 = await this.prismaService.movieToRate.findMany();
        console.log('ffs', c1.filter(c => nonVotedMovieIds.includes(c.movieId)).map(a => a.movieId));


        console.log('fdshghg', cachedMovies.length);
        const genreToReturn = await this.prismaService.genre.findFirst({
            where: {
                id: userGenreId
            }
        });


        return MoviesUtil.convertMoviesToRateToMoviesListDto(
            cachedMovies,
            new Map<number, PrismaGenre>([[genreToReturn.id, genreToReturn]]),
            genreToReturn
        );
    }

    private async saveMovieListDto(moviesListDto: MoviesListDTO, userId: string, shouldLoadNextPage: boolean = false): Promise<void> {
        // prisma work ...
        const completedPageOfMovies = await this.prismaService.completedPageOfMovie.findMany({
            where: {
                userId
            },
            include: {
                pageOfMovie: true
            },
        });

        let pageNumber = !completedPageOfMovies?.length ? MoviesService.DEFAULT_PAGE_NUMBER :
            Math.max(...completedPageOfMovies.map(completedPageOfMovie => completedPageOfMovie.pageOfMovie.pageNumber)) + 1;
        pageNumber += (+shouldLoadNextPage);

        const userGenre = await this.prismaService.userGenre.findFirst({
            where: {
                userId
            },
            include: {
                genre: true
            },
        })

        const groupedGenres = moviesListDto.movies.map(movie => movie.gen).filter(Boolean).reduce((acc, gen) => acc.concat(gen)
        , []);
        const resultGenres = [...new Map<number, PrismaGenre>(groupedGenres.map(g => [g.id, g])).values()];
        let genreId = MoviesService.DEFAULT_GENRE_ID;
        if (userGenre?.genre) {
            genreId = resultGenres.find((resultGenre) => resultGenre.genre === userGenre.genre.genre)?.id;
        }
        console.log('pageNumber', pageNumber); 
        await this.prismaService.pageOfMovie.create({
            data: {
            pageNumber,
            genreId,
            movieIds: moviesListDto.movies.map((movieInListDto) => movieInListDto.imdb_id)
            }
        });

        await this.prismaService.movieToRate.createMany({
            skipDuplicates: true,
            data: moviesListDto.movies.map((movieInListDto) => {
                return {
                    movieId: movieInListDto.imdb_id,
                    imageUrl: movieInListDto.image_url,
                    year: movieInListDto.year,
                    title: movieInListDto.title,
                    description: movieInListDto.description,
                    rating: movieInListDto.rating
                }
            })
        });

        try {
            const genresFromDb = await this.prismaService.genre.findMany({
                select: {
                    id: true
                },
            });
            const genresFromDbIds = genresFromDb.map(genreFromDb => genreFromDb.id);
            const newGenres = resultGenres.filter((resultGenre) => genresFromDbIds.indexOf(resultGenre.id) === -1);
            if (newGenres?.length) {
                await this.prismaService.genre.createMany({
                    data: newGenres
                }); 
            }   
        } catch (err) {
            console.log(err);
        }
    }

    async rateMovie(movieId: string, rate: Rate, pageNumber: number, userId: string): Promise<RateResultDto> {
        const rateFromDb = await this.prismaService.rate.findFirst({
            where: {
                userId,
                movieId
            }
        });

        if (!rateFromDb) {
            const saveRateResult = await this.prismaService.rate.create({
                data: {
                    userId,
                    movieId,
                    value: PrismaUtil.convertRateToRateValue(rate)
                }
            });
    
            if (!saveRateResult) {
                return {
                    moviesCountLeftOnPage: null,
                    isRateSaved: false,
                    reason: 'Failed saving rate into database'
                };
            }
        }

        const userGenre = await this.prismaService.userGenre.findFirst({
            where: {
                userId
            }
        });

        let genreId = userGenre?.genreId;

        if (genreId === undefined || genreId === null) {
            // fallback to default
            const defaultGenre = await this.prismaService.genre.findFirst({
                where: {
                    genre: MoviesService.DEFAULT_GENRE
                }
            });

            if (!defaultGenre) {
                return {
                    moviesCountLeftOnPage: null,
                    isRateSaved: false,
                    reason: `Cannot retrieve default ${MoviesService.DEFAULT_GENRE} genre from database`
                }
            }

            genreId = defaultGenre?.id;
        }

        const pageOfMovie = await this.prismaService.pageOfMovie.findFirst({
            where: {
                pageNumber,
                genreId
            }
        });

        const userRates = await this.prismaService.rate.findMany({
            where: {
                userId,
            }
        });

        const userRatesMovieIds = userRates.map((userRate) => userRate.movieId);

        console.log(pageOfMovie.movieIds);
        console.log(userRatesMovieIds)
        const moviesCountLeftOnPage = pageOfMovie.movieIds.filter((movieId: string) => !userRatesMovieIds.includes(movieId))?.length; 
        if (moviesCountLeftOnPage === 0) {
            // mark page as completed
            await this.prismaService.completedPageOfMovie.create({
                data: {
                    pageOfMovieId: pageOfMovie.id,
                    userId
                }
            });
        }

        // finally - save rate
        return {
            moviesCountLeftOnPage,
            isRateSaved: true
        }
    }

    private async extractCachedMovies(userId: string, genreId: number): Promise<MoviesListDTO> {
        console.log('buu', userId, genreId);
        const genreFromDb = await this.prismaService.genre.findFirst({
            where: {
                id: genreId
            }
        });

        if (!genreFromDb) {
            console.error(`Cannot find genre with id ${genreId}`);
            return;
        }

        const completedPageOfMovies = await this.prismaService.completedPageOfMovie.findMany({
            where: {
                userId
            },
            include: {
                pageOfMovie: true
            }
        });

        const pageNumber = this.getHighestCompletedPageNumber(completedPageOfMovies) + 1;
        const pageOfMovies = await this.prismaService.pageOfMovie.findFirst({where: {
            pageNumber,
            genreId
        }});

        if (pageOfMovies || pageOfMovies?.movieIds?.length) {
            return { movies: [], genre: genreFromDb };
        }

        const cachedMovies: Array<MovieToRate> = await this.prismaService.movieToRate.findMany({ where: {
            movieId: {
                in: pageOfMovies.movieIds
            }
        }});

        if (!cachedMovies?.length) {
            return { movies: [], genre: genreFromDb };
        }

        const genres: Array<PrismaGenre> = await this.prismaService.genre.findMany();

        const genreIdToGenreFromDbMap = new Map<number, PrismaGenre>(genres.map((genre) => [genre.id, genre]));
        return MoviesUtil.convertMoviesToRateToMoviesListDto(cachedMovies, genreIdToGenreFromDbMap, genreFromDb);
    }

    private getHighestCompletedPageNumber(completedPageOfMovies: Array<CompletedPageOfMovie & { pageOfMovie: PageOfMovie }>): number {
        const mappedFilledPageOfMovies = completedPageOfMovies
            .map((completedPageOfMovie) => completedPageOfMovie.pageOfMovie)
            .filter(Boolean);

        if (!completedPageOfMovies?.length || !mappedFilledPageOfMovies?.length) {
            return MoviesService.DEFAULT_PAGE_NUMBER;
        }

        return completedPageOfMovies
            .sort((previousPageOfMovies, currentPageOfMovies) =>
                currentPageOfMovies?.pageOfMovie?.pageNumber - previousPageOfMovies?.pageOfMovie?.pageNumber)
            .at(0).pageOfMovie.pageNumber;
    }

    private getRandomUserGenre(): Genres {
        const genreRandomIndex = Math.floor(Math.random() * genres.length);
        return genres[genreRandomIndex];
    }

    private async extractPageGenreFromMoodMovieList(moodMovies: Array<MoodMovie>, userGenreName: string): Promise<Genre> {
        const genreFromMoodMovies = moodMovies.map((moodMovie) => moodMovie.gen)
            .reduce((acc, val) => acc.concat(val), []);
        const map = new Map(genreFromMoodMovies.map(genre => [genre.genre, genre]));
        return map.get(userGenreName);
    }
}