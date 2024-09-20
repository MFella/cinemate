import { ApplicationConfig, importProvidersFrom } from '@angular/core';
import { provideRouter, withViewTransitions } from '@angular/router';
import { appRoutes } from './app.routes';
import { provideClientHydration } from '@angular/platform-browser';
import { provideAnimationsAsync } from '@angular/platform-browser/animations/async';
import { provideOAuthClient } from 'angular-oauth2-oidc';
import {
  provideHttpClient,
  withFetch,
  withInterceptors,
} from '@angular/common/http';
import { corsInterceptor } from './_interceptors/cors.interceptor';
import { userIdInterceptor } from './_interceptors/user-id.interceptor';
import { NgToastModule } from 'ng-angular-popup';

export const appConfig: ApplicationConfig = {
  providers: [
    provideHttpClient(
      withInterceptors([corsInterceptor, userIdInterceptor]),
      withFetch()
    ),
    provideClientHydration(),
    provideRouter(appRoutes, withViewTransitions()),
    provideAnimationsAsync(),
    provideOAuthClient(),
    importProvidersFrom(NgToastModule),
  ],
};
