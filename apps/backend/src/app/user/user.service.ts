import { Injectable, InternalServerErrorException, Logger, NotFoundException } from "@nestjs/common";
import { PrismaService } from "../database/prisma.service";
import { genres, Genres } from "../typings/common";
import { UserPreferenceDto } from "../dtos/user-preference.dto";
import { Genre } from "@prisma/client";

@Injectable()
export class UserService {
    private static readonly DEFAULT_GENRE: Genres = 'Adventure';
    private static readonly DEFAULT_GENRE_ID = 4;

    constructor(
        private readonly prismaService: PrismaService
    ) {}

    async saveUserPreference(userId: string, genreId: number): Promise<boolean> {
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

        const genreUpsertResult = await this.prismaService.userGenre.upsert({
            where: {
                userId
            },
            update: {
                genreId: genreFromDbId
            },
            create: {
                genreId: genreFromDbId,
                userId
            }
        });

        return !!genreUpsertResult;
    }

    async getUserPreference(userId: string): Promise<UserPreferenceDto> {
        const userGenreFromDb = await this.prismaService.userGenre.findFirst({
            where: {
                userId
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
        const userGenreCreateResult = await this.prismaService.userGenre.create({
            data: {
                userId,
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
        console.log(result);
        if (result) {
            Logger.log('User already registered');
            return true;
        }

        const userCreationResult = await this.prismaService.user.create({
            data: {
                id: userId,
                email: userEmail
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
}