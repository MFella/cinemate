import { Route } from '@angular/router';
import { movieInitDataResolver } from './_resolvers/movie-init-data.resolver';
import { authGuard } from './_guards/auth.guard';
import { inject } from '@angular/core';
import { AuthService } from './_services/auth.service';
import { preferencesResolver } from './_resolvers/preferences.resolver';
import { findResolver } from './_resolvers/find.resolver';

const componentNames = ['match', 'home', 'preferences'] as const;
const importedComponentFiles = componentNames.map(
  componentName => `./${componentName}/${componentName}.component` as const
);

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
