import { ArrayMinSize, IsArray, IsString, Validate, ValidatorConstraintInterface } from "class-validator";

class IsStringifiedNumber implements ValidatorConstraintInterface {
    validate(value: any): Promise<boolean> | boolean {
        return !isNaN(parseInt(value)) && typeof parseInt(value) === 'number';
    }
}

export class UserMatchQuery {
    @IsArray()
    @IsString({ each: true })
    @ArrayMinSize(1)
    mailOfUsers: Array<string>;

    @Validate(IsStringifiedNumber, {
        message: 'Invalid id of genre'
    })
    genreId: string;
}