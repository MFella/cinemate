import {
  inject,
  Injectable,
  NgZone,
  OnDestroy,
  PLATFORM_ID,
} from '@angular/core';
import { AppLang, AppTheme, UserInfo } from '../typings/common';
import { SsrCookieService } from 'ngx-cookie-service-ssr';
import {
  BehaviorSubject,
  distinctUntilChanged,
  interval,
  Observable,
  Subscription,
} from 'rxjs';
import { isPlatformBrowser } from '@angular/common';

type LocalStorageMappings = {
  theme: AppTheme;
  lang: AppLang;
  user_info: UserInfo;
};

type AllowedCookieKeys = 'access_token';

@Injectable({
  providedIn: 'root',
})
export class LocalStorageService implements OnDestroy {
  private static readonly ACCESS_TOKEN_CHECK_INTERVAL_MS = 5000;
  #cookieService = inject(SsrCookieService);
  private userInfoChanged$: BehaviorSubject<UserInfo | null> =
    new BehaviorSubject<UserInfo | null>(null);
  userInfoCheckIntervalSub!: Subscription;
  platformId = inject(PLATFORM_ID);

  constructor() {
    if (isPlatformBrowser(this.platformId)) {
      this.setUserInfoCheckInterval();
    }
  }

  setItem<T extends keyof LocalStorageMappings>(
    key: T,
    value: LocalStorageMappings[T]
  ): void {
    if (typeof value !== 'string') {
      localStorage.setItem(key, JSON.stringify(value));

      if (key === 'user_info') {
        this.userInfoChanged$.next(value as unknown as UserInfo);
      }

      return;
    }

    localStorage.setItem(key, value);
  }

  getItem<T extends keyof LocalStorageMappings>(
    key: T
  ): LocalStorageMappings[T] | null {
    if (!isPlatformBrowser(this.platformId)) {
      return null;
    }
    const itemFromLS = localStorage.getItem(key);

    if (!itemFromLS) {
      return null;
    }

    try {
      return JSON.parse(itemFromLS);
    } catch (err) {
      return itemFromLS as LocalStorageMappings[T];
    }
  }

  deleteItem<T extends keyof LocalStorageMappings>(...keys: Array<T>): void {
    if (!isPlatformBrowser(this.platformId)) {
      return;
    }
    keys.forEach(key => localStorage.removeItem(key));

    if (keys.includes('user_info' as any)) {
      this.userInfoChanged$.next(null);
    }
  }

  setCookie(key: AllowedCookieKeys, value: string): void {
    this.#cookieService.set(key, value);
  }

  observeAccessTokenChange(): Observable<UserInfo | null> {
    return this.userInfoChanged$.asObservable().pipe(
      distinctUntilChanged((previousValue, currentValue) => {
        if (previousValue?.email === currentValue?.email) {
          return true;
        }

        return JSON.stringify(previousValue) === JSON.stringify(currentValue);
      })
    );
  }

  ngOnDestroy(): void {
    this.userInfoCheckIntervalSub?.unsubscribe();
  }

  private setUserInfoCheckInterval(): void {
    if (this.userInfoCheckIntervalSub) {
      return;
    }

    inject(NgZone).runOutsideAngular(() => {
      this.userInfoCheckIntervalSub = interval(
        LocalStorageService.ACCESS_TOKEN_CHECK_INTERVAL_MS
      ).subscribe(() => {
        this.userInfoChanged$.next(this.getItem('user_info'));
      });
    });
  }
}
