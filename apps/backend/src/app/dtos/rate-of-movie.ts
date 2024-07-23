export type RateOfMovie = {
    imdbId: string;
    rate: Rate;
    pageNumber: number;
};

export enum Rate {
    YES = 'YES',
    IDK = 'IDK',
    NO = 'NO'
}