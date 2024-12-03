import { inject, NgZone } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AuthService } from '../_services/auth.service';
import { firstValueFrom, skip } from 'rxjs';
import { RestDataService } from '../_services/rest-data.service';

export const authGuard: CanActivateFn = async (_route, state) => {
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
