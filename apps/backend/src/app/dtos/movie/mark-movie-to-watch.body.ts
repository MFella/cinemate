import { IsBoolean, IsDefined, IsNumber } from 'class-validator';

export class MarkMovieToWatchBody {
  @IsNumber()
  @IsDefined()
  movieId: number;

  @IsBoolean()
  @IsDefined()
  isWatched: boolean;
}
