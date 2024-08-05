import { Genre, MovieToRate } from "@prisma/client";
import { MoviesListDTO } from "../dtos/movies-list.dto";
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
        const movies = moviesToRate.map((movie) => {
            return {
                id: movie.movieId,
                genreIds: movie.genreIds,
                posterPath: movie.imageUrl,
                releaseDate: movie.releaseDate,
                title: movie.title,
                overview: movie.description,
                voteAverage: movie.rating
            }
        });

        return {
            movies,
            selectedGenreId,
            pageGenres,
            pageNumber
        }
    }
}