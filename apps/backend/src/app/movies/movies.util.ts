import { Genre, MovieToRate } from "@prisma/client";
import { MoviesListDTO } from "../dtos/movies-list.dto";
import { TmdbMovie } from "../dtos/tmdb-movie";

export class MoviesUtil {
    static convertTmdbMoviesToMoviesListDto(tmdbMovies: Array<TmdbMovie>, pageGenre: Genre): MoviesListDTO {
        const movies = tmdbMovies.map((tmdbMovie: TmdbMovie) => {
            return {
                id: tmdbMovie.id,
                genre_ids: tmdbMovie.genre_ids,
                poster_path: tmdbMovie.poster_path,
                release_date: tmdbMovie.release_date,
                title: tmdbMovie.title,
                overview: tmdbMovie.overview,
                vote_average: tmdbMovie.vote_average
            }
        });

        return {
            movies,
            genre: pageGenre
        }
    }

    static convertMoviesToRateToMoviesListDto(moviesToRate: Array<MovieToRate>, genreIdToGenreFromDbMap: Map<number, Genre>,
        pageGenre: Genre): MoviesListDTO {
        const movies = moviesToRate.map((movie) => {
            const gen: Array<Genre> = movie.genreIds
                .map(genreId => genreIdToGenreFromDbMap.get(genreId)).filter(Boolean);
            return {
                id: parseInt(movie.movieId),
                genre_ids: movie.genreIds,
                poster_path: movie.imageUrl,
                release_date: movie.releaseDate,
                title: movie.title,
                overview: movie.description,
                vote_average: movie.rating
            }
        });

        return {
            movies,
            genre: pageGenre
        }
    }
}