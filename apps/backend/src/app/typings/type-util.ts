import { MovieToRate } from "@prisma/client";

export class TypeUtil {
    static isMovieToRate(movie: any): movie is MovieToRate {
        return ['id',
            'movieId',
            'imageUrl',
            'releaseDate',
            'title',
            'description',
            'rating',
            'genreIds'].every(movieToRateKey => movieToRateKey in movie)
    }
}