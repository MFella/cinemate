import { Injectable, PLATFORM_ID, inject } from '@angular/core';
import { AuthSource } from '../typings/common';
import { Observable, Subject, map } from 'rxjs';
import { Router } from '@angular/router';
import { AlertInteractionService } from './alert-interaction.service';
import { isPlatformBrowser } from '@angular/common';
import { LocalStorageService } from './local-storage.service';

export type UserJwtPayload = {
  sub: number;
  iat: number;
  email: string;
  picture: string;
};

@Injectable({
  providedIn: 'root',
})
export class AuthService {
  #router = inject(Router);
  #alertService = inject(AlertInteractionService);
  #lsService = inject(LocalStorageService);
  #isPlatformBrowser = isPlatformBrowser(inject(PLATFORM_ID));
  #authButtonClicked$: Subject<AuthSource> = new Subject<AuthSource>();

  emitAuthButtonClicked(authSource: AuthSource): void {
    this.#authButtonClicked$.next(authSource);
  }

  observeAuthButtonClicked(): Observable<AuthSource> {
    return this.#authButtonClicked$.asObservable();
  }

  logout(reason?: string): void {
    this.#lsService.deleteCookie('access_token');
    this.#router.navigate(['']);
    this.#alertService.success(
      'You have been logged out successfully' + (reason ?? '')
    );
  }

  hasUserValidToken(userJwtPayload: UserJwtPayload | null): boolean {
    if (!this.#isPlatformBrowser || !userJwtPayload) {
      return false;
    }

    const timeFromNow = new Date().getTime();
    return timeFromNow < new Date(timeFromNow + userJwtPayload.iat).getTime();
  }

  observeHasUserValidToken(): Observable<boolean> {
    return this.#lsService
      .observeAccessTokenChange()
      .pipe(map(this.hasUserValidToken.bind(this)));
  }

  getUserPayloadValues<T extends keyof UserJwtPayload>(
    ...userPayloadKeys: Array<T>
  ): Array<keyof T> {
    const userPayload = this.getUserPayload();
    return userPayload
      ? Object.create(userPayloadKeys.map(key => userPayload[key]))
      : [];
  }

  getUserPayload(): UserJwtPayload | null {
    return this.#lsService.getCookie('access_token');
  }

  getUserId(): string | undefined {
    return this.getUserPayload()?.sub?.toString();
  }
}
