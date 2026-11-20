import {
  Injectable,
  InternalServerErrorException,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../database/prisma.service';
import { genres, Genres, MatchMode } from '../typings/common';
import { UserPreferenceDto } from '../dtos/user-preference.dto';
import { Genre, RateValue, User } from '@prisma/client';
import { FindMatchResultDto } from '../dtos/user/find-match-result.dto';
import { Rate } from '../dtos/rate-of-movie';
import { MoviesUtil } from '../movies/movies.util';

@Injectable()
export class UserService {
  private static readonly DEFAULT_GENRE: Genres = 'Adventure';
  private static readonly DEFAULT_GENRE_ID = 4;
  private static readonly MOVIE_SEARCH_RESULT_PER_PAGE = 15;

  constructor(private readonly prismaService: PrismaService) {}

  async saveUserPreference(userId: number, genreId: number): Promise<boolean> {
    const genreFromDb = await this.prismaService.genre.findFirst({
      where: {
        id: genreId,
      },
    });

    let genreFromDbId = genreFromDb?.id;
    if (genreFromDbId === null || genreFromDbId === undefined) {
      const defaultGenreFromDb = await this.prismaService.genre.findFirst({
        where: {
          name: UserService.DEFAULT_GENRE,
        },
      });

      if (!defaultGenreFromDb) {
        throw new NotFoundException('Default genre cannot be found');
      }

      genreFromDbId = defaultGenreFromDb.id;
    }

    const genreUpdateResult = await this.prismaService.user.update({
      where: {
        id: userId,
      },
      data: {
        genreId: genreFromDbId,
      },
    });

    return !!genreUpdateResult;
  }

  async getUserPreference(userId: number): Promise<UserPreferenceDto> {
    const userGenreFromDb = await this.prismaService.user.findFirst({
      where: {
        id: userId,
      },
      include: {
        genre: true,
      },
    });

    if (userGenreFromDb) {
      return {
        preference: userGenreFromDb.genre,
      };
    }

    // try get default genre and save it
    const defaultGenreFromDb = await this.prismaService.genre.findFirst({
      where: {
        name: UserService.DEFAULT_GENRE,
      },
    });

    if (!defaultGenreFromDb) {
      // throw new NotFoundException('Cannot find default genre');
      // return cached default genre with nullish id
      return {
        preference: {
          name: UserService.DEFAULT_GENRE,
          id: UserService.DEFAULT_GENRE_ID,
        },
      };
    }

    // save user default genre
    const userGenreCreateResult = await this.prismaService.user.update({
      where: {
        id: userId,
      },
      data: {
        genreId: defaultGenreFromDb.id,
      },
    });

    if (!userGenreCreateResult) {
      throw new InternalServerErrorException(
        'Error occured during saving creation of user genre'
      );
    }

    return {
      preference: defaultGenreFromDb,
    };
  }

  async getAllPreferences(): Promise<Array<Genre>> {
    const genresFromDb = await this.prismaService.genre.findMany();
    if (!genresFromDb?.length) {
      // return cached genres
      return genres.map(genre => {
        return {
          name: genre,
          id:
            genre === UserService.DEFAULT_GENRE
              ? UserService.DEFAULT_GENRE_ID
              : null,
        };
      });
    }

    return genresFromDb;
  }

  async tryRegisterUser(
    userId: string,
    userEmail: string,
    userPicture: string
  ): Promise<User | null> {
    const genreId = await this.getRandomGenreId();
    const userFromDb = await this.prismaService.user.findFirst({
      where: {
        id: userId,
      },
    });

    if (Object.values(userFromDb ?? {})?.length) {
      Logger.log('User already registered');
      return userFromDb;
    }

    const userCreationResult = await this.prismaService.user.create({
      data: {
        id: userId,
        email: userEmail,
        genreId,
        picture: userPicture,
      },
    });

    if (userCreationResult) {
      Logger.log('User registered');
      return userCreationResult;
    } else {
      Logger.error('Cannot register user');
      return null;
    }
  }

  async getUsersEmails(startsWith: string): Promise<Array<string>> {
    return (
      await this.prismaService.user.findMany({
        where: {
          email: {
            startsWith,
          },
        },
        select: {
          email: true,
        },
      })
    ).map(emailFromDb => emailFromDb.email);
  }

  async getUserMatch(
    userId: number,
    genreId: number,
    mailOfUsers: Array<string>,
    pageNumber = 0,
    onlyUnwatched?: boolean,
    onlyWatched?: boolean,
    searchedMovieTitle?: string,
    matchMode: MatchMode = 'all'
  ): Promise<FindMatchResultDto> {
    const myId = userId.toString();

    // The frontend sends an empty first element; ignore blanks and repeated e-mails.
    const requestedEmails = Array.from(
      new Map(
        (mailOfUsers ?? [])
          .map(email => email?.trim())
          .filter(email => !!email)
          .map(email => [email.toLowerCase(), email] as const)
      ).values()
    );

    const emptyResult = (unknownEmails: Array<string>): FindMatchResultDto => ({
      matchedRateValue: Rate.YES,
      matchedRates: [],
      isLastPage: true,
      unknownEmails,
    });

    if (!requestedEmails.length) {
      return emptyResult([]);
    }

    const usersFromDb = await this.prismaService.user.findMany({
      where: {
        OR: requestedEmails.map(email => ({
          email: { equals: email, mode: 'insensitive' as const },
        })),
      },
    });

    const foundEmails = new Set(usersFromDb.map(u => u.email.toLowerCase()));
    const unknownEmails = requestedEmails.filter(
      email => !foundEmails.has(email.toLowerCase())
    );
    const friends = usersFromDb.filter(u => u.id.toString() !== myId);

    // With "all" an unknown e-mail can never be satisfied, so there is nothing in common.
    if (!friends.length || (matchMode === 'all' && unknownEmails.length)) {
      return emptyResult(unknownEmails);
    }

    // Start from the movies I liked: only those can match.
    const myLikedMovieIds = (
      await this.prismaService.rate.findMany({
        where: { userId: myId, value: RateValue.YES },
        select: { movieId: true },
      })
    ).map(rate => rate.movieId);

    const watchedUserMovies = (
      await this.prismaService.watchedMovie.findMany({
        where: { userId: myId },
        select: { movieId: true },
      })
    ).map(watchedUserMovie => watchedUserMovie.movieId);

    let candidateMovieIds = myLikedMovieIds;
    let excludedMovieIds: Array<number> = [];
    const filterByWatched = onlyWatched !== onlyUnwatched;
    if (filterByWatched && onlyWatched === true) {
      candidateMovieIds = candidateMovieIds.filter(id =>
        watchedUserMovies.includes(id)
      );
    } else if (filterByWatched && onlyUnwatched === true) {
      excludedMovieIds = watchedUserMovies;
    }

    const candidateMovies = (
      await this.prismaService.movieToRate.findMany({
        where: {
          genreIds: { has: genreId },
          movieId: { in: candidateMovieIds, notIn: excludedMovieIds },
          title: { contains: searchedMovieTitle ?? '', mode: 'insensitive' },
        },
      })
    ).sort((a, b) => a.movieId - b.movieId);

    if (!candidateMovies.length) {
      return emptyResult(unknownEmails);
    }

    const friendRates = await this.prismaService.rate.findMany({
      where: {
        userId: { in: friends.map(friend => friend.id.toString()) },
        movieId: { in: candidateMovies.map(movie => movie.movieId) },
        value: RateValue.YES,
      },
      select: { userId: true, movieId: true },
    });

    const likedByFriends = new Map<number, Set<string>>();
    friendRates.forEach(friendRate => {
      const likers = likedByFriends.get(friendRate.movieId) ?? new Set();
      likers.add(friendRate.userId.toString());
      likedByFriends.set(friendRate.movieId, likers);
    });

    const matchedRates = candidateMovies.flatMap(movieToRate => {
      const likers = likedByFriends.get(movieToRate.movieId) ?? new Set();
      const friendsWhoLiked = friends.filter(friend =>
        likers.has(friend.id.toString())
      );
      const isMatch =
        matchMode === 'all'
          ? friendsWhoLiked.length === friends.length
          : friendsWhoLiked.length > 0;

      if (!isMatch) {
        return [];
      }

      return [
        {
          id: movieToRate.movieId,
          movie: MoviesUtil.convertMovieToRateToTransformedTmdbMovie(movieToRate),
          users: friendsWhoLiked.map(friend => ({
            id: friend.id.toString(),
            email: friend.email,
          })),
          isWatched: watchedUserMovies.includes(movieToRate.movieId),
        },
      ];
    });

    const pageSize = UserService.MOVIE_SEARCH_RESULT_PER_PAGE;
    const pageStart = pageNumber * pageSize;

    return {
      matchedRateValue: Rate.YES,
      matchedRates: matchedRates.slice(pageStart, pageStart + pageSize),
      isLastPage: pageStart + pageSize >= matchedRates.length,
      unknownEmails,
    };
  }

  private async getRandomGenreId(): Promise<number> {
    const randomGenre = this.getRandomGenre();

    const randomGenreFromDb = await this.prismaService.genre.findFirst({
      where: {
        name: randomGenre,
      },
    });

    if (!randomGenre) {
      const defaultGenreFromDb = await this.prismaService.genre.findFirst({
        where: {
          id: UserService.DEFAULT_GENRE_ID,
        },
      });

      if (!defaultGenreFromDb) {
        throw new InternalServerErrorException(
          `Cannot find genre with id ${UserService.DEFAULT_GENRE_ID}`
        );
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
