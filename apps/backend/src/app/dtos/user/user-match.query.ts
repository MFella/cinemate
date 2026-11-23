import {
  ArrayMinSize,
  IsArray,
  IsBoolean,
  IsIn,
  IsOptional,
  IsString,
  MaxLength,
  Validate,
  ValidatorConstraintInterface,
} from 'class-validator';
import { Transform } from 'class-transformer';
import { MatchMode } from '../../typings/common';

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

// A query string with one `mailOfUsers` arrives as a string, with several as an array.
export const toArray = ({ value }: { value: unknown }) =>
  value === undefined || Array.isArray(value) ? value : [value];

export class UserMatchQuery {
  @Transform(toArray)
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

  @IsOptional()
  @IsIn(['all', 'any'])
  matchMode?: MatchMode;
}
