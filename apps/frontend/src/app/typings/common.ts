export type AppTheme = 'dark' | 'default';
export type AppLang = 'pl-PL' | 'en-US';

export type MovieRate = 'YES' | 'NO' | 'IDK';

export type IdentityClaim = {
    iss: string;
    azp: string;
    aud: string;
    sub: string;
    email: string;
    email_verified: boolean;
    at_hash: string;
    nonce: string;
    nbf: number;
    name: string;
    picture: string;
    given_name: string;
    family_name: string;
    iat: number;
    exp: number;
    jti: string;
};


export type GenreOption = {
    value: string;
    label: string;
};

export type SelectOption = {
    value: number | boolean | string;
    label: string;
    disabled: boolean;
}

export type UserMatchFilterOptions = {
    pageNumber: number,
    onlyWatched?: true,
    onlyUnwatched?: true,
    searchedMovieTitle?: string
};

export const genres = ["Adventure", "Action", "Animation", "Biography", "Comedy", "Crime", "Documentary", "Drama", "Family",
"Fantasy", "Film-Noir", "History", "Horror", "Music",
"Musical", "Mystery", "Romance", "Sci-Fi", "Sport", "Thriller", "War", "Western"] as const;

export type Genres = typeof genres[number];

export type MovieInitData = {
    pageGenres: Array<GenEntity>;
    selectedGenreId: number;
    movies: Array<MovieToRate>;
    pageNumber: number;
};

export interface MovieToRate {
    id: string;
    movieId: number;
    genreIds?: (number)[] | null;
    posterPath: string;
    releaseDate: string;
    title: string;
    overview: string;
    voteAverage: number;
}

export interface GenEntity {
    id: number;
    name: Genres;
}

export type RateResultDto = {
    moviesCountLeftOnPage: number | null;
    isRateSaved: boolean;
    reason?: string
};

export type FindMatchResult = {
    matchedRateValue: MovieRate,
    matchedRates: Array<MatchedMovie>;
    isLastPage: boolean;
  };
  
export type MatchedMovie = {
    id: string;
    movie: MovieToRate;
    user: Record<'id' | 'email', string>;
    isWatched: boolean;
};
  