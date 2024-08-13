import { IsArray, IsNumber } from "class-validator";

export class UserMatchQuery {
    @IsArray()
    mailOfUsers: Array<string>;

    @IsNumber()
    genreId: number;
}