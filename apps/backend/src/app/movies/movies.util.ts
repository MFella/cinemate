import { Genre, MovieToRate } from "@prisma/client";
import { MoviesListDTO, TransformedTmdbMovie } from "../dtos/movies-list.dto";
import { TmdbMovie } from "../dtos/tmdb-movie";

export class MoviesUtil {
    static convertTmdbMoviesToMoviesListDto(tmdbMovies: Array<TmdbMovie>, pageGenres: Array<Genre>, selectedGenreId: number,
        pageNumber: number): MoviesListDTO {
        const movies = tmdbMovies.map((tmdbMovie: TmdbMovie) => {
            return {
                id: tmdbMovie.id,
                genreIds: tmdbMovie.genre_ids,
                posterPath: tmdbMovie.poster_path,
                releaseDate: tmdbMovie.release_date,
                title: tmdbMovie.title,
                overview: tmdbMovie.overview,
                voteAverage: tmdbMovie.vote_average
            }
        });

        return {
            movies,
            selectedGenreId,
            pageGenres,
            pageNumber
        }
    }

    static convertMoviesToRateToMoviesListDto(moviesToRate: Array<MovieToRate>, pageGenres: Array<Genre>, selectedGenreId: number,
        pageNumber: number): MoviesListDTO {
        const movies = moviesToRate.map(movieToRate => MoviesUtil.convertMovieToRateToTransformedTmdbMovie(movieToRate));
        return {
            movies,
            selectedGenreId,
            pageGenres,
            pageNumber
        }
    }

    static convertMovieToRateToTransformedTmdbMovie(movieToRate: MovieToRate): TransformedTmdbMovie {
        return {
            id: movieToRate.movieId,
            genreIds: movieToRate.genreIds,
            overview: movieToRate.description,
            posterPath: movieToRate.imageUrl,
            releaseDate: movieToRate.releaseDate,
            title: movieToRate.title,
            voteAverage: movieToRate.rating
        };
    }
}