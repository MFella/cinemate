import { TransformedTmdbMovie } from '../dtos/movies-list.dto';

export const genres = [
  'Adventure',
  'Action',
  'Animation',
  'Biography',
  'Comedy',
  'Crime',
  'Documentary',
  'Drama',
  'Family',
  'Fantasy',
  'Film-Noir',
  'History',
  'Horror',
  'Music',
  'Musical',
  'Mystery',
  'Romance',
  'Sci-Fi',
  'Sport',
  'Thriller',
  'War',
  'Western',
] as const;

export type Genres = (typeof genres)[number];

// 'all': every selected user liked the movie; 'any': at least one of them did.
// In both modes the current user must have liked it too.
export type MatchMode = 'all' | 'any';

export type MatchedRate = {
  id: number;
  movie: TransformedTmdbMovie;
  // Selected users (not the current one) who liked the movie.
  users: Array<{ id: string; email: string }>;
  isWatched: boolean;
};

export type AuthSource = 'google' | 'facebook';

export type UserJwtPayload = {
  sub: string;
  email: string;
  picture: string;
};

const cookieNames = ['access_token'] as const;
export type CookieNames = (typeof cookieNames)[number];

export type JwtAuthConfig = {
  secret: string;
};

export type OauthGoogleUserInfo<T extends AuthSource> = {
  provider: T;
  id: string;
  email: string;
  picture: string;
};
