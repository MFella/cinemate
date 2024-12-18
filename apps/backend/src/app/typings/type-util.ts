import { MovieToRate } from '@prisma/client';
import { MatchedRate } from './common';

export class TypeUtil {
  static isMovieToRate(movie: Record<string, unknown>): movie is MovieToRate {
    return [
      'id',
      'movieId',
      'imageUrl',
      'releaseDate',
      'title',
      'description',
      'rating',
      'genreIds',
    ].every(movieToRateKey => movieToRateKey in movie);
  }

  static isMatchedRate(
    matchedRate: Record<string, unknown>
  ): matchedRate is MatchedRate {
    return (
      'id' in matchedRate && 'user' in matchedRate && 'movie' in matchedRate
    );
  }
}
