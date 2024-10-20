import {
  ArrayMinSize,
  IsArray,
  IsBoolean,
  IsOptional,
  IsString,
  MaxLength,
  Validate,
  ValidatorConstraintInterface,
} from 'class-validator';
import { Transform } from 'class-transformer';

class IsStringifiedNumber implements ValidatorConstraintInterface {
  validate(value: string): Promise<boolean> | boolean {
    return !isNaN(parseInt(value)) && typeof parseInt(value) === 'number';
  }
}

const transformStringToBoolean = ({ value }) => {
  if (value === 'true') return true;
  if (value === 'false') return false;
  return value;
};

export class UserMatchQuery {
  @IsArray()
  @IsString({ each: true })
  @ArrayMinSize(1)
  mailOfUsers: Array<string>;

  @Validate(IsStringifiedNumber, {
    message: 'Invalid id of genre',
  })
  genreId: string;

  @Validate(IsStringifiedNumber, {
    message: 'Invalid id of genre',
  })
  pageNumber: string;

  @Transform(transformStringToBoolean)
  @IsBoolean()
  @IsOptional()
  onlyWatched?: boolean;

  @Transform(transformStringToBoolean)
  @IsBoolean()
  @IsOptional()
  onlyUnwatched?: boolean;

  @IsOptional()
  @IsString()
  @MaxLength(256)
  searchedMovieTitle?: string;
}
