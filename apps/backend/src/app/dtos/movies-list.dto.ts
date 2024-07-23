import { Genre } from "@prisma/client";
import { MoodMovie } from "./mood-movie";

type MovieDTO = Array<Pick<MoodMovie, 'imdb_id' | 'gen' | 'image_url' | 'year' | 'title' | 'description' | 'rating'>>;
export type MoviesListDTO = {
    movies: MovieDTO;
    genre: Genre
};