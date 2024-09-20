import { Injectable, PLATFORM_ID, inject } from '@angular/core';
import { EventType, OAuthEvent, OAuthService } from 'angular-oauth2-oidc';
import { AuthSource, IdentityClaim } from '../typings/common';
import { getAuthConfig } from '../auth/oauth.config';
import { isPlatformBrowser } from '@angular/common';
import { Observable, Subject, filter, from, of, take } from 'rxjs';
import { Router } from '@angular/router';
import { AlertInteractionService } from './alert-interaction.service';

@Injectable({
  providedIn: 'root',
})
export class AuthService {
  #oauthService = inject(OAuthService);
  #platformId = inject(PLATFORM_ID);
  #router = inject(Router);
  #alertService = inject(AlertInteractionService);
  #authButtonClicked$: Subject<AuthSource> = new Subject<AuthSource>();

  constructor() {
    const authConfig = getAuthConfig(
      'google',
      isPlatformBrowser(this.#platformId)
    );
    if (authConfig) {
      this.#oauthService.configure(authConfig);
      this.#oauthService.setupAutomaticSilentRefresh();
      this.#oauthService.loadDiscoveryDocumentAndTryLogin();
    }
  }

  emitAuthButtonClicked(authSource: AuthSource): void {
    this.#authButtonClicked$.next(authSource);
  }

  observeAuthButtonClicked(): Observable<AuthSource> {
    return this.#authButtonClicked$.asObservable();
  }

  logout(): void {
    from(
      Promise.all([
        this.#oauthService.revokeTokenAndLogout(false, true),
        of(this.#oauthService.logOut()),
      ])
    )
      .pipe(take(1))
      .subscribe(() => {
        this.#router.navigate(['']);
        this.#alertService.success('You have been logged out successfully');
      });
  }

  hasUserHaveValidToken(): boolean {
    return this.#oauthService.hasValidAccessToken();
  }

  getUserIdentityClaim(): IdentityClaim {
    return this.#oauthService.getIdentityClaims() as IdentityClaim;
  }

  getUserId(): string {
    return this.getUserIdentityClaim().sub;
  }

  getIdentityClaimValues<T extends keyof IdentityClaim>(
    ...identityClaimKeys: Array<T>
  ): Array<keyof T> {
    const identityClaim = this.getUserIdentityClaim();
    return Object.create(identityClaimKeys.map(key => identityClaim[key]));
  }

  getAccessToken(): string {
    return this.#oauthService.getAccessToken();
  }

  selectOauthEvent(eventToSelect: EventType): Observable<OAuthEvent> {
    return this.#oauthService.events.pipe(
      filter((event: OAuthEvent) => event.type === eventToSelect)
    );
  }
}
