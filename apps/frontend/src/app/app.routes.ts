import {
  ActivatedRouteSnapshot,
  Route,
  RouterStateSnapshot,
} from '@angular/router';
import { movieInitDataResolver } from './_resolvers/movie-init-data.resolver';
import { authGuard } from './_guards/auth.guard';
import { preferencesResolver } from './_resolvers/preferences.resolver';
import { findResolver } from './_resolvers/find.resolver';

type ImportedMatchFile = typeof import('./match/match.component');
type ImportedAuthFile = typeof import('./auth/auth.component');
type ImportedPreferencesFile =
  typeof import('./preferences/preferences.component');
type ImportedFindFile = typeof import('./find/find.component');

export const appRoutes: Route[] = [
  {
    path: '',
    loadComponent: () =>
      import('./auth/auth.component').then(
        (importedFile: ImportedAuthFile) => importedFile.AuthComponent
      ),
    canActivate: [
      function isNotAuthorized(
        _route: ActivatedRouteSnapshot,
        _state: RouterStateSnapshot
      ) {
        return !authGuard(_route, _state);
      },
    ],
  },
  {
    path: 'match',
    loadComponent: () =>
      import('./match/match.component').then(
        (importedFile: ImportedMatchFile) => importedFile.MatchComponent
      ),
    resolve: {
      movieInitData: movieInitDataResolver,
    },
    canActivate: [authGuard],
  },
  {
    path: 'preferences',
    loadComponent: () =>
      import('./preferences/preferences.component').then(
        (importedFile: ImportedPreferencesFile) =>
          importedFile.PreferencesComponent
      ),
    canActivate: [authGuard],
    resolve: {
      preferencesData: preferencesResolver,
    },
  },
  {
    path: 'find',
    loadComponent: () =>
      import('./find/find.component').then(
        (importedFile: ImportedFindFile) => importedFile.FindComponent
      ),
    canActivate: [authGuard],
    resolve: {
      findData: findResolver,
    },
  },
];
