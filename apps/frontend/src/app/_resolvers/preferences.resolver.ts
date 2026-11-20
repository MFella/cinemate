import { inject } from '@angular/core';
import { ResolveFn } from '@angular/router';
import { catchError, forkJoin, throwError } from 'rxjs';
import { RestDataService } from '../_services/rest-data.service';
import { GenEntity, UserPreferences } from '../typings/common';
import { HttpErrorResponse } from '@angular/common/http';

export const preferencesResolver: ResolveFn<
  [UserPreferences, Array<GenEntity>]
> = () => {
  const restDataService = inject(RestDataService);
  return forkJoin([
    restDataService.fetchUserGenrePreference(),
    restDataService.fetchAllGenres(),
  ]).pipe(
    catchError((error: HttpErrorResponse) =>
      throwError(() => new Error(JSON.stringify(error)))
    )
  );
};
