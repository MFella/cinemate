import { IsString } from "class-validator";

export class UsersFilterQuery {
    @IsString()
    startsWith: string;
}
