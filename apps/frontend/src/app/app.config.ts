import { ApplicationConfig, importProvidersFrom } from '@angular/core';
import { provideRouter, Route, withViewTransitions } from '@angular/router';
import { appRoutes } from './app.routes';
import { provideClientHydration } from '@angular/platform-browser';
import { provideAnimationsAsync } from '@angular/platform-browser/animations/async';
import {
  provideHttpClient,
  withFetch,
  withInterceptors,
} from '@angular/common/http';
import { NgToastModule } from 'ng-angular-popup';
import { errorHandlerInterceptor } from './_interceptors/error-handler.interceptor';

export const appConfig: ApplicationConfig = {
  providers: [
    provideHttpClient(withInterceptors([errorHandlerInterceptor]), withFetch()),
    provideClientHydration(),
    provideRouter(appRoutes as unknown as Route[], withViewTransitions()),
    provideAnimationsAsync(),
    importProvidersFrom(NgToastModule),
  ],
};
const appPaths: Array<string> = appRoutes.map(route => route.path ?? '');
export type AppUrls = typeof appRoutes;
