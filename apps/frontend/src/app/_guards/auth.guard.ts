import { inject } from '@angular/core';
import { CanActivateFn } from '@angular/router';
import { AuthService } from '../_services/auth.service';

export const authGuard: CanActivateFn = (_route, _state) => {
  return inject(AuthService).hasUserHaveValidToken();
};
