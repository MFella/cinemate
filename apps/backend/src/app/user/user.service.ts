import { Injectable, InternalServerErrorException, Logger, NotFoundException } from "@nestjs/common";
import { PrismaService } from "../database/prisma.service";
import { genres, Genres } from "../typings/common";
import { UserPreferenceDto } from "../dtos/user-preference.dto";
import { Genre, MovieToRate, RateValue, User } from "@prisma/client";
import { FindMatchResultDto } from "../dtos/user/find-match-result.dto";
import { Rate } from "../dtos/rate-of-movie";
import { MoviesUtil } from "../movies/movies.util";
import { TransformedTmdbMovie } from "../dtos/movies-list.dto";

@Injectable()
export class UserService {
    private static readonly DEFAULT_GENRE: Genres = 'Adventure';
    private static readonly DEFAULT_GENRE_ID = 4;
    private static readonly MOVIE_SEARCH_RESULT_PER_PAGE = 15;

    constructor(
        private readonly prismaService: PrismaService
    ) {}

    async saveUserPreference(userId: number, genreId: number): Promise<boolean> {
        const genreFromDb = await this.prismaService.genre.findFirst({
            where: {
                id: genreId
            }
        });

        let genreFromDbId = genreFromDb?.id;
        if (genreFromDbId === null || genreFromDbId === undefined) {
            const defaultGenreFromDb = await this.prismaService.genre.findFirst({
                where: {
                    name: UserService.DEFAULT_GENRE
                }
            });

            if (!defaultGenreFromDb) {
                throw new NotFoundException('Default genre cannot be found');
            }

            genreFromDbId = defaultGenreFromDb.id
        }

        const genreUpdateResult = await this.prismaService.user.update({
            where: {
                id: userId
            },
            data: {
                genreId: genreFromDbId
            },
        });

        return !!genreUpdateResult;
    }

    async getUserPreference(userId: number): Promise<UserPreferenceDto> {
        const userGenreFromDb = await this.prismaService.user.findFirst({
            where: {
                id: userId
            },
            include: {
                genre: true
            }
        });

        if (userGenreFromDb) {
            return {
                preference: userGenreFromDb.genre
            }
        }

        // try get default genre and save it
        const defaultGenreFromDb = await this.prismaService.genre.findFirst({
            where: {
                name: UserService.DEFAULT_GENRE
            }
        });

        if (!defaultGenreFromDb) {
            // throw new NotFoundException('Cannot find default genre');
            // return cached default genre with nullish id
            return {
                preference: {
                    name: UserService.DEFAULT_GENRE,
                    id: UserService.DEFAULT_GENRE_ID
                },

            }
        }

        // save user default genre
        const userGenreCreateResult = await this.prismaService.user.update({
            where: {
                id: userId
            },
            data: {
                genreId: defaultGenreFromDb.id
            }
        });

        if (!userGenreCreateResult) {
            throw new InternalServerErrorException('Error occured during saving creation of user genre');
        }

        return {
            preference: defaultGenreFromDb
        }
    }

    async getAllPreferences(): Promise<Array<Genre>> {
        const genresFromDb = await this.prismaService.genre.findMany();
        if (!genresFromDb?.length) {
            // return cached genres
            return genres.map((genre) => {
                return {
                    name: genre,
                    id: genre === UserService.DEFAULT_GENRE ? UserService.DEFAULT_GENRE_ID : null
                };
            });
        }
        return genresFromDb;
    }

    async tryRegisterUser(userId: number, userEmail: string): Promise<boolean> {
        const result = await this.prismaService.user.findFirst({ where: { id: userId }});
        if (result) {
            Logger.log('User already registered');
            return true;
        }

        const genreId = await this.getRandomGenreId();
        const userCreationResult = await this.prismaService.user.create({
            data: {
                id: userId,
                email: userEmail,
                genreId
            }
        });

        if (userCreationResult) {
            Logger.log('User registered');
            return true;
        } else {
            Logger.error('Cannot register user');
            return false;
        }
    }

    async getUsersEmails(startsWith: string): Promise<Array<string>> {
        return (await this.prismaService.user.findMany({
            where: {
                email: {
                    startsWith
                }
            },
            select: {
                email: true
            }
        })).map((emailFromDb) => emailFromDb.email);
    }

    async getUserMatch(userId: number, genreId: number, mailOfUsers: Array<string>,
            pageNumber: number = 0, onlyUnwatched?: boolean, onlyWatched?: boolean, searchedMovieTitle?: string
    ): Promise<FindMatchResultDto> {
        const usersFromDb = new Map<any, User>((await this.prismaService.user.findMany({
            where: {
                email: {
                    in: mailOfUsers
                }
            },
        })).map((userFromDb) => [userFromDb.id.toString(), userFromDb]));

        const watchedUserMovies = (await this.prismaService.watchedMovie.findMany({
            where: {
                userId,
            },
            select: {
                movieId: true
            }
        })).map(watchedUserMovie => watchedUserMovie.movieId);

        let movieFilterQuery = {
        };

        if (onlyWatched === true) {
            movieFilterQuery['in'] = watchedUserMovies 
        }

        if (onlyUnwatched === true) {
            movieFilterQuery['notIn'] = watchedUserMovies;
        }

        if (onlyUnwatched === onlyWatched && onlyUnwatched !== undefined) {
            movieFilterQuery = null;
        }

        const moviesFromDb = new Map<number, TransformedTmdbMovie>((await this.prismaService.movieToRate.findMany({
            where: {
                genreIds: {
                    has: genreId
                },
                movieId: movieFilterQuery ?? { },
                title: {
                    contains: searchedMovieTitle ?? ''
                }
            },
        })).map((movieToRate) => [movieToRate.movieId, MoviesUtil.convertMovieToRateToTransformedTmdbMovie(movieToRate)]));

        const ratesFromDb = await this.prismaService.rate.findMany(({
            where: {
                userId: {
                    in: Array.from(usersFromDb.keys())
                },
                movieId: {
                    in: Array.from(moviesFromDb.keys())
                },
                value: RateValue.YES,
            },
            skip: pageNumber * UserService.MOVIE_SEARCH_RESULT_PER_PAGE,
            take: UserService.MOVIE_SEARCH_RESULT_PER_PAGE
        }));

        const populatedRates = ratesFromDb.map((rate) => {
            const movieFromDb = moviesFromDb.get(rate.movieId);
            return {
                id: rate.id,
                movie: movieFromDb,
                user: usersFromDb.get(rate.userId.toString()),
                isWatched: watchedUserMovies.includes(movieFromDb.id)
            }
        });

        return {
            matchedRateValue: Rate.YES,
            matchedRates: populatedRates,
            isLastPage: ratesFromDb?.length < UserService.MOVIE_SEARCH_RESULT_PER_PAGE
        }
    }

    private async getRandomGenreId(): Promise<number> {
        const randomGenre = this.getRandomGenre();

        const randomGenreFromDb = await this.prismaService.genre.findFirst({
            where: {
                name: randomGenre
            }
        });

        if (!randomGenre) {
            const defaultGenreFromDb = await this.prismaService.genre.findFirst({
                where: {
                    id: UserService.DEFAULT_GENRE_ID
                }
            });

            if (!defaultGenreFromDb) {
                throw new InternalServerErrorException(`Cannot find genre with id ${UserService.DEFAULT_GENRE_ID}`);
            }

            return UserService.DEFAULT_GENRE_ID;
        }

        return randomGenreFromDb.id;
    }

    private getRandomGenre(): Genres {
        const genreRandomIndex = Math.floor(Math.random() * genres.length);
        return genres[genreRandomIndex];
    }
}