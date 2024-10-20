import { User } from '@prisma/client';
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

export type MatchedRate = {
  id: string;
  movie: TransformedTmdbMovie;
  user: User;
};

export type AuthSource = 'google' | 'facebook';

export type JwtAuthConfig = {
  secret: string;
};

export type OauthGoogleUserInfo<T extends AuthSource> = {
  provider: T;
  id: string;
  email: string;
  picture: string;
};
