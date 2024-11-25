import {
  inject,
  Injectable,
  NgZone,
  OnDestroy,
  OnInit,
  PLATFORM_ID,
} from '@angular/core';
import { AppLang, AppTheme } from '../typings/common';
import { UserJwtPayload } from './auth.service';
import { SsrCookieService } from 'ngx-cookie-service-ssr';
import { BehaviorSubject, distinctUntilChanged, Observable } from 'rxjs';
import { isPlatformBrowser } from '@angular/common';

type LocalStorageKey = 'theme' | 'lang';
type CookieMapping = {
  access_token: UserJwtPayload;
};

type AllowedCookieKeys = 'access_token';

@Injectable({
  providedIn: 'root',
})
export class LocalStorageService implements OnDestroy {
  #cookieService = inject(SsrCookieService);
  accessTokenChange$: BehaviorSubject<UserJwtPayload | null> =
    new BehaviorSubject<UserJwtPayload | null>(null);
  accessTokenCheckInterval!: NodeJS.Timer;
  platformId = inject(PLATFORM_ID);

  constructor() {
    if (isPlatformBrowser(this.platformId)) {
      this.setAccessTokenCheckInterval();
    }
  }

  setItem<T extends LocalStorageKey = 'theme'>(
    key: LocalStorageKey,
    value: T extends 'theme' ? AppTheme : AppLang
  ): void {
    localStorage.setItem(key, value);
  }

  getItem<T extends LocalStorageKey = 'theme'>(
    key: LocalStorageKey
  ): (T extends 'theme' ? AppTheme : AppLang) | null {
    return localStorage.getItem(key) as
      | (T extends 'theme' ? AppTheme : AppLang)
      | null;
  }

  setCookie(key: AllowedCookieKeys, value: string): void {
    this.#cookieService.set(key, value);
  }

  observeAccessTokenChange(): Observable<UserJwtPayload | null> {
    return this.accessTokenChange$.asObservable().pipe(
      distinctUntilChanged((previousValue, currentValue) => {
        if (previousValue?.email === currentValue?.email) {
          return true;
        }

        return JSON.stringify(previousValue) === JSON.stringify(currentValue);
      })
    );
  }

  private setAccessTokenCheckInterval(): void {
    if (this.accessTokenCheckInterval) {
      return;
    }

    // TODO: uncomment those lines, when matMenu will work as intent
    // inject(NgZone).runOutsideAngular(() => {
    this.accessTokenCheckInterval = setInterval(() => {
      this.accessTokenChange$.next(this.getCookie('access_token'));
      // });
    });
  }

  getCookie(
    key: keyof CookieMapping,
    plain?: boolean
  ): CookieMapping[typeof key] | null {
    const cookieValue = this.#cookieService.get(key);

    if (!cookieValue) {
      return null;
    }

    switch (key) {
      case 'access_token':
        return plain
          ? cookieValue
          : JSON.parse(atob(cookieValue.split('.')[1]));
      default:
        return null;
    }
  }

  deleteCookie(key: AllowedCookieKeys): void {
    if (this.#cookieService.check(key)) {
      this.#cookieService.delete(key);
    }
  }

  ngOnDestroy(): void {
    clearInterval(this.accessTokenCheckInterval);
  }
}
