export type AppTheme = 'dark' | 'default';
export type AppLang = 'pl-PL' | 'en-US';

export type MarkAction = 'YES' | 'NO' | 'IDK';

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

export type SelectOption<T> = {
    value: number;
    label: T;
    disabled: boolean;
}

export const genres = ["Adventure", "Action", "Animation", "Biography", "Comedy", "Crime", "Documentary", "Drama", "Family",
"Fantasy", "Film-Noir", "History", "Horror", "Music",
"Musical", "Mystery", "Romance", "Sci-Fi", "Sport", "Thriller", "War", "Western"] as const;

export type Genres = typeof genres[number];

export type MovieInitData = {
    genre: Genres;
    movies: Array<MovieToRate>;
};

export interface MovieToRate {
    imdb_id: string;
    gen?: (GenEntity)[] | null;
    image_url: string;
    year: number;
    title: string;
    description: string;
    rating: number;
    pageNumber: number;
}

export interface GenEntity {
    id: number;
    genre: Genres;
}

export type RateResultDto = {
    moviesCountLeftOnPage: number | null;
    isRateSaved: boolean;
    reason?: string
};
  