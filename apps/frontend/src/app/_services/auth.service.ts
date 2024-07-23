import { Injectable, PLATFORM_ID, inject } from '@angular/core';
import { EventType, OAuthEvent, OAuthService } from 'angular-oauth2-oidc';
import { IdentityClaim } from '../typings/common';
import { getAuthConfig } from '../auth/oauth.config';
import { isPlatformBrowser } from '@angular/common';
import { Observable, filter } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class AuthService {
  #oauthService = inject(OAuthService);
  #platformId = inject(PLATFORM_ID);

  constructor() {
    const authConfig = getAuthConfig('google', isPlatformBrowser(this.#platformId));
    if (authConfig) {
      this.#oauthService.configure(authConfig);
      this.#oauthService.loadDiscoveryDocumentAndTryLogin();
      this.#oauthService.setupAutomaticSilentRefresh();
    }
  }

  login(): void {
    this.#oauthService.initImplicitFlow();
  }

  logout(): void {
    this.#oauthService.revokeTokenAndLogout();
    this.#oauthService.logOut();
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

  getAccessToken(): string {
    return this.#oauthService.getAccessToken();
  }

  selectOauthEvent(eventToSelect: EventType): Observable<OAuthEvent> {
    return this.#oauthService.events.pipe(
      filter((event: OAuthEvent) => event.type === eventToSelect)
    )
  }
}
