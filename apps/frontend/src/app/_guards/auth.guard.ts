import { inject, NgZone, PLATFORM_ID } from '@angular/core';
import { isPlatformServer } from '@angular/common';
import { CanActivateFn, Router } from '@angular/router';
import { AuthService } from '../_services/auth.service';
import { firstValueFrom, skip } from 'rxjs';
import { RestDataService } from '../_services/rest-data.service';

export const authGuard: CanActivateFn = async (_route, state) => {
  // On the server there is no localStorage, so the user can't be recognised.
  // Don't redirect (it would drop the requested URL) and don't run the route's
  // resolvers (they call the API); returning false just renders the app shell and
  // the browser decides. The login page ('/') is guarded by the negation of this.
  if (isPlatformServer(inject(PLATFORM_ID))) {
    return false;
  }

  const router = inject(Router);
  const ngZone = inject(NgZone);
  const authService = inject(AuthService);
  const restDataService = inject(RestDataService);
  // there is need to wait for 'fetchUserInfo' to be completed (when sent)
  const isFetchUserInfoPended = await firstValueFrom(
    restDataService.isFetchUserInfoPended$
  );
  if (isFetchUserInfoPended) {
    await firstValueFrom(restDataService.isFetchUserInfoPended$.pipe(skip(1)));
  }

  let hasUserValidToken = authService.hasUserValidToken();

  if (hasUserValidToken && state.url === '/') {
    await ngZone.run(() => router.navigate(['/match']));
    return false;
  } else if (!hasUserValidToken && state.url !== '/') {
    await ngZone.run(() => router.navigate(['/']));
    return false;
  }
  return hasUserValidToken;
};
