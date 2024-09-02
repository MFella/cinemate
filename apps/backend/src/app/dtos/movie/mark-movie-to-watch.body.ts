import { IsBoolean, IsDefined, IsNumber } from "class-validator";

export class markMovieToWatchBody {
    @IsNumber()
    @IsDefined()
    movieId: number;

    @IsBoolean()
    @IsDefined()
    isWatched: boolean;
}