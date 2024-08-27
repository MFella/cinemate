import { IsArray, IsDefined, IsEnum, IsString, Validate, ValidateNested, ValidationArguments, ValidatorConstraint, ValidatorConstraintInterface } from "class-validator";
import { Rate } from "../rate-of-movie";
import { MovieToRate, RateValue } from "@prisma/client";
import { TypeUtil } from "../../typings/type-util";
import { MatchedRate } from "../../typings/common";

@ValidatorConstraint()
class IsRateValue implements ValidatorConstraintInterface {
    validate(value: any): Promise<boolean> | boolean {
        return value === RateValue.YES || value === RateValue.IDK || value === RateValue.NO;
    }
}

@ValidatorConstraint()
class IsMatchedRate implements ValidatorConstraintInterface {
    validate(matchedRates: Array<any>): Promise<boolean> | boolean {
        return matchedRates.every(matchedRate => TypeUtil.isMatchedRate(matchedRate));
    }
}

export class FindMatchResultDto {
    @Validate(IsRateValue, {
        message: 'Provided match rate value is not in appropriate shape'
    })
    @IsDefined()
    matchedRateValue: Rate;

    @IsArray()
    @Validate(IsMatchedRate, {
        message: 'Provided matched rate is not in appropriate shape'
    })
    matchedRates: Array<MatchedRate>;
}