import { Genre } from "@prisma/client";
import { TmdbMovie } from "./tmdb-movie";

type MovieDTO = Array<Pick<TmdbMovie, 'id' | 'genre_ids' | 'poster_path' | 'release_date' | 'title' | 'overview' | 'vote_average'>>;
export type MoviesListDTO = {
    movies: MovieDTO;
    genre: Genre
};