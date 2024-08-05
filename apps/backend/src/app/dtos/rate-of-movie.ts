export type RateOfMovie = {
    movieId: number;
    rate: Rate;
    pageNumber: number;
};

export enum Rate {
    YES = 'YES',
    IDK = 'IDK',
    NO = 'NO'
}