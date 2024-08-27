import { GenEntity, TmdbMovie } from "./tmdb-movie";

type CamelCased<T extends string> = T extends `${infer First}_${infer Rest}`
    ? `${Lowercase<First>}${Capitalize<Rest>}` : T;

type TmdbMovieKeysToPick = 'id' | 'genre_ids' | 'poster_path' | 'release_date' | 'title' | 'overview' | 'vote_average';
type FilteredTmdbMovie = Pick<TmdbMovie, TmdbMovieKeysToPick>;
export type TransformedTmdbMovie = {
    [K in keyof FilteredTmdbMovie as CamelCased<K>]: FilteredTmdbMovie[K]
};

export type MoviesListDTO = {
    movies: Array<TransformedTmdbMovie>;
    pageGenres: Array<GenEntity>;
    selectedGenreId: number;
    pageNumber: number;
};