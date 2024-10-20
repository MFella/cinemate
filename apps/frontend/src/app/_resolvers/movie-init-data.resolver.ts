import { inject } from '@angular/core';
import { ResolveFn } from '@angular/router';
import { RestDataService } from '../_services/rest-data.service';
import { MovieInitData } from '../typings/common';
import { catchError, throwError, timeout } from 'rxjs';
import { AlertInteractionService } from '../_services/alert-interaction.service';

export const movieInitDataResolver: ResolveFn<MovieInitData> = () => {
  const requestCancelTimeoutMs = 6000;
  const alertInteractionService = inject(AlertInteractionService);
  alertInteractionService.isLoadingSpinnerActive$.next(true);

  return inject(RestDataService)
    .fetchMoviesData()
    .pipe(
      timeout(requestCancelTimeoutMs),
      catchError(() => {
        alertInteractionService.isLoadingSpinnerActive$.next(false);
        return throwError(
          () => new Error('Error occured during fetch movies data')
        );
      })
    );
};
