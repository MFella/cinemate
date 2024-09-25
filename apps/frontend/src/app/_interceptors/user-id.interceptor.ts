import { HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { LocalStorageService } from '../_services/local-storage.service';

const excludedUrlsFromUserIdInterception = [
  'https://accounts.google.com/.well-known/openid-configuration',
  'https://www.googleapis.com/oauth2/v3/certs',
];

export const userIdInterceptor: HttpInterceptorFn = (req, next) => {
  const lsService = inject(LocalStorageService);
  if (excludedUrlsFromUserIdInterception.includes(req.url)) {
    return next(req);
  }

  const clonedRequest = req.clone({
    setHeaders: {
      ['authorization']: `Bearer ${lsService.getCookie('access_token', true)}`,
    },
  });
  return next(clonedRequest);
};
