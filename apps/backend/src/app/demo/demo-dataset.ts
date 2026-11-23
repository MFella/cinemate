import { FriendshipStatus, RateValue } from '@prisma/client';
import {
  ALL_DEMO_PEOPLE,
  DEMO_FRIENDS,
  DEMO_PENDING_FRIEND,
  DEMO_USER,
} from './demo-users';

export type DemoMovie = { movieId: number; genreIds: Array<number> };
export type DemoGenre = { id: number };

export type DemoDataset = {
  users: Array<{ id: string; email: string; picture: string }>;
  userGenres: Array<{ userId: string; genreId: number }>;
  friendships: Array<{
    requesterId: string;
    addresseeId: string;
    status: FriendshipStatus;
  }>;
  rates: Array<{ userId: string; movieId: number; value: RateValue }>;
  watchedMovies: Array<{ userId: string; movieId: number }>;
};

const MOVIES_PER_GENRE = 12;
const GENRES_IN_DEMO = 2;

// Who likes which of the movies of a genre, by position (0-11) in the sorted list.
// Chosen so that Find has something to show in both modes: with Anna and Bob "everyone"
// gives positions 2-5, and "at least one" gives the rest of 0-7.
const LIKES: Record<string, Array<number>> = {
  Demo: [0, 1, 2, 3, 4, 5, 6, 7],
  Anna: [0, 1, 2, 3, 4, 5],
  Bob: [2, 3, 4, 5, 6, 7],
  Carla: [0, 1, 6, 7, 8, 9],
  Dan: [1, 3, 5, 7, 9, 11],
};
const DEMO_UNDECIDED = [8];
const DEMO_DISLIKES = [9];
const DEMO_WATCHED = [0, 2, 5];

/**
 * The data of the demo: one account with friends, taste and some watched movies.
 * Pure and deterministic, built from the movies that are already in the database.
 */
export const buildDemoDataset = (
  genres: Array<DemoGenre>,
  movies: Array<DemoMovie>
): DemoDataset => {
  const moviesByGenre = genres
    .map(genre => ({
      genreId: genre.id,
      movieIds: movies
        .filter(movie => movie.genreIds.includes(genre.id))
        .map(movie => movie.movieId)
        .sort((a, b) => a - b)
        .slice(0, MOVIES_PER_GENRE),
    }))
    // the genres with the most movies make the best demo
    .sort(
      (a, b) => b.movieIds.length - a.movieIds.length || a.genreId - b.genreId
    )
    .slice(0, GENRES_IN_DEMO)
    .filter(({ movieIds }) => movieIds.length > 0);

  if (!moviesByGenre.length) {
    throw new Error(
      'Demo data needs movies in the database. Use the app once (Match) so movies get fetched, then retry.'
    );
  }

  const rates = new Map<string, DemoDataset['rates'][number]>();
  const rate = (userId: string, movieId: number, value: RateValue) => {
    // a movie can belong to both genres: the first rating wins
    const key = `${userId}:${movieId}`;
    if (!rates.has(key)) {
      rates.set(key, { userId, movieId, value });
    }
  };
  const watchedMovies = new Map<string, DemoDataset['watchedMovies'][number]>();

  for (const { movieIds } of moviesByGenre) {
    const at = (positions: Array<number>) =>
      positions.flatMap(position =>
        movieIds[position] === undefined ? [] : [movieIds[position]]
      );

    for (const person of [DEMO_USER, ...DEMO_FRIENDS]) {
      for (const movieId of at(LIKES[person.name])) {
        rate(person.id, movieId, RateValue.YES);
      }
    }
    for (const movieId of at(DEMO_UNDECIDED)) {
      rate(DEMO_USER.id, movieId, RateValue.IDK);
    }
    for (const movieId of at(DEMO_DISLIKES)) {
      rate(DEMO_USER.id, movieId, RateValue.NO);
    }
    for (const movieId of at(DEMO_WATCHED)) {
      watchedMovies.set(`${DEMO_USER.id}:${movieId}`, {
        userId: DEMO_USER.id,
        movieId,
      });
    }
  }

  return {
    users: ALL_DEMO_PEOPLE.map(({ id, email, picture }) => ({
      id,
      email,
      picture,
    })),
    userGenres: moviesByGenre.map(({ genreId }) => ({
      userId: DEMO_USER.id,
      genreId,
    })),
    friendships: [
      ...DEMO_FRIENDS.map(friend => ({
        requesterId: friend.id,
        addresseeId: DEMO_USER.id,
        status: FriendshipStatus.ACCEPTED,
      })),
      {
        requesterId: DEMO_PENDING_FRIEND.id,
        addresseeId: DEMO_USER.id,
        status: FriendshipStatus.PENDING,
      },
    ],
    rates: [...rates.values()],
    watchedMovies: [...watchedMovies.values()],
  };
};
