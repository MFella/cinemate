import { IsBoolean, IsDefined, IsNumber } from "class-validator";

export class MarkMovieToWatchQuery {
    @IsNumber()
    @IsDefined()
    movieId: number;

    @IsBoolean()
    @IsDefined()
    isWatched: boolean;
}