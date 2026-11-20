import { inject } from '@angular/core';
import { ResolveFn } from '@angular/router';
import { RestDataService } from '../_services/rest-data.service';
import { UserPreferences } from '../typings/common';

export const genrePreferenceResolver: ResolveFn<UserPreferences> = () => {
  return inject(RestDataService).fetchUserGenrePreference();
};
