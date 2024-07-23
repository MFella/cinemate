import { inject } from '@angular/core';
import { ResolveFn } from '@angular/router';
import { RestDataService } from '../_services/rest-data.service';

export const genrePreferenceResolver: ResolveFn<string> = (_route, _state) => {
  return inject(RestDataService).fetchUserGenrePreference();
};
