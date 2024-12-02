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
      this.#alertService.success(
        'You have been logged out successfully' + (reason ?? '')
      );
      this.#restService.revokeToken();
    }
    await this.#ngZone.run(() => this.#router.navigate(['/']));
  }

  hasUserValidToken(userInfo: UserInfo | null): boolean {
    if (!this.#isPlatformBrowser || !userInfo) {
      return false;
    }

    return true;
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
