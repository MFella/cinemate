import { Genre, MovieToRate } from "@prisma/client";
import { GenEntity, MoodMovie } from "../dtos/mood-movie";
import { MoviesListDTO } from "../dtos/movies-list.dto";

export class MoviesUtil {
    static convertMoodMoviesToMoviesListDto(moodMovies: Array<MoodMovie>, pageGenre: Genre): MoviesListDTO {
        const movies = moodMovies.map((moodMovie: MoodMovie) => {
            return {
                imdb_id: moodMovie.imdb_id,
                gen: moodMovie.gen,
                image_url: moodMovie.image_url,
                year: moodMovie.year,
                title: moodMovie.title,
                description: moodMovie.description,
                rating: moodMovie.rating
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
                imdb_id: movie.movieId,
                gen,
                image_url: movie.imageUrl,
                year: movie.year,
                title: movie.title,
                description: movie.description,
                rating: movie.rating
            }
        });

        return {
            movies,
            genre: pageGenre
        }
    }
}