import { inject } from '@angular/core';
import { ResolveFn } from '@angular/router';
import { RestDataService } from '../_services/rest-data.service';
import { GenEntity } from '../typings/common';

export const genrePreferenceResolver: ResolveFn<GenEntity> = () => {
  return inject(RestDataService).fetchUserGenrePreference();
};
