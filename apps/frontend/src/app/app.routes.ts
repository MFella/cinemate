import { Route } from '@angular/router';
import { movieInitDataResolver } from './_resolvers/movie-init-data.resolver';
import { authGuard } from './_guards/auth.guard';
import { inject } from '@angular/core';
import { AuthService } from './_services/auth.service';
import { preferencesResolver } from './_resolvers/preferences.resolver';

type ImportedMatchFile = typeof import('./match/match.component');
type ImportedHomeFile = typeof import('./home/home.component');
type ImportedPreferencesFile = typeof import('./preferences/preferences.component');

export const appRoutes: Route[] = [
    {
        path: '',
        loadComponent: () => import('./home/home.component').then((importedFile: ImportedHomeFile) => importedFile.HomeComponent),
        canMatch: [ () => !inject(AuthService).hasUserHaveValidToken()]
    },
    {
        path: 'match',
        loadComponent: () => import('./match/match.component').then((importedFile: ImportedMatchFile) => importedFile.MatchComponent),
        resolve: {
            movieInitData: movieInitDataResolver
        },
        canActivate: [authGuard]
    },
    {
        path: 'preferences',
        loadComponent: () => import('./preferences/preferences.component').then((importedFile: ImportedPreferencesFile) => importedFile.PreferencesComponent),
        canActivate: [authGuard],
        resolve: {
            preferencesData: preferencesResolver
        }
    }
];
