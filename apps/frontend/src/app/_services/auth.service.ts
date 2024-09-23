import { Injectable, PLATFORM_ID, inject } from '@angular/core';
import { AuthSource, IdentityClaim } from '../typings/common';
import { Observable, Subject, filter, from, of, take } from 'rxjs';
import { Router } from '@angular/router';
import { AlertInteractionService } from './alert-interaction.service';
import { DOCUMENT } from '@angular/common';

type UserJwtPayload = {
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
  #document = inject(DOCUMENT);
  #authButtonClicked$: Subject<AuthSource> = new Subject<AuthSource>();

  emitAuthButtonClicked(authSource: AuthSource): void {
    this.#authButtonClicked$.next(authSource);
  }

  observeAuthButtonClicked(): Observable<AuthSource> {
    return this.#authButtonClicked$.asObservable();
  }

  logout(): void {
    this.#document.cookie = '';
    this.#router.navigate(['']);
    this.#alertService.success('You have been logged out successfully');
  }

  hasUserHaveValidToken(): boolean {
    if (!this.#document.cookie) {
      return false;
    }

    const timeFromNow = new Date().getTime();
    return (
      timeFromNow < new Date(timeFromNow + this.getUserPayload()!.iat).getTime()
    );
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
    if (this.#document.cookie) {
      return JSON.parse(window.atob(this.#document.cookie.split('.')[1]));
    } else return null;
  }

  getUserId(): string | undefined {
    return this.getUserPayload()?.sub?.toString();
  }
}
