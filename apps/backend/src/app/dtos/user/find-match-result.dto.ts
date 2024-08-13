import { IsArray, IsEnum, IsString, Validate, ValidateNested, ValidationArguments, ValidatorConstraint, ValidatorConstraintInterface } from "class-validator";
import { Rate } from "../rate-of-movie";
import { MovieToRate } from "@prisma/client";
import { Type } from 'class-transformer';
import { TypeUtil } from "../../typings/type-util";

@ValidatorConstraint()
export class IsMovieToRate implements ValidatorConstraintInterface {
    validate(moviesToRate: Array<any>): Promise<boolean> | boolean {
        return Array.isArray(moviesToRate) && moviesToRate.every(movieToRate => TypeUtil.isMovieToRate(movieToRate)) 
    }
}

export class FindMatchResultDto {
    @IsString()
    email: string;

    @IsString()
    id: string;

    @IsEnum(Rate, { each: true })
    searchedRate: Rate

    @IsArray()
    @ValidateNested({ each: true })
    @Validate(IsMovieToRate, {
        message: 'Provided collection is not in appropriate shape'
    })
    movies: Array<MovieToRate>;
}