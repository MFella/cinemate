import { inject } from '@angular/core';
import { ResolveFn } from '@angular/router';
import { RestDataService } from '../_services/rest-data.service';
import { GenEntity } from '../typings/common';
import { forkJoin } from 'rxjs';

export const findResolver: ResolveFn<[GenEntity, Array<GenEntity>, Array<string>]> = () => {
  const restDataService = inject(RestDataService);
  return forkJoin(
    [
      restDataService.fetchUserGenrePreference(),
      restDataService.fetchAllGenres(),
      restDataService.fetchUsersEmails()
    ]
  );
};
