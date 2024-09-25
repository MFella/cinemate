import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AuthService } from '../_services/auth.service';
import { LocalStorageService } from '../_services/local-storage.service';

export const authGuard: CanActivateFn = (_route, state) => {
  const router = inject(Router);
  const hasUserValidToken = inject(AuthService).hasUserValidToken(
    inject(LocalStorageService).getCookie('access_token')
  );
  if (hasUserValidToken && state.url === '/') {
    router.navigate(['/match']);
    return false;
  } else if (!hasUserValidToken && state.url !== '/') {
    router.navigate(['/']);
    return false;
  }
  return hasUserValidToken;
};
