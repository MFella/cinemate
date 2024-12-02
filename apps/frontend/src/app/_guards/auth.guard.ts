import { inject, NgZone } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AuthService } from '../_services/auth.service';
import { LocalStorageService } from '../_services/local-storage.service';

export const authGuard: CanActivateFn = async (_route, state) => {
  const router = inject(Router);
  const ngZone = inject(NgZone);
  const hasUserValidToken = inject(AuthService).hasUserValidToken(
    inject(LocalStorageService).getItem('user_info')
  );
  if (hasUserValidToken && state.url === '/') {
    await ngZone.run(() => router.navigate(['/match']));
    return false;
  } else if (!hasUserValidToken && state.url !== '/') {
    await ngZone.run(() => router.navigate(['/']));
    return false;
  }
  return hasUserValidToken;
};
