import { Injectable, NgZone, PLATFORM_ID, inject } from '@angular/core';
import { AuthSource, UserInfo } from '../typings/common';
import { Observable, Subject, firstValueFrom, map } from 'rxjs';
import { Router } from '@angular/router';
import { AlertInteractionService } from './alert-interaction.service';
import { isPlatformBrowser } from '@angular/common';
import { LocalStorageService } from './local-storage.service';
import { RestDataService } from './rest-data.service';

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
  private static readonly NOTICE_KEY = 'logout_notice';

  #router = inject(Router);
  #alertService = inject(AlertInteractionService);
  #lsService = inject(LocalStorageService);
  #isPlatformBrowser = isPlatformBrowser(inject(PLATFORM_ID));
  #authButtonClicked$: Subject<AuthSource> = new Subject<AuthSource>();
  #ngZone = inject(NgZone);
  #restService = inject(RestDataService);

  emitAuthButtonClicked(authSource: AuthSource): void {
    this.#authButtonClicked$.next(authSource);
  }

  observeAuthButtonClicked(): Observable<AuthSource> {
    return this.#authButtonClicked$.asObservable();
  }

  async logout(reason?: string): Promise<void> {
    if (this.#lsService.getItem('user_info')) {
      this.#lsService.deleteItem('user_info');
      const message = 'You have been logged out successfully' + (reason ?? '');
      const { logoutUrl } = await firstValueFrom(
        this.#restService.revokeToken()
      );
      // ends the Cognito session; it sends the user back to the login page
      if (logoutUrl && this.#isPlatformBrowser) {
        // the page reloads right away, so the login page shows the message
        this.#rememberNotice(message);
        window.location.href = logoutUrl;
        return;
      }
      this.#alertService.success(message);
    }
    await this.#ngZone.run(() => this.#router.navigate(['/']));
  }

  /** Shows the message left by a logout that reloaded the page (once). */
  showPendingNotice(): void {
    try {
      const message = sessionStorage.getItem(AuthService.NOTICE_KEY);
      if (message) {
        sessionStorage.removeItem(AuthService.NOTICE_KEY);
        this.#alertService.success(message);
      }
    } catch {
      // storage blocked: no message
    }
  }

  #rememberNotice(message: string): void {
    try {
      sessionStorage.setItem(AuthService.NOTICE_KEY, message);
    } catch {
      // storage blocked: the logout still works, just without the message
    }
  }

  hasUserValidToken(): boolean {
    const userInfo = this.#lsService.getItem('user_info');

    if (!this.#isPlatformBrowser || !userInfo) {
      return false;
    }

    return 'sub' in userInfo && 'email' in userInfo && 'picture' in userInfo;
  }

  observeHasUserValidToken(): Observable<boolean> {
    return this.#lsService
      .observeAccessTokenChange()
      .pipe(map(this.hasUserValidToken.bind(this)));
  }

  getUserPayloadValues<T extends keyof UserInfo>(
    ...userInfoKeys: Array<T>
  ): Array<keyof T> {
    const userInfo = this.getUserInfo();
    return userInfo
      ? Object.create(userInfoKeys.map(key => userInfo[key]))
      : [];
  }

  getUserInfo(): UserInfo | null {
    return this.#lsService.getItem('user_info');
  }

  getUserId(): string | undefined {
    return this.getUserInfo()?.sub?.toString();
  }
}
